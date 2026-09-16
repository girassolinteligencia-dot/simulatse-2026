import { officialCandidates } from './officialCandidatesData.js';

export class CandidateStore {
  constructor() {
    this.candidates = officialCandidates;
    this.isLoaded = true;
    this.defaultUrl = 'data/candidaturas-2026-ms.json';
    this.storageKey = 'simulatse_custom_candidates_base';
  }

  async initialize() {
    // Tenta complementar com o JSON completo
    try {
      const response = await fetch(`${this.defaultUrl}?v=${Date.now()}`);
      if (response.ok) {
        const raw = await response.json();
        if (Array.isArray(raw) && raw.length > 0) {
          this.candidates = this.sanitizeList(raw);
        }
      }
    } catch (err) {
      console.warn('Usando base embutida padrão:', err);
    }
    this.isLoaded = true;
    return this.candidates;
  }

  sanitizeList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(c => {
      let fed = c.federacao;
      if (fed) {
        fed = fed.replace(/FEDERA[^\w\s]*O/gi, 'FEDERAÇÃO')
                 .replace(/FEDERAÇÃO/gi, 'FEDERAÇÃO')
                 .replace(/PSOL\s*REDE/gi, 'PSOL/REDE')
                 .replace(/PSDB\s*CIDADANIA/gi, 'PSDB/CIDADANIA')
                 .replace(/BRASIL DA ESPERAN[^\w\s]*A/gi, 'BRASIL DA ESPERANÇA');
      }
      return {
        ...c,
        federacao: fed
      };
    });
  }

  setCandidates(newCandidates, persistCustom = true) {
    this.candidates = newCandidates;
    this.isLoaded = true;
    if (persistCustom) {
      localStorage.setItem(this.storageKey, JSON.stringify(newCandidates));
    }
  }

  resetToDefault() {
    localStorage.removeItem(this.storageKey);
    return this.initialize();
  }

  // Função auxiliar para remover acentos e caracteres especiais para busca resiliente
  static normalizeText(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  getCandidatesByCargo(cargo) {
    const targetCargo = CandidateStore.normalizeText(cargo);
    return this.candidates.filter(c => {
      const cCargo = CandidateStore.normalizeText(c.cargo);
      return cCargo === targetCargo;
    });
  }

  searchCandidates(query, cargo) {
    if (!query || query.trim() === '') {
      return this.getCandidatesByCargo(cargo);
    }
    const q = CandidateStore.normalizeText(query);
    
    // 1. Busca primeiro no cargo atualmente selecionado
    const listInCurrentCargo = this.getCandidatesByCargo(cargo).filter(c => {
      const nNome = CandidateStore.normalizeText(c.nome);
      const nCompleto = CandidateStore.normalizeText(c.nomeCompleto);
      const nPartido = CandidateStore.normalizeText(c.partido);
      const nFederacao = CandidateStore.normalizeText(c.federacao);
      return nNome.includes(q) || nCompleto.includes(q) || nPartido.includes(q) || nFederacao.includes(q);
    });

    if (listInCurrentCargo.length > 0) {
      return listInCurrentCargo;
    }

    // 2. Se não encontrou no cargo selecionado, busca em toda a base e indica o cargo
    return this.candidates.filter(c => {
      const nNome = CandidateStore.normalizeText(c.nome);
      const nCompleto = CandidateStore.normalizeText(c.nomeCompleto);
      const nPartido = CandidateStore.normalizeText(c.partido);
      const nFederacao = CandidateStore.normalizeText(c.federacao);
      return nNome.includes(q) || nCompleto.includes(q) || nPartido.includes(q) || nFederacao.includes(q);
    });
  }

  findByNameAndCargo(nome, cargo) {
    const targetName = CandidateStore.normalizeText(nome);
    // Tenta primeiro no cargo informado
    let found = this.getCandidatesByCargo(cargo).find(c => {
      const nNome = CandidateStore.normalizeText(c.nome);
      const nCompleto = CandidateStore.normalizeText(c.nomeCompleto);
      return nNome === targetName || nCompleto === targetName;
    });

    // Se não encontrar, busca em qualquer cargo
    if (!found) {
      found = this.candidates.find(c => {
        const nNome = CandidateStore.normalizeText(c.nome);
        const nCompleto = CandidateStore.normalizeText(c.nomeCompleto);
        return nNome === targetName || nCompleto === targetName;
      });
    }
    return found;
  }
}

export const candidateStore = new CandidateStore();
