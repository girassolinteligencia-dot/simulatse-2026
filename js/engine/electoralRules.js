/**
 * electoralRules.js
 * Módulo com as regras oficiais da legislação eleitoral brasileira (Código Eleitoral e Resoluções TSE).
 * 
 * Regras implementadas:
 * 1. Quociente Eleitoral (QE): Votos Válidos / Total de Vagas (fração <= 0.5 despreza; > 0.5 arredonda p/ cima).
 * 2. Quociente Partidário (QP): Votos do Partido ou Federação / QE (apenas parte inteira).
 * 3. Barreira Individual do QP: Somente candidatos com votação nominal >= 10% do QE podem preencher vagas pelo QP.
 * 4. Sobras - Fase 1 (80/20): Partidos/Federações com total de votos >= 80% do QE e candidatos com >= 20% do QE.
 *    Fórmula de Média: Votos Totais / (Vagas Conquistadas + 1).
 * 5. Sobras - Fase 2 (Sobras Gerais): Conforme entendimento do STF (ADI 7228/7263), vagas não preenchidas
 *    são distribuídas pelas maiores médias entre todos os partidos/federações que possuam candidatos elegíveis (>= 20% do QE).
 * 6. Critérios de Desempate transparentes.
 */

export class ElectoralEngine {
  /**
   * Calcula o Quociente Eleitoral (QE)
   * Regra do Código Eleitoral Art. 106:
   * "Determina-se o quociente eleitoral dividindo-se o número de votos válidos apurados pelo de lugares a preencher..."
   * Fração até 0,5: desprezar; fração superior a 0,5: arredondar para 1 (arredondar para cima).
   * @param {number} validVotes 
   * @param {number} totalSeats 
   * @returns {number}
   */
  static calculateQE(validVotes, totalSeats) {
    if (!validVotes || !totalSeats || totalSeats <= 0) return 0;
    const rawQE = validVotes / totalSeats;
    const integerPart = Math.floor(rawQE);
    const fraction = rawQE - integerPart;
    return fraction > 0.5 ? integerPart + 1 : integerPart;
  }

  /**
   * Calcula o Quociente Partidário (QP)
   * Regra do Código Eleitoral Art. 107:
   * "Determina-se para cada partido o quociente partidário dividindo-se pelo quociente eleitoral o número de votos válidos obtidos..."
   * Desprezada a fração (parte inteira).
   * @param {number} partyVotes 
   * @param {number} qe 
   * @returns {number}
   */
  static calculateQP(partyVotes, qe) {
    if (!partyVotes || !qe || qe <= 0) return 0;
    return Math.floor(partyVotes / qe);
  }

  /**
   * Executa a simulação completa da distribuição proporcional de vagas
   * @param {Object} params
   * @param {number} params.validVotes Total de votos válidos informados
   * @param {number} params.totalSeats 24 (Estadual) ou 8 (Federal)
   * @param {Array} params.groups Lista de partidos/federações com seus candidatos e votos de legenda
   * @returns {Object} Resultado completo com eleitos, vagas por agremiação e auditoria das sobras
   */
  static runSimulation({ validVotes, totalSeats, groups }) {
    const qe = this.calculateQE(validVotes, totalSeats);
    const clause10 = Math.round(qe * 0.10); // 10% do QE
    const clause80Party = qe * 0.80;        // 80% do QE para o partido
    const clause20Cand = Math.round(qe * 0.20); // 20% do QE para o candidato

    // Estrutura de trabalho por Partido/Federação
    const partyStats = groups.map(group => {
      // Ordena candidatos por votação nominal decrescente (desempate por nome se votos iguais)
      const sortedCandidates = [...group.candidates]
        .filter(c => c.situacao !== 'INDEFERIDO' && c.situacao !== 'CANCELADO')
        .sort((a, b) => (b.votes || 0) - (a.votes || 0) || a.nome.localeCompare(b.nome));

      const nominalVotes = sortedCandidates.reduce((sum, c) => sum + (c.votes || 0), 0);
      const partyOnlyVotes = group.partyVotes || 0;
      const totalPartyVotes = nominalVotes + partyOnlyVotes;

      return {
        id: group.id || group.name,
        name: group.name,
        party: group.party,
        isFederation: Boolean(group.federacao),
        federationName: group.federacao || null,
        totalVotes: totalPartyVotes,
        nominalVotes,
        partyVotes: partyOnlyVotes,
        candidates: sortedCandidates,
        allocatedCandidates: [],
        remainingCandidates: [...sortedCandidates],
        qp: 0,
        seatsByQP: 0,
        seatsBySobras8020: 0,
        seatsBySobrasGerais: 0,
        totalSeatsWon: 0,
        voteSharePercent: validVotes > 0 ? ((totalPartyVotes / validVotes) * 100).toFixed(2) : '0.00'
      };
    });

    let seatsDistributed = 0;
    const auditRounds = [];

    // -------------------------------------------------------------
    // FASE 1: DISTRIBUIÇÃO DIRETA PELO QUOCIENTE PARTIDÁRIO (QP)
    // -------------------------------------------------------------
    partyStats.forEach(party => {
      party.qp = this.calculateQP(party.totalVotes, qe);
      let potentialSeats = party.qp;

      // Cada vaga pelo QP exige candidato com votação nominal >= 10% do QE
      while (potentialSeats > 0 && party.remainingCandidates.length > 0) {
        const topCandidate = party.remainingCandidates[0];
        if ((topCandidate.votes || 0) >= clause10) {
          party.remainingCandidates.shift();
          party.allocatedCandidates.push({
            ...topCandidate,
            seatType: 'QP',
            originGroup: party.name
          });
          party.seatsByQP++;
          party.totalSeatsWon++;
          seatsDistributed++;
          potentialSeats--;
        } else {
          // Candidato não atingiu 10% do QE, não pode ocupar a vaga pelo QP
          break;
        }
      }
    });

    // -------------------------------------------------------------
    // FASE 2: DISTRIBUIÇÃO DAS SOBRAS
    // -------------------------------------------------------------
    let roundNumber = 1;

    // Enquanto houver vagas não preenchidas
    while (seatsDistributed < totalSeats) {
      // Tentativa 1: FASE 1 DAS SOBRAS (Regra 80% + 20%)
      // Partidos com >= 80% do QE e candidato com >= 20% do QE
      let eligible8020 = partyStats.filter(party => {
        const meetsParty80 = party.totalVotes >= clause80Party;
        const hasEligibleCand = party.remainingCandidates.some(c => (c.votes || 0) >= clause20Cand);
        return meetsParty80 && hasEligibleCand;
      });

      let selectedParty = null;
      let phase = '';
      let chosenCand = null;

      if (eligible8020.length > 0) {
        phase = 'Sobras 1ª Fase (80/20)';
        
        // Calcula média de todos os habilitados: Votos / (Vagas Já Obtidas + 1)
        eligible8020.forEach(p => {
          p.currentDivisor = p.totalSeatsWon + 1;
          p.currentAverage = p.totalVotes / p.currentDivisor;
        });

        // Ordena por maior média. Desempates legais: maior votação total do partido, depois maior votação nominal do candidato
        eligible8020.sort((a, b) => {
          if (b.currentAverage !== a.currentAverage) {
            return b.currentAverage - a.currentAverage;
          }
          if (b.totalVotes !== a.totalVotes) {
            return b.totalVotes - a.totalVotes;
          }
          const candA = a.remainingCandidates.find(c => (c.votes || 0) >= clause20Cand)?.votes || 0;
          const candB = b.remainingCandidates.find(c => (c.votes || 0) >= clause20Cand)?.votes || 0;
          return candB - candA;
        });

        selectedParty = eligible8020[0];
        // Destina ao candidato não eleito mais votado que cumpra >= 20% do QE
        const candIndex = selectedParty.remainingCandidates.findIndex(c => (c.votes || 0) >= clause20Cand);
        chosenCand = selectedParty.remainingCandidates.splice(candIndex, 1)[0];
        
        selectedParty.seatsBySobras8020++;
      } else {
        // Tentativa 2: FASE FINAL DAS SOBRAS (Segunda fase - sem barreiras de 80% e 20%)
        phase = 'Sobras Fase Final';
        
        // Partidos/Federações aptos a receber candidato ainda não eleito
        let eligibleFinal = partyStats.filter(party => party.remainingCandidates.length > 0);

        if (eligibleFinal.length === 0) {
          // Não há mais candidatos em nenhuma legenda
          break;
        }

        eligibleFinal.forEach(p => {
          p.currentDivisor = p.totalSeatsWon + 1;
          p.currentAverage = p.totalVotes / p.currentDivisor;
        });

        // Ordena por maior média. Desempate: maior votação total, depois maior voto nominal do 1º da fila
        eligibleFinal.sort((a, b) => {
          if (b.currentAverage !== a.currentAverage) {
            return b.currentAverage - a.currentAverage;
          }
          if (b.totalVotes !== a.totalVotes) {
            return b.totalVotes - a.totalVotes;
          }
          const candA = a.remainingCandidates[0]?.votes || 0;
          const candB = b.remainingCandidates[0]?.votes || 0;
          return candB - candA;
        });

        selectedParty = eligibleFinal[0];
        // Destina ao candidato não eleito mais votado do partido vencedor
        chosenCand = selectedParty.remainingCandidates.shift();
        
        selectedParty.seatsBySobrasGerais++;
      }

      if (!selectedParty || !chosenCand) {
        break;
      }

      selectedParty.totalSeatsWon++;
      seatsDistributed++;

      selectedParty.allocatedCandidates.push({
        ...chosenCand,
        seatType: phase,
        originGroup: selectedParty.name
      });

      // Registro obrigatório rodada por rodada da auditoria
      auditRounds.push({
        round: roundNumber++,
        phase,
        partyName: selectedParty.name,
        partyVotes: selectedParty.totalVotes,
        seatsBefore: selectedParty.totalSeatsWon - 1,
        divisor: selectedParty.currentDivisor,
        average: selectedParty.currentAverage.toFixed(4),
        candidateElected: chosenCand.nome,
        candidateVotes: chosenCand.votes || 0
      });
    }

    // Conferência matemática obrigatória: SOMA_DAS_VAGAS_DISTRIBUÍDAS = TOTAL_DE_VAGAS_EM_DISPUTA
    const isSumValid = (seatsDistributed === totalSeats);

    // Coleta de todos os eleitos ordenados por votos
    const allElected = [];
    partyStats.forEach(p => {
      p.allocatedCandidates.forEach(cand => {
        allElected.push({
          ...cand,
          groupName: p.name,
          isFederation: p.isFederation,
          partyVotes: p.totalVotes
        });
      });
    });

    allElected.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    return {
      validVotes,
      totalSeats,
      qe,
      clause10,
      clause80Party,
      clause20Cand,
      seatsDistributed,
      isSumValid,
      partyStats,
      allElected,
      auditRounds
    };
  }
}
