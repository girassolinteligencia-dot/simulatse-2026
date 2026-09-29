/**
 * comparisonDashboard.js
 * Cockpit Analítico e Comparador Avançado de Projeções do SimulaTSE 2026.
 * Implementa:
 * 1. Seleção Multi-Cenário com matriz de comparação direta.
 * 2. Gráfico de Barras Agrupadas/Empilhadas (Cadeiras QP vs Sobras 80/20 vs Sobras STF).
 * 3. Hemiciclo Parlamentar / Arco de Bancadas (ALEMS 24 vagas / Federal 8 vagas).
 * 4. Curva de Sensibilidade e Elasticidade de Vagas (+/- 5%, 10%, 15% em votos).
 * 5. Dispersão e Eficiência Eleitoral (Custo de Votos por Cadeira e Sobras).
 * 6. Termômetro de Margem de Corte dos Suplentes e Barreira Individual de 10%.
 */

import { ElectoralEngine } from '../engine/electoralRules.js';
import { scenarioManager } from './scenarioManager.js';
import { getPartyLogoSvg } from '../partyLogos.js';

// Paleta harmônica para múltiplos cenários comparados
const SCENARIO_COLORS = [
  { primary: '#0284C7', bg: 'rgba(2, 132, 199, 0.15)', border: '#0284C7', label: 'Cenário 1' },
  { primary: '#16A34A', bg: 'rgba(22, 163, 74, 0.15)', border: '#16A34A', label: 'Cenário 2' },
  { primary: '#D97706', bg: 'rgba(217, 119, 6, 0.15)', border: '#D97706', label: 'Cenário 3' },
  { primary: '#9333EA', bg: 'rgba(147, 51, 234, 0.15)', border: '#9333EA', label: 'Cenário 4' }
];

export class ComparisonDashboard {
  constructor() {
    this.selectedScenarioIds = new Set();
    this.cachedSimulations = new Map();
  }

  /**
   * Executa ou recupera a simulação calculada de um cenário
   */
  getSimulationForScenario(scenario) {
    if (this.cachedSimulations.has(scenario.id)) {
      return this.cachedSimulations.get(scenario.id);
    }
    const result = ElectoralEngine.runSimulation({
      validVotes: scenario.validVotes,
      totalSeats: scenario.totalSeats,
      groups: scenario.partyGroups
    });
    this.cachedSimulations.set(scenario.id, result);
    return result;
  }

  clearCache() {
    this.cachedSimulations.clear();
  }

  /**
   * Renderiza a interface completa na aba de cenários
   * @param {HTMLElement} mountEl Elemento contêiner do comparador
   */
  render(mountEl) {
    if (!mountEl) return;
    const scenarios = scenarioManager.getScenarios();

    if (scenarios.length === 0) {
      mountEl.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 24px 16px; margin-top: 14px; background: #F8FAFC; border: 1px dashed var(--border-color);">
          <div style="font-size: 2rem; margin-bottom: 6px;">📊</div>
          <strong style="color: var(--text-main); font-size: 0.95rem; display: block;">Painel Comparativo Desabilitado</strong>
          <span style="font-size: 0.8rem; color: var(--text-muted); display: block; max-width: 380px; margin: 4px auto 0;">
            Salve ao menos 2 cenários acima para desbloquear as análises comparativas com gráficos de barras, hemiciclo parlamentar e curvas de sensibilidade.
          </span>
        </div>
      `;
      return;
    }

    // Se nenhum cenário foi selecionado ainda, seleciona os 2 primeiros por padrão
    if (this.selectedScenarioIds.size === 0) {
      scenarios.slice(0, 2).forEach(s => this.selectedScenarioIds.add(s.id));
    } else {
      // Limpa IDs que foram deletados
      const validIds = new Set(scenarios.map(s => s.id));
      for (const id of this.selectedScenarioIds) {
        if (!validIds.has(id)) this.selectedScenarioIds.delete(id);
      }
      if (this.selectedScenarioIds.size === 0 && scenarios.length > 0) {
        this.selectedScenarioIds.add(scenarios[0].id);
      }
    }

    const selectedScenarios = scenarios.filter(s => this.selectedScenarioIds.has(s.id));

    mountEl.innerHTML = `
      <div class="comparison-cockpit-wrapper" style="margin-top: 18px; display: flex; flex-direction: column; gap: 14px;">
        
        <!-- Header do Cockpit -->
        <div class="glass-card" style="padding: 14px 16px; border-left: 4px solid var(--primary-light); background: linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 800; color: #0C4A6E; margin: 0; display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
                Cockpit Analítico & Comparador de Projeções
              </h3>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin: 3px 0 0 0;">
                Selecione de 2 a 4 cenários para comparar o impacto nas bancadas, quocientes e sensibilidade de votos.
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="badge badge-blue" style="font-weight: 700;">
                ${selectedScenarios.length} de ${scenarios.length} selecionados
              </span>
            </div>
          </div>

          <!-- Pílulas / Checkboxes de Seleção dos Cenários -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(2, 132, 199, 0.15);">
            ${scenarios.map((sc, idx) => {
              const isChecked = this.selectedScenarioIds.has(sc.id);
              const colorInfo = SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
              return `
                <label class="scenario-select-chip ${isChecked ? 'active' : ''}" style="
                  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
                  border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 600; cursor: pointer;
                  background: ${isChecked ? colorInfo.bg : '#F8FAFC'};
                  border: 1.5px solid ${isChecked ? colorInfo.border : 'var(--border-color)'};
                  color: ${isChecked ? colorInfo.primary : 'var(--text-main)'};
                  transition: all 0.2s ease;
                ">
                  <input type="checkbox" class="cmp-scenario-checkbox" data-id="${sc.id}" ${isChecked ? 'checked' : ''} style="accent-color: ${colorInfo.primary};">
                  <span>${sc.title}</span>
                  <span style="font-size: 0.7rem; opacity: 0.8;">(${sc.cargo === 'DEPUTADO ESTADUAL' ? 'Est.' : 'Fed.'})</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        ${selectedScenarios.length === 0 ? `
          <div class="glass-card" style="text-align: center; padding: 20px; color: var(--text-muted);">
            Marque ao menos um cenário acima para exibir os gráficos.
          </div>
        ` : this.renderAnalysisContent(selectedScenarios)}

      </div>
    `;

    this.bindEvents(mountEl);
  }

  /**
   * Constrói todos os blocos de visualização analítica
   */
  renderAnalysisContent(selectedScenarios) {
    const scenarioData = selectedScenarios.map((sc, idx) => {
      const sim = this.getSimulationForScenario(sc);
      return {
        scenario: sc,
        sim,
        color: SCENARIO_COLORS[idx % SCENARIO_COLORS.length]
      };
    });

    return `
      <!-- 1. RESUMO DOS QUOCIENTES COMPARADOS -->
      <div class="glass-card" style="padding: 12px 14px;">
        <div class="card-title-bar" style="margin-bottom: 8px;">
          <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--text-main); margin: 0;">1. Indicadores Chave de Quociente</h4>
          <span style="font-size: 0.7rem; color: var(--text-muted);">Votos Válidos e Cortes de Barreira</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
          ${scenarioData.map(item => `
            <div style="padding: 10px 12px; border-radius: var(--radius-sm); border: 1.5px solid ${item.color.border}; background: #FFFFFF; box-shadow: var(--shadow-sm);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <strong style="color: ${item.color.primary}; font-size: 0.85rem;">${item.scenario.title}</strong>
                <span class="badge" style="background: ${item.color.bg}; color: ${item.color.primary}; font-size: 0.65rem;">
                  ${item.scenario.cargo === 'DEPUTADO ESTADUAL' ? '24 Vagas' : '8 Vagas'}
                </span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.75rem;">
                <div>
                  <span style="color: var(--text-muted); display: block;">Votos Válidos:</span>
                  <strong style="color: var(--text-main);">${(item.scenario.validVotes || 0).toLocaleString('pt-BR')}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block;">Quociente (QE):</span>
                  <strong style="color: var(--text-main);">${(item.sim.qe || 0).toLocaleString('pt-BR')}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block;">Corte QP (10%):</span>
                  <span style="color: var(--text-main); font-weight: 600;">${(item.sim.clause10 || 0).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block;">Corte Sobra (20%):</span>
                  <span style="color: var(--text-main); font-weight: 600;">${(item.sim.clause20Cand || 0).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 2. PAINEL EXECUTIVO: QUEM ENTRA / QUEM SAI (DIFF VISUAL) -->
      ${scenarioData.length >= 2 ? this.renderSeatChangesDiff(scenarioData) : ''}

      <!-- 3. MATRIZ COMPARATIVA DE BANCADAS (TABELA EXECUTIVA) -->
      <div class="glass-card" style="padding: 12px 14px;">
        <div class="card-title-bar" style="margin-bottom: 8px;">
          <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--text-main); margin: 0;">3. Matriz Comparativa de Cadeiras</h4>
          <span style="font-size: 0.7rem; color: var(--text-muted);">Variação direta de vagas por chapa</span>
        </div>
        <div class="table-responsive">
          ${this.renderComparativeTable(scenarioData)}
        </div>
      </div>

      <!-- 3. GRÁFICO DE BARRAS AGRUPADAS / COMPOSIÇÃO DE CADEIRAS -->
      <div class="glass-card" style="padding: 12px 14px;">
        <div class="card-title-bar" style="margin-bottom: 10px;">
          <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--text-main); margin: 0;">3. Comparação Visual de Cadeiras (Barras por Legenda)</h4>
          <div style="display: flex; gap: 10px; font-size: 0.7rem; flex-wrap: wrap;">
            ${scenarioData.map(sd => `
              <span style="display: inline-flex; align-items: center; gap: 4px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: ${sd.color.primary}; display: inline-block;"></span>
                <b>${sd.scenario.title}</b>
              </span>
            `).join('')}
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${this.renderGroupedBarsChart(scenarioData)}
        </div>
      </div>

      <!-- 4. HEMICICLO PARLAMENTAR / ARCO DE BANCADAS -->
      <div class="glass-card" style="padding: 12px 14px;">
        <div class="card-title-bar" style="margin-bottom: 8px;">
          <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--text-main); margin: 0;">4. Hemiciclo Parlamentar (Plenário das Bancadas)</h4>
          <span style="font-size: 0.7rem; color: var(--text-muted);">Simulação da ocupação das cadeiras da Casa</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
          ${scenarioData.map(sd => this.renderParliamentHemicircle(sd)).join('')}
        </div>
      </div>

      <!-- 5. CURVA DE SENSIBILIDADE E ELASTICIDADE DE VAGAS (+/- 10%) -->
      <div class="glass-card" style="padding: 12px 14px;">
        <div class="card-title-bar" style="margin-bottom: 8px;">
          <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--text-main); margin: 0;">5. Análise de Sensibilidade & Elasticidade</h4>
          <span style="font-size: 0.7rem; color: var(--text-muted);">Teste de Estresse de Votos (+/- 5%, 10%, 15%)</span>
        </div>
        <div style="margin-bottom: 8px;">
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-main); display: block; margin-bottom: 4px;">Selecione o Partido / Federação para o Teste de Estresse:</label>
          <select id="select-sensitivity-group" class="form-input" style="font-size: 0.85rem; padding: 6px 10px; max-width: 320px;">
            ${this.getUniquePartyGroups(scenarioData).map(g => `<option value="${g}">${g}</option>`).join('')}
          </select>
        </div>
        <div id="sensitivity-chart-container" style="margin-top: 10px;">
          ${this.renderSensitivityAnalysis(scenarioData, this.getUniquePartyGroups(scenarioData)[0])}
        </div>
      </div>

      <!-- 6. DISPERSÃO & EFICIÊNCIA ELEITORAL (CUSTO EM VOTOS POR CADEIRA) -->
      <div class="glass-card" style="padding: 12px 14px;">
        <div class="card-title-bar" style="margin-bottom: 8px;">
          <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--text-main); margin: 0;">6. Eficiência Eleitoral (Custo de Votos por Vaga)</h4>
          <span style="font-size: 0.7rem; color: var(--text-muted);">Média de votos necessários para eleger 1 deputado</span>
        </div>
        <div class="table-responsive">
          ${this.renderEfficiencyRadar(scenarioData)}
        </div>
      </div>

      <!-- 7. TERMÔMETRO DE MARGEM DE CORTE (1º SUPLENTES E BARREIRA DE 10%) -->
      <div class="glass-card" style="padding: 12px 14px;">
        <div class="card-title-bar" style="margin-bottom: 8px;">
          <h4 style="font-size: 0.92rem; font-weight: 800; color: var(--text-main); margin: 0;">7. Termômetro de Margem de Corte (1º Suplentes)</h4>
          <span style="font-size: 0.7rem; color: var(--text-muted);">Proximidade do corte de 10% do QE e última vaga</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
          ${scenarioData.map(sd => this.renderSuplentesThermometer(sd)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Extrai a lista unificada de todos os partidos/federações presentes nos cenários selecionados
   */
  getUniquePartyGroups(scenarioData) {
    const set = new Set();
    scenarioData.forEach(sd => {
      (sd.scenario.partyGroups || []).forEach(g => set.add(g.name));
    });
    return Array.from(set).sort();
  }

  /**
   * 2. Painel Executivo: Quem Entra / Quem Sai (Diff Direto de Vagas)
   */
  renderSeatChangesDiff(scenarioData) {
    const s1 = scenarioData[0];
    const s2 = scenarioData[1];
    const parties = this.getUniquePartyGroups(scenarioData);

    const gainedSeats = [];
    const lostSeats = [];

    parties.forEach(partyName => {
      const p1 = (s1.sim.partyResults || []).find(p => p.name === partyName);
      const p2 = (s2.sim.partyResults || []).find(p => p.name === partyName);
      const seats1 = p1 ? p1.totalSeats : 0;
      const seats2 = p2 ? p2.totalSeats : 0;
      const delta = seats2 - seats1;

      if (delta > 0) {
        gainedSeats.push({ party: partyName, delta, from: seats1, to: seats2 });
      } else if (delta < 0) {
        lostSeats.push({ party: partyName, delta: Math.abs(delta), from: seats1, to: seats2 });
      }
    });

    return `
      <div class="glass-card" style="padding: 14px 16px; border-left: 4px solid var(--primary); background: #FFFFFF;">
        <div class="card-title-bar" style="margin-bottom: 10px;">
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 6px;">
              <span>⚡</span> Resumo Executivo: Quem Ganha / Quem Perde Vagas
            </h4>
            <span style="font-size: 0.72rem; color: var(--text-muted);">
              Comparação direta: <b>${s1.scenario.title}</b> → <b>${s2.scenario.title}</b>
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
          <!-- Ganham Cadeiras -->
          <div style="background: var(--pastel-green-light); border: 1.5px solid var(--pastel-green-border); border-radius: var(--radius-sm); padding: 10px 14px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 1rem;">📈</span>
              <strong style="font-size: 0.82rem; color: var(--pastel-green-text); text-transform: uppercase;">Aumentam Bancada (+ Vagas)</strong>
            </div>
            ${gainedSeats.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${gainedSeats.map(g => `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; background: #FFFFFF; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--pastel-green-border);">
                    <span style="font-weight: 700; color: var(--text-main);">${g.party}</span>
                    <span class="badge badge-green" style="font-weight: 800; font-size: 0.75rem;">+${g.delta} vaga(s) (${g.from} → ${g.to})</span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <span style="font-size: 0.76rem; color: var(--text-muted); font-style: italic;">Nenhum partido aumentou cadeiras entre estes dois cenários.</span>
            `}
          </div>

          <!-- Perdem Cadeiras -->
          <div style="background: var(--pastel-red-bg); border: 1.5px solid var(--pastel-red-border); border-radius: var(--radius-sm); padding: 10px 14px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 1rem;">📉</span>
              <strong style="font-size: 0.82rem; color: var(--pastel-red-text); text-transform: uppercase;">Reduzem Bancada (- Vagas)</strong>
            </div>
            ${lostSeats.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${lostSeats.map(l => `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; background: #FFFFFF; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--pastel-red-border);">
                    <span style="font-weight: 700; color: var(--text-main);">${l.party}</span>
                    <span class="badge badge-red" style="font-weight: 800; font-size: 0.75rem;">-${l.delta} vaga(s) (${l.from} → ${l.to})</span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <span style="font-size: 0.76rem; color: var(--text-muted); font-style: italic;">Nenhum partido reduziu cadeiras entre estes dois cenários.</span>
            `}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 3. Tabela Comparativa de Cadeiras
   */
  renderComparativeTable(scenarioData) {
    const allParties = this.getUniquePartyGroups(scenarioData);

    return `
      <table class="custom-table" style="font-size: 0.8rem;">
        <thead>
          <tr>
            <th style="min-width: 140px;">Partido / Federação</th>
            ${scenarioData.map(sd => `
              <th style="text-align: center; border-bottom: 2px solid ${sd.color.primary}; color: ${sd.color.primary};">
                ${sd.scenario.title}<br>
                <span style="font-size: 0.65rem; font-weight: normal; color: var(--text-muted);">Vagas (QP + Sobras)</span>
              </th>
            `).join('')}
            ${scenarioData.length >= 2 ? `
              <th style="text-align: center; min-width: 90px; color: var(--text-main);">
                Variação<br>
                <span style="font-size: 0.65rem; font-weight: normal; color: var(--text-muted);">(C1 vs C2)</span>
              </th>
            ` : ''}
          </tr>
        </thead>
        <tbody>
          ${allParties.map(partyName => {
            const seatsPerScenario = scenarioData.map(sd => {
              const resParty = (sd.sim.partyResults || []).find(p => p.name === partyName);
              const seats = resParty ? resParty.totalSeats : 0;
              const qp = resParty ? resParty.qpSeats : 0;
              const sobras = resParty ? (resParty.sobraSeats + resParty.sobraGeralSeats) : 0;
              const votes = resParty ? resParty.totalVotes : 0;
              return { seats, qp, sobras, votes };
            });

            // Se nenhum cenário tem votos nem vagas neste partido, omite para manter a visão limpa
            const hasAnyActivity = seatsPerScenario.some(s => s.votes > 0 || s.seats > 0);
            if (!hasAnyActivity) return '';

            let diffCol = '';
            if (scenarioData.length >= 2) {
              const diff = seatsPerScenario[1].seats - seatsPerScenario[0].seats;
              let badgeClass = 'badge-yellow';
              let sign = '';
              if (diff > 0) {
                badgeClass = 'badge-green';
                sign = '+';
              } else if (diff < 0) {
                badgeClass = 'badge-red';
              }
              diffCol = `
                <td style="text-align: center; font-weight: 700;">
                  ${diff === 0 ? '<span style="color: var(--text-muted);">=</span>' : `<span class="badge ${badgeClass}">${sign}${diff}</span>`}
                </td>
              `;
            }

            return `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 22px; height: 22px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                      ${getPartyLogoSvg(partyName)}
                    </div>
                    <strong style="color: var(--text-main); font-size: 0.8rem;">${partyName}</strong>
                  </div>
                </td>
                ${seatsPerScenario.map((s, idx) => `
                  <td style="text-align: center;">
                    <span style="font-size: 0.95rem; font-weight: 800; color: ${s.seats > 0 ? scenarioData[idx].color.primary : 'var(--text-muted)'};">
                      ${s.seats}
                    </span>
                    <div style="font-size: 0.65rem; color: var(--text-muted);">
                      ${s.seats > 0 ? `(${s.qp} QP + ${s.sobras} S)` : '0 vagas'} • ${(s.votes || 0).toLocaleString('pt-BR')} v.
                    </div>
                  </td>
                `).join('')}
                ${diffCol}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * 3. Gráfico de Barras Agrupadas
   */
  renderGroupedBarsChart(scenarioData) {
    const allParties = this.getUniquePartyGroups(scenarioData);
    const activeParties = allParties.filter(partyName => {
      return scenarioData.some(sd => {
        const p = (sd.sim.partyResults || []).find(r => r.name === partyName);
        return p && p.totalSeats > 0;
      });
    });

    if (activeParties.length === 0) {
      return `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 12px;">Nenhuma vaga conquistada nos cenários selecionados.</div>`;
    }

    const maxSeats = Math.max(...scenarioData.flatMap(sd => (sd.sim.partyResults || []).map(r => r.totalSeats)), 1);

    return activeParties.map(partyName => {
      return `
        <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 18px; height: 18px;">${getPartyLogoSvg(partyName)}</div>
              <strong style="font-size: 0.82rem; color: var(--text-main);">${partyName}</strong>
            </div>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${scenarioData.map(sd => {
              const res = (sd.sim.partyResults || []).find(r => r.name === partyName);
              const seats = res ? res.totalSeats : 0;
              const qp = res ? res.qpSeats : 0;
              const sobras = res ? (res.sobraSeats + res.sobraGeralSeats) : 0;
              const pct = (seats / maxSeats) * 100;

              return `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 0.68rem; color: var(--text-muted); width: 85px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${sd.scenario.title}">
                    ${sd.scenario.title}:
                  </span>
                  <div style="flex: 1; height: 14px; background: #F1F5F9; border-radius: 4px; overflow: hidden; display: flex;">
                    <div style="height: 100%; width: ${pct}%; background: ${sd.color.primary}; transition: width 0.4s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px;">
                    </div>
                  </div>
                  <span style="font-size: 0.75rem; font-weight: 800; min-width: 55px; text-align: right; color: ${seats > 0 ? sd.color.primary : 'var(--text-muted)'};">
                    ${seats} ${seats === 1 ? 'vaga' : 'vagas'}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 4. Hemiciclo Parlamentar / Plenário em SVG Dinâmico
   */
  renderParliamentHemicircle(scenarioData) {
    const { scenario, sim, color } = scenarioData;
    const elected = sim.elected || [];
    const totalSeats = scenario.totalSeats || 24;

    // Paleta de partidos para as cadeiras do hemiciclo
    const partyColorPalette = {
      'PL': '#2563EB',
      'PSDB': '#0284C7',
      'MDB': '#16A34A',
      'PT': '#DC2626',
      'PP': '#0D9488',
      'UNIÃO': '#7C3AED',
      'PSD': '#EA580C',
      'REPUBLICANOS': '#475569',
      'DEFAULT': '#64748B'
    };

    const getSeatColor = (partido) => {
      if (!partido) return partyColorPalette.DEFAULT;
      for (const [key, val] of Object.entries(partyColorPalette)) {
        if (partido.toUpperCase().includes(key)) return val;
      }
      return partyColorPalette.DEFAULT;
    };

    // Gera coordenadas em arco semi-circular para as cadeiras
    const seatsSvg = [];
    const radius = 65;
    const startAngle = Math.PI; // 180 graus
    const endAngle = 0;         // 0 graus
    const step = (startAngle - endAngle) / Math.max(totalSeats - 1, 1);

    for (let i = 0; i < totalSeats; i++) {
      const angle = startAngle - (i * step);
      const cx = 100 + radius * Math.cos(angle);
      const cy = 80 - radius * Math.sin(angle);
      const candidate = elected[i];
      const seatColor = candidate ? getSeatColor(candidate.partido) : '#CBD5E1';
      const tooltip = candidate ? `${candidate.nome} (${candidate.partido}) - ${candidate.votes.toLocaleString('pt-BR')} votos` : 'Vaga Desocupada';

      seatsSvg.push(`
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.2" fill="${seatColor}" stroke="#FFFFFF" stroke-width="1">
          <title>${tooltip}</title>
        </circle>
      `);
    }

    // Composição por legenda resumida
    const compositionSummary = (sim.partyResults || [])
      .filter(p => p.totalSeats > 0)
      .map(p => `<span style="font-size: 0.68rem; font-weight: 600; padding: 2px 6px; background: #F1F5F9; border-radius: 4px;">${p.name}: <b>${p.totalSeats}</b></span>`)
      .join(' ');

    return `
      <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; text-align: center;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="color: ${color.primary}; font-size: 0.82rem;">${scenario.title}</strong>
          <span style="font-size: 0.7rem; color: var(--text-muted);">${elected.length}/${totalSeats} ocupadas</span>
        </div>
        
        <svg viewBox="20 10 160 85" style="width: 100%; max-height: 140px; margin: 0 auto; display: block;">
          <!-- Arco guia de fundo -->
          <path d="M 35 80 A 65 65 0 0 1 165 80" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="2 2" />
          ${seatsSvg.join('')}
          <text x="100" y="76" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-main)">${elected.length} ELEITOS</text>
          <text x="100" y="86" text-anchor="middle" font-size="6" fill="var(--text-muted)">${scenario.cargo === 'DEPUTADO ESTADUAL' ? 'ALEMS' : 'Bancada Federal'}</text>
        </svg>

        <div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 6px;">
          ${compositionSummary || '<span style="font-size: 0.7rem; color: var(--text-muted);">Sem eleitos</span>'}
        </div>
      </div>
    `;
  }

  /**
   * 5. Curva de Sensibilidade e Elasticidade de Vagas (+/- 5%, 10%, 15%)
   */
  renderSensitivityAnalysis(scenarioData, targetParty) {
    if (!targetParty) {
      return `<div style="font-size: 0.8rem; color: var(--text-muted);">Nenhum partido selecionado.</div>`;
    }

    const variations = [-15, -10, -5, 0, 5, 10, 15];

    return `
      <div style="overflow-x: auto;">
        <table class="custom-table" style="font-size: 0.78rem;">
          <thead>
            <tr>
              <th>Cenário Avaliado</th>
              ${variations.map(v => `
                <th style="text-align: center; ${v === 0 ? 'background: #EFF6FF; font-weight: 800;' : ''}">
                  ${v > 0 ? `+${v}%` : `${v}%`}<br>
                  <span style="font-size: 0.65rem; font-weight: normal; color: var(--text-muted);">${v === 0 ? 'Base' : 'Variação'}</span>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${scenarioData.map(sd => {
              const baseGroup = (sd.scenario.partyGroups || []).find(g => g.name === targetParty);
              const baseVotes = baseGroup ? (baseGroup.partyVotes + (baseGroup.candidates || []).reduce((acc, c) => acc + (c.votes || 0), 0)) : 0;

              const variationResults = variations.map(pct => {
                // Clona grupos e ajusta proporcionalmente os votos da legenda selecionada
                const clonedGroups = JSON.parse(JSON.stringify(sd.scenario.partyGroups || []));
                const targetG = clonedGroups.find(g => g.name === targetParty);
                if (targetG) {
                  const factor = 1 + (pct / 100);
                  targetG.partyVotes = Math.round((targetG.partyVotes || 0) * factor);
                  (targetG.candidates || []).forEach(c => {
                    c.votes = Math.round((c.votes || 0) * factor);
                  });
                }

                // Ajusta votos válidos totais de acordo
                const diffVotes = Math.round(baseVotes * (pct / 100));
                const newValidVotes = Math.max(1, (sd.scenario.validVotes || 0) + diffVotes);

                const simVar = ElectoralEngine.runSimulation({
                  validVotes: newValidVotes,
                  totalSeats: sd.scenario.totalSeats,
                  groups: clonedGroups
                });

                const partyRes = (simVar.partyResults || []).find(p => p.name === targetParty);
                const seats = partyRes ? partyRes.totalSeats : 0;
                return { pct, seats };
              });

              const baseSeats = variationResults.find(v => v.pct === 0)?.seats || 0;

              return `
                <tr>
                  <td>
                    <strong style="color: ${sd.color.primary};">${sd.scenario.title}</strong>
                    <div style="font-size: 0.68rem; color: var(--text-muted);">${baseVotes.toLocaleString('pt-BR')} votos base</div>
                  </td>
                  ${variationResults.map(vr => {
                    const isBase = vr.pct === 0;
                    const diffFromBase = vr.seats - baseSeats;
                    let seatColor = 'var(--text-main)';
                    if (diffFromBase > 0) seatColor = 'var(--pastel-green-accent)';
                    if (diffFromBase < 0) seatColor = 'var(--pastel-red-text)';

                    return `
                      <td style="text-align: center; ${isBase ? 'background: #EFF6FF;' : ''}">
                        <strong style="font-size: 0.95rem; color: ${seatColor};">${vr.seats}</strong>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">
                          ${isBase ? 'Atual' : (diffFromBase > 0 ? `+${diffFromBase} vaga` : (diffFromBase < 0 ? `${diffFromBase} vaga` : '='))}
                        </div>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px; line-height: 1.4;">
        💡 <b>Interpretação Estratégica:</b> Permite identificar a "Zona de Risco" ou "Zona de Expansão". Se um aumento de apenas <b>+5%</b> eleva as vagas conquistadas, a legenda está na margem direta de sobra. Se uma queda de <b>-5%</b> reduz vagas, a chapa está segurando a cadeira no limite.
      </div>
    `;
  }

  /**
   * 6. Dispersão & Eficiência Eleitoral (Custo de Votos por Vaga)
   */
  renderEfficiencyRadar(scenarioData) {
    const allParties = this.getUniquePartyGroups(scenarioData);

    return `
      <table class="custom-table" style="font-size: 0.78rem;">
        <thead>
          <tr>
            <th>Partido / Federação</th>
            ${scenarioData.map(sd => `
              <th style="text-align: center; color: ${sd.color.primary};">
                ${sd.scenario.title}<br>
                <span style="font-size: 0.65rem; font-weight: normal; color: var(--text-muted);">Custo / Cadeira</span>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${allParties.map(pName => {
            const hasActivity = scenarioData.some(sd => {
              const res = (sd.sim.partyResults || []).find(p => p.name === pName);
              return res && (res.totalVotes > 0 || res.totalSeats > 0);
            });
            if (!hasActivity) return '';

            return `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 18px; height: 18px;">${getPartyLogoSvg(pName)}</div>
                    <strong>${pName}</strong>
                  </div>
                </td>
                ${scenarioData.map(sd => {
                  const res = (sd.sim.partyResults || []).find(p => p.name === pName);
                  if (!res || res.totalVotes === 0) {
                    return `<td style="text-align: center; color: var(--text-muted);">-</td>`;
                  }
                  const costPerSeat = res.totalSeats > 0 ? Math.round(res.totalVotes / res.totalSeats) : null;
                  
                  return `
                    <td style="text-align: center;">
                      ${costPerSeat !== null ? `
                        <strong style="color: var(--text-main); font-size: 0.85rem;">${costPerSeat.toLocaleString('pt-BR')}</strong>
                        <div style="font-size: 0.65rem; color: var(--pastel-green-text); font-weight: 600;">
                          ${res.totalSeats} ${res.totalSeats === 1 ? 'vaga' : 'vagas'}
                        </div>
                      ` : `
                        <span style="color: var(--pastel-red-text); font-size: 0.75rem; font-weight: 600;">Sem vagas</span>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">${res.totalVotes.toLocaleString('pt-BR')} v. desperdiçados</div>
                      `}
                    </td>
                  `;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * 7. Termômetro de Margem de Corte (1º Suplentes e Barreira 10% do QE)
   */
  renderSuplentesThermometer(scenarioData) {
    const { scenario, sim, color } = scenarioData;
    const clause10 = sim.clause10 || 0;
    const partyResults = sim.partyResults || [];

    // Localiza o primeiro suplente de cada partido
    const firstSuplentes = [];
    partyResults.forEach(p => {
      const candidatesSorted = [...(p.candidates || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
      const notElected = candidatesSorted.filter(c => !c.elected);
      if (notElected.length > 0 && (notElected[0].votes || 0) > 0) {
        firstSuplentes.push({
          candidate: notElected[0],
          party: p.name,
          votes: notElected[0].votes || 0,
          passed10: (notElected[0].votes || 0) >= clause10
        });
      }
    });

    firstSuplentes.sort((a, b) => b.votes - a.votes);
    const topSuplentes = firstSuplentes.slice(0, 5);

    return `
      <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: ${color.primary}; font-size: 0.82rem;">${scenario.title}</strong>
          <span class="badge" style="font-size: 0.65rem; background: var(--bg-main);">Corte 10%: ${clause10.toLocaleString('pt-BR')} v.</span>
        </div>

        ${topSuplentes.length === 0 ? `
          <div style="font-size: 0.75rem; color: var(--text-muted); padding: 10px 0;">Nenhum suplente com votos nominais registrado.</div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
            ${topSuplentes.map(sup => {
              const pctOfClause = clause10 > 0 ? Math.min(100, Math.round((sup.votes / clause10) * 100)) : 100;
              const barColor = sup.passed10 ? 'var(--pastel-green-accent)' : 'var(--pastel-yellow-accent)';

              return `
                <div style="font-size: 0.75rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <span style="font-weight: 700; color: var(--text-main);">${sup.candidate.nome} <span style="font-weight: normal; color: var(--text-muted);">(${sup.party})</span></span>
                    <span style="font-weight: 800; color: ${sup.passed10 ? 'var(--pastel-green-text)' : 'var(--pastel-yellow-text)'};">
                      ${sup.votes.toLocaleString('pt-BR')} v.
                    </span>
                  </div>
                  <div style="height: 6px; width: 100%; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${pctOfClause}%; background: ${barColor};"></div>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted); margin-top: 1px;">
                    <span>${pctOfClause}% da barreira nominal</span>
                    <span>${sup.passed10 ? 'Atingiu 10% QE' : `Faltam ${(clause10 - sup.votes).toLocaleString('pt-BR')} v.`}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  /**
   * Conecta os event listeners do painel comparativo
   */
  bindEvents(mountEl) {
    // Checkbox de seleção multi-cenário
    mountEl.querySelectorAll('.cmp-scenario-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          if (this.selectedScenarioIds.size >= 4) {
            e.target.checked = false;
            alert('Você pode comparar no máximo 4 cenários simultaneamente para manter a clareza analítica.');
            return;
          }
          this.selectedScenarioIds.add(id);
        } else {
          this.selectedScenarioIds.delete(id);
        }
        this.render(mountEl);
      });
    });

    // Seletor de partido para o teste de estresse e sensibilidade
    const selectSensitivity = mountEl.querySelector('#select-sensitivity-group');
    if (selectSensitivity) {
      selectSensitivity.addEventListener('change', (e) => {
        const selectedScenarios = scenarioManager.getScenarios().filter(s => this.selectedScenarioIds.has(s.id));
        const scenarioData = selectedScenarios.map((sc, idx) => ({
          scenario: sc,
          sim: this.getSimulationForScenario(sc),
          color: SCENARIO_COLORS[idx % SCENARIO_COLORS.length]
        }));
        const container = mountEl.querySelector('#sensitivity-chart-container');
        if (container) {
          container.innerHTML = this.renderSensitivityAnalysis(scenarioData, e.target.value);
        }
      });
    }
  }
}

export const comparisonDashboard = new ComparisonDashboard();
