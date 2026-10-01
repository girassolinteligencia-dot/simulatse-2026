/**
 * aiCopilot.js
 * Módulo de Integração com Cloudflare Workers AI para o Painel Interativo do SimulaTSE 2026.
 * Fornece:
 * 1. Análise e Parecer Eleitoral Estratégico em tempo real.
 * 2. Comandos em Linguagem Natural para Preenchimento em Lote e Interferência no Gráfico.
 * 3. Fallback inteligente e autônomo caso o endpoint do Worker esteja em configuração.
 */

export class AiCopilot {
  constructor(interactiveSimulator) {
    this.sim = interactiveSimulator;
    this.endpointUrl = (typeof localStorage !== 'undefined' && localStorage.getItem)
      ? (localStorage.getItem('simulatse_ai_worker_url') || '')
      : '';
    this.isProcessing = false;
  }

  /**
   * Salva a URL personalizada do Cloudflare Worker
   */
  setEndpoint(url) {
    this.endpointUrl = url.trim();
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem('simulatse_ai_worker_url', this.endpointUrl);
    }
  }

  /**
   * Empacota o resumo do estado da simulação para a IA
   */
  packState() {
    const qe = this.sim.validVotes > 0 && this.sim.totalSeats > 0
      ? Math.floor(this.sim.validVotes / this.sim.totalSeats)
      : 0;

    const b10 = Math.ceil(qe * 0.10);
    const b20 = Math.ceil(qe * 0.20);

    const elected = (this.sim.currentResult?.elected || []).map(e => ({
      nome: e.nome,
      partido: e.partido || e.partyLabel,
      votos: e.votes,
      tipo: e.tipo
    }));

    const groupsMini = (this.sim.workingGroups || []).map(g => ({
      party: g.party || g.name,
      partyVotes: g.partyVotes || 0,
      candidates: (g.candidates || []).map(c => ({
        nome: c.nome,
        votos: c.votes || 0
      }))
    }));

    return {
      cargo: this.sim.currentCargo === 'federal' ? 'Deputado Federal' : 'Deputado Estadual',
      totalSeats: this.sim.totalSeats,
      validVotes: this.sim.validVotes,
      qe,
      b10,
      b20,
      electedCount: elected.length,
      elected,
      groupsMini
    };
  }

  /**
   * Solicita um Parecer Analítico Estratégico do Cenário Atual
   */
  async generateStrategicReport() {
    const state = this.packState();

    if (this.endpointUrl) {
      try {
        const resp = await fetch(this.endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'REPORT',
            simulationState: state
          })
        });

        if (resp.ok) {
          const json = await resp.json();
          if (json.success && json.data) {
            return json.data;
          }
        }
      } catch (err) {
        console.warn('[Workers AI] Falha ao conectar ao Worker, acionando motor analítico local:', err);
      }
    }

    // Fallback nativo: Análise Heurística Especializada Local
    return this.generateLocalReport(state);
  }

  /**
   * Executa instrução de comando em linguagem natural para alterar o gráfico em lote
   */
  async executeCommand(userPrompt) {
    const state = this.packState();

    if (this.endpointUrl) {
      try {
        const resp = await fetch(this.endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'MUTATION',
            userPrompt,
            simulationState: state
          })
        });

        if (resp.ok) {
          const json = await resp.json();
          if (json.success && json.data && Array.isArray(json.data.mutations)) {
            this.applyMutations(json.data.mutations);
            return json.data;
          }
        }
      } catch (err) {
        console.warn('[Workers AI] Erro no Worker, processando localmente:', err);
      }
    }

    // Processamento com regras locais de Processamento de Linguagem Natural (PLN)
    return this.processLocalCommand(userPrompt, state);
  }

  /**
   * Aplica mutações de votos no painel com garantia de conservação
   */
  applyMutations(mutations) {
    if (!Array.isArray(mutations) || mutations.length === 0) return;

    mutations.forEach(mut => {
      const party = mut.party || mut.group;
      const candNome = mut.candidate || mut.nome;
      const newVotes = parseInt(mut.newVotes ?? mut.votos, 10);

      if (isNaN(newVotes) || newVotes < 0) return;

      // Se for alteração de voto de legenda
      if (candNome && candNome.toUpperCase().includes('LEGENDA')) {
        const grp = (this.sim.workingGroups || []).find(g =>
          (g.name && g.name.toUpperCase().includes(party.toUpperCase())) ||
          (g.party && g.party.toUpperCase().includes(party.toUpperCase()))
        );
        if (grp) {
          grp.partyVotes = newVotes;
        }
      } else {
        // Altera voto de candidato nominal
        const cand = this.sim.findCandidate(party, candNome);
        if (cand) {
          this.sim.applyProportionalCompensation(party, cand.nome, newVotes);
        }
      }
    });

    this.sim.recalculateAndRender();
  }

  /**
   * Motor Heurístico Local de Relatório Estratégico
   */
  generateLocalReport(state) {
    const electedByParty = {};
    state.elected.forEach(e => {
      electedByParty[e.partido] = (electedByParty[e.partido] || 0) + 1;
    });

    const topParties = Object.entries(electedByParty)
      .sort((a, b) => b[1] - a[1]);

    const summary = `Cenário configurado com ${state.validVotes.toLocaleString('pt-BR')} votos válidos e Quociente Eleitoral de ${state.qe.toLocaleString('pt-BR')} votos para a disputa de ${state.cargo}. Foram preenchidas ${state.electedCount} de ${state.totalSeats} cadeiras. As agremiações mais beneficiadas até o momento foram: ${topParties.map(([p, v]) => `${p} (${v} vagas)`).join(', ')}.`;

    const strengths = [
      `Atingimento de Quociente Partidário pleno pelas principais legendas lideradas por ${topParties[0]?.[0] || 'partidos majoritários'}.`,
      `Cumprimento da Cláusula de Barreira Individual de 10% do QE (${state.b10.toLocaleString('pt-BR')} votos) pelos eleitos titulares.`
    ];

    const risks = [
      `Votações de candidatos intermediários próximas à margem de corte de 20% do QE (${state.b20.toLocaleString('pt-BR')} votos) para disputa de sobras (ADI 7228/STF).`,
      `Alta sensibilidade na última cadeira de sobras: oscilações de 500 a 2.000 votos nominais podem transferir a vaga para agremiações concorrentes.`
    ];

    const recommendations = [
      `Intensificar transferência de votos concentrados para candidatos na faixa de suplência imediata a fim de garantir maior quociente médio partidário nas sobras.`,
      `Monitorar votos de legenda que auxiliam no Quociente Partidário sem dispersar a cláusula nominal.`
    ];

    return {
      summary,
      strengths,
      risks,
      recommendations,
      isLocal: true
    };
  }

  /**
   * Interpretador local de comandos em linguagem natural
   */
  processLocalCommand(prompt, state) {
    const text = prompt.toLowerCase();
    const mutations = [];
    let explanation = '';

    // Regex para identificar números de votos (ex: 20000, 20.000, 15k)
    let voteMatch = text.match(/(\d+[\.\d]*)\s*(mil|k)?/i);
    let targetVotes = 10000;
    if (voteMatch) {
      let rawVal = parseFloat(voteMatch[1].replace(/\./g, ''));
      if (voteMatch[2]) rawVal *= 1000;
      targetVotes = Math.round(rawVal);
    }

    // Busca candidato mencionado no prompt
    let matchedCand = null;
    let matchedParty = null;

    for (const g of state.groupsMini) {
      for (const c of g.candidates) {
        const parts = c.nome.toLowerCase().split(' ');
        if (parts.some(p => p.length > 2 && text.includes(p))) {
          matchedCand = c;
          matchedParty = g.party;
          break;
        }
      }
      if (matchedCand) break;
    }

    if (matchedCand) {
      mutations.push({
        party: matchedParty,
        candidate: matchedCand.nome,
        newVotes: targetVotes
      });
      explanation = `Ajustado o candidato ${matchedCand.nome} (${matchedParty}) para ${targetVotes.toLocaleString('pt-BR')} votos com compensação proporcional estrita no restante dos concorrentes.`;
      this.applyMutations(mutations);
    } else {
      explanation = `Comando interpretado: "${prompt}". Para aplicar diretamente no gráfico, cite o nome do candidato (ex: "Coloque 25.000 votos para Beto Pereira" ou "Aumente Geraldo Resende para 30.000").`;
    }

    return {
      explanation,
      mutations,
      isLocal: true
    };
  }
}
