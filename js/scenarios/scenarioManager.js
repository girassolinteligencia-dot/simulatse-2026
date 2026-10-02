import { CryptoStorage } from '../cryptoStorage.js';

export class ScenarioManager {
  constructor() {
    this.storageKey = 'simulatse_2026_scenarios_enc';
    this.legacyKey = 'simulatse_2026_scenarios';
  }

  getScenarios() {
    try {
      // 1. Tenta ler do armazenamento criptografado
      const encData = localStorage.getItem(this.storageKey);
      if (encData) {
        try {
          // Descriptografa com chave segura do ecossistema
          const plain = CryptoStorage.decrypt(encData);
          if (plain instanceof Promise) {
            // Caso seja chamada síncrona com cache em memória
            const cached = this._memoryCache;
            if (cached) return cached;
          }
        } catch {
          // Fallback
        }
      }

      // 2. Tenta chave padrão ou legado com migração automática
      const raw = localStorage.getItem(this.storageKey) || localStorage.getItem(this.legacyKey);
      if (!raw) return [];

      let parsed = [];
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Se estiver em formato cifrado
        return this._memoryCache || [];
      }

      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Erro ao ler cenários:', e);
      return [];
    }
  }

  async loadScenariosAsync() {
    try {
      const encData = localStorage.getItem(this.storageKey);
      if (encData) {
        try {
          const plain = await CryptoStorage.decrypt(encData);
          this._memoryCache = JSON.parse(plain);
          return this._memoryCache;
        } catch (err) {
          console.warn('[SECURITY] Não foi possível decifrar via chave padrão, tentando legado:', err);
        }
      }

      const legacy = localStorage.getItem(this.legacyKey);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        this._memoryCache = parsed;
        // Migra silenciosamente para armazenamento cifrado
        await this.persistEncrypted(parsed);
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }

  async persistEncrypted(scenarios) {
    try {
      const json = JSON.stringify(scenarios);
      const encrypted = await CryptoStorage.encrypt(json);
      localStorage.setItem(this.storageKey, encrypted);
      localStorage.setItem(this.legacyKey, json); // Manter sincronizado
      this._memoryCache = scenarios;
    } catch (e) {
      localStorage.setItem(this.legacyKey, JSON.stringify(scenarios));
    }
  }

  saveScenario(scenario) {
    const scenarios = this.getScenarios();
    const existingIndex = scenarios.findIndex(s => s.id === scenario.id);

    const scenarioToSave = {
      ...scenario,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      scenarios[existingIndex] = scenarioToSave;
    } else {
      scenarioToSave.id = scenario.id || 'scn_' + Date.now();
      scenarioToSave.createdAt = new Date().toISOString();
      scenarios.unshift(scenarioToSave);
    }

    this.persistEncrypted(scenarios);
    return scenarioToSave;
  }

  deleteScenario(id) {
    let scenarios = this.getScenarios();
    scenarios = scenarios.filter(s => s.id !== id);
    this.persistEncrypted(scenarios);
    return scenarios;
  }

  getScenarioById(id) {
    const scenarios = this.getScenarios();
    return scenarios.find(s => s.id === id) || null;
  }

  exportScenariosJSON() {
    const scenarios = this.getScenarios();
    const blob = new Blob([JSON.stringify(scenarios, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cenarios_simulatse_2026_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importScenariosJSON(jsonData) {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      if (!Array.isArray(parsed)) throw new Error('O arquivo deve conter uma lista de cenários.');
      const current = this.getScenarios();
      const merged = [...parsed, ...current.filter(c => !parsed.some(p => p.id === c.id))];
      localStorage.setItem(this.storageKey, JSON.stringify(merged));
      return merged;
    } catch (e) {
      throw new Error('Falha ao importar cenários: ' + e.message);
    }
  }
}

export const scenarioManager = new ScenarioManager();
