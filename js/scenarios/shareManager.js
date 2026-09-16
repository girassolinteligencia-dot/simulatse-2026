/**
 * shareManager.js
 * Módulo de compartilhamento de simulações do SimulaTSE 2026.
 * Suporta:
 * 1. Link codificado com expiração de 24 horas (via URL Hash).
 * 2. Arquivo assinado proprietário (.simtse) com trava de expiração de 24 horas.
 * 3. Envio direto e amigável formatado para WhatsApp Web / Mobile.
 */

const APP_SIGNATURE = 'SIMULATSE_2026_MS';
const SHARE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Horas em Milissegundos

export class ShareManager {
  /**
   * Empacota o estado atual da simulação de forma enxuta
   * @param {Object} state Estado da aplicação
   * @returns {Object} Payload compacto com timestamps e votos lançados
   */
  static packSimulationPayload(state) {
    const now = Date.now();
    const expiresAt = now + SHARE_DURATION_MS;

    // Filtra apenas agremiações e candidatos com votos (> 0) para reduzir o peso do link
    const packedGroups = [];

    (state.partyGroups || []).forEach(group => {
      const pVotes = group.partyVotes || 0;
      const candsWithVotes = (group.candidates || [])
        .filter(c => (c.votes || 0) > 0)
        .map(c => ({
          n: c.numero || c.sq,
          nm: c.nome,
          v: c.votes
        }));

      if (pVotes > 0 || candsWithVotes.length > 0) {
        packedGroups.push({
          g: group.name,
          pv: pVotes,
          c: candsWithVotes
        });
      }
    });

    return {
      sig: APP_SIGNATURE,
      v: 2,
      cargo: state.currentCargo,
      totalSeats: state.totalSeats,
      validVotes: state.validVotes,
      createdAt: now,
      expiresAt: expiresAt,
      groups: packedGroups
    };
  }

  /**
   * Codifica payload JSON em string Base64URL segura
   * @param {Object} payload 
   * @returns {string}
   */
  static encodePayload(payload) {
    const jsonStr = JSON.stringify(payload);
    // Codifica UTF-8 seguro para Base64URL
    const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    });
    const base64 = btoa(utf8Bytes);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Decodifica string Base64URL de volta para o objeto JSON
   * @param {string} encoded 
   * @returns {Object}
   */
  static decodePayload(encoded) {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const jsonStr = decodeURIComponent(Array.prototype.map.call(binary, ch => {
      return '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonStr);
  }

  /**
   * Valida a integridade e a janela de tempo de 24 horas do payload
   * @param {Object} payload 
   * @returns {{ valid: boolean, error?: string, remainingHours?: number }}
   */
  static validatePayload(payload) {
    if (!payload || payload.sig !== APP_SIGNATURE) {
      return { valid: false, error: 'Arquivo ou link inválido: não pertence ao ecossistema SimulaTSE.' };
    }

    const now = Date.now();
    if (payload.expiresAt && now > payload.expiresAt) {
      const expiredSinceHours = Math.round((now - payload.expiresAt) / (1000 * 60 * 60));
      return { 
        valid: false, 
        error: `Este link/arquivo de simulação expirou após 24 horas de validade (expirado há ~${expiredSinceHours || 1}h). Solicite uma nova projeção ao remetente.` 
      };
    }

    const remainingMs = (payload.expiresAt || (payload.createdAt + SHARE_DURATION_MS)) - now;
    const remainingHours = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));

    return { valid: true, remainingHours };
  }

  /**
   * Gera a URL completa para abertura direta via link no navegador
   * @param {Object} state 
   * @returns {string} URL pronta para compartilhamento
   */
  static generateShareableUrl(state) {
    const payload = this.packSimulationPayload(state);
    const encoded = this.encodePayload(payload);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#sim=${encoded}`;
  }

  /**
   * Cria o texto oficial formatado para compartilhamento no WhatsApp
   * @param {Object} state 
   * @param {Object} simulationResult 
   * @returns {string} Mensagem para WhatsApp
   */
  static createWhatsAppShareText(state, simulationResult) {
    const shareUrl = this.generateShareableUrl(state);
    const cargoTitle = state.currentCargo === 'DEPUTADO ESTADUAL' ? 'Deputado Estadual (24 Vagas)' : 'Deputado Federal (8 Vagas)';
    const validVotesFmt = (state.validVotes || 0).toLocaleString('pt-BR');
    const qeFmt = simulationResult ? (simulationResult.qe || 0).toLocaleString('pt-BR') : '-';

    let summaryEleitos = '';
    if (simulationResult && Array.isArray(simulationResult.elected) && simulationResult.elected.length > 0) {
      const top3 = simulationResult.elected.slice(0, 4).map(e => `• ${e.nome} (${e.partido})`).join('\n');
      summaryEleitos = `\n👥 *Destaque dos Eleitos:*\n${top3}\n${simulationResult.elected.length > 4 ? `... e mais ${simulationResult.elected.length - 4} vagas.\n` : ''}`;
    }

    return (
      `🏛️ *SIMULATSE 2026 - RESULTADO OFICIAL PROJETADO*\n\n` +
      `📌 *Cargo:* ${cargoTitle}\n` +
      `🗳️ *Votos Válidos:* ${validVotesFmt}\n` +
      `🎯 *Quociente Eleitoral (QE):* ${qeFmt}\n` +
      summaryEleitos +
      `\n🔗 *Acesse a simulação completa (Válido por 24 horas):*\n` +
      `${shareUrl}\n\n` +
      `🔒 _Obs.: O link abre com exclusividade no SimulaTSE com toda a distribuição e suplentes calculados e expira em 24h._`
    );
  }

  /**
   * Abre o WhatsApp com a mensagem pronta
   * @param {Object} state 
   * @param {Object} simulationResult 
   */
  static shareViaWhatsApp(state, simulationResult) {
    const text = this.createWhatsAppShareText(state, simulationResult);
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(waUrl, '_blank');
  }

  /**
   * Exporta arquivo proprietário .simtse para envio como documento
   * @param {Object} state 
   */
  static exportSimtseFile(state) {
    const payload = this.packSimulationPayload(state);
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cargoSlug = state.currentCargo === 'DEPUTADO ESTADUAL' ? 'estadual' : 'federal';
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `simulacao_ms2026_${cargoSlug}_${dateStr}.simtse`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Aplica os dados de um payload validado no estado da aplicação
   * @param {Object} payload 
   * @param {Object} state 
   */
  static applyPayloadToState(payload, state) {
    state.currentCargo = payload.cargo;
    state.totalSeats = payload.totalSeats;
    state.validVotes = payload.validVotes;

    // Zera votos atuais do cargo para aplicar fielmente a simulação recebida
    state.partyGroups.forEach(g => {
      g.partyVotes = 0;
      g.candidates.forEach(c => { c.votes = 0; });
    });

    // Mapeia os votos compactados recebidos
    (payload.groups || []).forEach(inGroup => {
      const targetGroup = state.partyGroups.find(g => g.name === inGroup.g);
      if (targetGroup) {
        targetGroup.partyVotes = inGroup.pv || 0;
        (inGroup.c || []).forEach(inCand => {
          const cand = targetGroup.candidates.find(c => 
            (inCand.n && (c.numero === inCand.n || c.sq === inCand.n)) ||
            (inCand.nm && c.nome.toUpperCase() === inCand.nm.toUpperCase())
          );
          if (cand) {
            cand.votes = inCand.v || 0;
          }
        });
      }
    });
  }
}
