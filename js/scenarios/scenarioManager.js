import { CryptoStorage } from '../cryptoStorage.js';

export class ScenarioManager {
  constructor() {
    this.storageKey = 'simulatse_2026_scenarios_enc';
    this.legacyKey = 'simulatse_2026_scenarios';
  }

  getScenarios() {
    try {
      // 1. Prioridade absoluta para o cache síncrono em memória
      if (Array.isArray(this._memoryCache)) {
        return this._memoryCache;
      }

      // 2. Tenta ler do armazenamento legado / síncrono
      const rawLegacy = localStorage.getItem(this.legacyKey);
      if (rawLegacy) {
        try {
          const parsed = JSON.parse(rawLegacy);
          if (Array.isArray(parsed)) {
            this._memoryCache = parsed;
            return parsed;
          }
        } catch {
          // Fallback
        }
      }

      // 3. Tenta ler do armazenamento padrão caso esteja em JSON puro
      const rawEnc = localStorage.getItem(this.storageKey);
      if (rawEnc) {
        try {
          const parsed = JSON.parse(rawEnc);
          if (Array.isArray(parsed)) {
            this._memoryCache = parsed;
            return parsed;
          }
        } catch {
          // Se for ciphertext cifrado e ainda não decifrado, retorna o cache existente
          return this._memoryCache || [];
        }
      }

      this._memoryCache = [];
      return [];
    } catch (e) {
      console.error('Erro ao ler cenários:', e);
      return this._memoryCache || [];
    }
  }

  async loadScenariosAsync() {
    try {
      const encData = localStorage.getItem(this.storageKey);
      if (encData) {
        try {
          const plain = await CryptoStorage.decrypt(encData);
          const parsed = JSON.parse(plain);
          if (Array.isArray(parsed)) {
            this._memoryCache = parsed;
            localStorage.setItem(this.legacyKey, JSON.stringify(parsed));
            return this._memoryCache;
          }
        } catch (err) {
          console.warn('[SECURITY] Não foi possível decifrar via chave padrão, tentando legado:', err);
        }
      }

      const legacy = localStorage.getItem(this.legacyKey);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) {
          this._memoryCache = parsed;
          // Migra silenciosamente para armazenamento cifrado em segundo plano
          this.persistEncrypted(parsed);
          return parsed;
        }
      }
      this._memoryCache = [];
      return [];
    } catch {
      this._memoryCache = this._memoryCache || [];
      return this._memoryCache;
    }
  }

  async persistEncrypted(scenarios) {
    try {
      this._memoryCache = scenarios;
      const json = JSON.stringify(scenarios);
      // Salva imediatamente no localStorage síncrono para garantir renderização instantânea
      localStorage.setItem(this.legacyKey, json);

      // Criptografa em AES-GCM em background
      const encrypted = await CryptoStorage.encrypt(json);
      localStorage.setItem(this.storageKey, encrypted);
    } catch (e) {
      console.warn('[SCENARIOS] Salvo em fallback legado devido a:', e);
      localStorage.setItem(this.legacyKey, JSON.stringify(scenarios));
    }
  }

  saveScenario(scenario) {
    const scenarios = [...this.getScenarios()];
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

    // Atualiza imediatamente o cache de memória e o storage legado de forma síncrona
    this._memoryCache = scenarios;
    try {
      localStorage.setItem(this.legacyKey, JSON.stringify(scenarios));
    } catch (e) {
      console.warn('Erro ao salvar no storage síncrono:', e);
    }

    // Persiste a versão criptografada em segundo plano
    this.persistEncrypted(scenarios);
    return scenarioToSave;
  }

  deleteScenario(id) {
    let scenarios = this.getScenarios().filter(s => s.id !== id);
    this._memoryCache = scenarios;
    try {
      localStorage.setItem(this.legacyKey, JSON.stringify(scenarios));
    } catch (e) {
      console.warn('Erro ao atualizar storage no delete:', e);
    }
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
      this._memoryCache = merged;
      localStorage.setItem(this.legacyKey, JSON.stringify(merged));
      this.persistEncrypted(merged);
      return merged;
    } catch (e) {
      throw new Error('Falha ao importar cenários: ' + e.message);
    }
  }
}

export const scenarioManager = new ScenarioManager();
