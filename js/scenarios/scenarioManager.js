/**
 * scenarioManager.js
 * Gerenciador de cenários salvos em localStorage com suporte a exportação/importação
 */

export class ScenarioManager {
  constructor() {
    this.storageKey = 'simulatse_2026_scenarios';
  }

  getScenarios() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Erro ao ler cenários:', e);
      return [];
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

    localStorage.setItem(this.storageKey, JSON.stringify(scenarios));
    return scenarioToSave;
  }

  deleteScenario(id) {
    let scenarios = this.getScenarios();
    scenarios = scenarios.filter(s => s.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(scenarios));
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
