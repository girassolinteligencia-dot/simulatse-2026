/**
 * interactiveSimulator.js
 * Módulo do Painel Interativo Desktop (SimulaTSE 2026)
 * 
 * Permite ajustar votos de candidatos diretamente no gráfico (clique e arraste vertical)
 * com compensação proporcional estrita (mantendo o teto de votos válidos 100% preservado)
 * e recálculo instantâneo de Vagas (QP, Sobras 80/20 e Sobras Gerais), Eleitos e Suplência.
 */

import { ElectoralEngine } from '../engine/electoralRules.js';
import { getPartyLogoSvg } from '../partyLogos.js';
import { AiCopilot } from './aiAssistant.js';

export class InteractiveSimulator {
  constructor() {
    this.container = null;
    this.appStateRef = null;
    this.onApplyCallback = null;
    this.aiCopilot = new AiCopilot(this);

    // Estado interno de trabalho
    this.workingGroups = [];
    this.originalGroupsSnapshot = [];
    this.validVotes = 1400000;
    this.totalSeats = 24;
    this.currentCargo = 'DEPUTADO ESTADUAL';
    this.activeFilter = 'ALL'; // 'ALL' ou id/nome do grupo partidário
    this.currentResult = null;

    // Estado do Arraste e Zoom Interno Dedicado
    this.dragContext = null;
    this.zoomLevel = 1.0; // 1.0 = 100%, vai de 0.8 a 2.5

    // Cores temáticas por Partido em Tons Pastéis Foscos e Sóbrios (Sem Neon)
    this.partyColors = {
      'PSDB': { main: '#3B6A99', light: '#7096BD', border: '#2D5175' },
      'PT': { main: '#A84347', light: '#C77579', border: '#8A3236' },
      'PCdoB': { main: '#9B3D41', light: '#BF6B6E', border: '#7E2B2F' },
      'PV': { main: '#3D7A58', light: '#6BA082', border: '#2D5F43' },
      'PL': { main: '#2B4C6F', light: '#5A7CA1', border: '#1E3752' },
      'MDB': { main: '#3A7456', light: '#689C81', border: '#2B5B42' },
      'PP': { main: '#3E6F8F', light: '#6E9AB8', border: '#2D536D' },
      'UNIAO': { main: '#355C8A', light: '#6488B3', border: '#244366' },
      'REPUBLICANOS': { main: '#346B87', light: '#6495AE', border: '#255067' },
      'PODEMOS': { main: '#6D538A', light: '#9981B3', border: '#533C6B' },
      'PSB': { main: '#A1593D', light: '#C4836A', border: '#804128' },
      'PDT': { main: '#9E4452', light: '#C27581', border: '#7D313E' },
      'PSOL': { main: '#998038', light: '#BEA764', border: '#7A6424' },
      'REDE': { main: '#387870', light: '#649F98', border: '#265953' },
      'AVANTE': { main: '#387B75', light: '#66A29D', border: '#255D58' },
      'SOLIDARIEDADE': { main: '#A3683D', light: '#C49069', border: '#804D28' },
      'PRD': { main: '#5A588A', light: '#8684B3', border: '#42406D' },
      'DEFAULT': { main: '#54657A', light: '#8192A6', border: '#3E4D5E' }
    };
  }

  /**
   * Inicializa o painel acoplado ao estado global
   */
  mount(containerId, appState, onApplyCallback) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.appStateRef = appState;
    this.onApplyCallback = onApplyCallback;

    this.syncFromAppState();
    this.renderShell();
    this.bindEvents();
    this.recalculateAndRender();
  }

  /**
   * Atualiza os dados quando o usuário volta à aba vindo da simulação principal
   */
  refreshFromAppState(appState) {
    if (appState) this.appStateRef = appState;
    this.syncFromAppState();
    this.recalculateAndRender();
  }

  /**
   * Clona o estado dos partidos preenchidos na simulação principal
   */
  syncFromAppState() {
    if (!this.appStateRef) return;
    this.currentCargo = this.appStateRef.currentCargo || 'DEPUTADO ESTADUAL';
    this.totalSeats = this.appStateRef.totalSeats || (this.currentCargo === 'DEPUTADO ESTADUAL' ? 24 : 8);
    this.validVotes = Number(this.appStateRef.validVotes) || 1400000;
    
    // Deep clone seguro para permitir modificações locais livres
    this.workingGroups = JSON.parse(JSON.stringify(this.appStateRef.partyGroups || []));
    this.originalGroupsSnapshot = JSON.parse(JSON.stringify(this.workingGroups));
  }

  /**
   * Obtém a cor temática da agremiação
   */
  getPartyColor(partyOrFed) {
    if (!partyOrFed) return this.partyColors.DEFAULT;
    const upper = partyOrFed.toUpperCase();
    for (const [key, val] of Object.entries(this.partyColors)) {
      if (upper.includes(key)) return val;
    }
    return this.partyColors.DEFAULT;
  }

  /**
   * Renderiza a casca base do painel (header, controles, área do gráfico e grid de cards)
   */
  renderShell() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="interactive-simulator-wrapper">
        
        <!-- BARRA SUPERIOR DE CONTROLE E MÉTRICAS -->
        <header class="inter-top-bar glass-card">
          <div class="inter-header-info">
            <div class="inter-title-row">
              <span class="inter-badge-pulse">⚡ TEMPO REAL DESKTOP</span>
              <h2 class="inter-title">Simulador Interativo com Ajuste no Gráfico</h2>
            </div>
            <p class="inter-subtitle">
              Arraste as barras dos candidatos para cima ou para baixo. A proporcionalidade dos votos prévios é conservada e o limite de votos válidos permanece 100% fixo.
            </p>
          </div>

          <div class="inter-metrics-deck">
            <div class="inter-metric-box">
              <span class="inter-metric-label">Votos Válidos (Teto)</span>
              <span class="inter-metric-val" id="inter-metric-valid-votes">${Number(this.validVotes).toLocaleString('pt-BR')}</span>
              <span class="inter-metric-sub status-fixed">🔒 100% Inviolável</span>
            </div>

            <div class="inter-metric-box">
              <span class="inter-metric-label">Quociente Eleitoral (QE)</span>
              <span class="inter-metric-val" id="inter-metric-qe">0</span>
              <span class="inter-metric-sub" id="inter-metric-qe-sub">${this.totalSeats} Vagas</span>
            </div>

            <div class="inter-metric-box">
              <span class="inter-metric-label">Cláusula 10% (QP)</span>
              <span class="inter-metric-val" id="inter-metric-barreira-10">0</span>
              <span class="inter-metric-sub">Mínimo individual QP</span>
            </div>

            <div class="inter-metric-box">
              <span class="inter-metric-label">Cláusula 20% (Sobras)</span>
              <span class="inter-metric-val" id="inter-metric-barreira-20">0</span>
              <span class="inter-metric-sub">Mínimo p/ sobras</span>
            </div>
          </div>

          <div class="inter-actions-deck">
            <button id="btn-inter-reset" class="btn btn-outline btn-sm" title="Reverter para os dados originais da aba de simulação">
              <span>🔄 Reverter</span>
            </button>
            <button id="btn-inter-apply" class="btn btn-primary btn-sm" title="Salvar esses novos votos de volta na simulação principal">
              <span>💾 Aplicar na Simulação</span>
            </button>
          </div>
        </header>

        <!-- FILTROS DE VISUALIZAÇÃO DO GRÁFICO (CHIPS) -->
        <div class="inter-filter-bar glass-card">
          <div class="inter-filter-label">
            <span>Filtro de Candidatos:</span>
          </div>
          <div class="inter-chips-scroll" id="inter-chips-container">
            <!-- Gerado dinamicamente -->
          </div>
        </div>

        <!-- ÁREA DO GRÁFICO INTERATIVO DRAG & DROP -->
        <section class="inter-chart-section glass-card" id="inter-chart-container">
          <div class="inter-chart-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.1rem;">📊</span>
              <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin: 0;">
                Ajuste Direto de Votação Nominal (Clique e arraste as alças)
              </h3>
            </div>

            <!-- CONTROLES DE ZOOM EXCLUSIVOS DO GRÁFICO COM ROLAGEM HORIZONTAL -->
            <div class="inter-chart-zoom-controls">
              <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">Zoom:</span>
              <button id="btn-chart-zoom-out" class="btn btn-outline btn-xs" type="button" title="Diminuir Zoom do Gráfico" style="padding: 2px 8px; font-weight: 800; font-size: 0.85rem;">−</button>
              <span id="inter-zoom-display" style="font-size: 0.72rem; font-weight: 700; min-width: 42px; text-align: center; color: var(--text-main);">100%</span>
              <button id="btn-chart-zoom-in" class="btn btn-outline btn-xs" type="button" title="Aumentar Zoom do Gráfico" style="padding: 2px 8px; font-weight: 800; font-size: 0.85rem;">+</button>
              <button id="btn-chart-zoom-reset" class="btn btn-secondary btn-xs" type="button" title="Resetar Zoom para 100%" style="padding: 2px 8px; font-size: 0.72rem;">Redefinir</button>
            </div>

            <div class="inter-chart-legend">
              <span class="legend-item"><span class="legend-line line-barreira-10"></span> Cláusula 10% QE</span>
              <span class="legend-item"><span class="legend-line line-barreira-20"></span> Cláusula 20% QE</span>
              <span class="legend-item"><span class="legend-badge badge-eleito"></span> Zona de Eleito</span>
            </div>
          </div>

          <!-- ÁREA DO CANVAS/SVG DO GRÁFICO -->
          <div class="inter-chart-viewport" id="inter-chart-viewport">
            <div class="inter-chart-svg-container" id="inter-chart-stage">
              <!-- Gráfico de barras SVG interativo renderizado dinamicamente -->
            </div>
          </div>

          <!-- DICA DE INTERAÇÃO FLUIDA -->
          <div class="inter-chart-footer-hint">
            <span>💡 <b>Dica de Uso:</b> Pressione e arraste a alça circular ↕️ no topo da barra. O saldo de votos é compensado em tempo real proporcionalmente em todos os outros concorrentes.</span>
          </div>
        </section>

        <!-- DASHBOARD INFERIOR EM TEMPO REAL (3 MÓDULOS) -->
        <section class="inter-bottom-dash">
          
          <!-- CARD 1: DISTRIBUIÇÃO DE CADEIRAS POR PARTIDO -->
          <div class="glass-card inter-dash-card">
            <div class="inter-card-header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="card-icon">🏛️</span>
                <h4 class="card-title">Distribuição de Vagas por Agremiação</h4>
              </div>
              <span class="card-tag" id="inter-total-seats-tag">${this.totalSeats} Vagas</span>
            </div>
            
            <div class="inter-party-seats-table-wrapper" id="inter-party-seats-container">
              <!-- Tabela das agremiações com vagas por QP e Sobras -->
            </div>
          </div>

          <!-- CARD 2: LISTA DE ELEITOS EM TEMPO REAL -->
          <div class="glass-card inter-dash-card">
            <div class="inter-card-header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="card-icon">⭐</span>
                <h4 class="card-title">Eleitos em Tempo Real (${this.totalSeats})</h4>
              </div>
              <span class="card-tag status-success">Atualização Instantânea</span>
            </div>

            <div class="inter-elected-list-wrapper" id="inter-elected-list-container">
              <!-- Lista ordenada dos candidatos que estão levando as cadeiras -->
            </div>
          </div>

          <!-- CARD 3: RÉGUA DE SUPLÊNCIA E PRÓXIMA CADEIRA -->
          <div class="glass-card inter-dash-card">
            <div class="inter-card-header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="card-icon">🥈</span>
                <h4 class="card-title">Régua de Suplência & Próxima Vaga</h4>
              </div>
              <span class="card-tag">Bateu na Trave</span>
            </div>

            <div class="inter-suplentes-wrapper" id="inter-suplentes-container">
              <!-- Suplentes imediatos e gap para virar a cadeira -->
            </div>
          </div>

        </section>

        <!-- 5. MÓDULO INTELIGENTE: WORKERS AI COPILOT -->
        <section class="inter-ai-copilot-card glass-card">
          <div class="inter-ai-header">
            <div class="inter-ai-title-group">
              <span style="font-size: 1.3rem;">🧠</span>
              <div>
                <h4 style="font-size: 0.96rem; font-family: var(--font-sans); font-weight: 700; margin: 0; color: var(--text-main); letter-spacing: -0.02em;">
                  Copiloto Estratégico com Workers AI
                </h4>
                <span style="font-size: 0.72rem; color: var(--text-muted);">
                  Análise preditiva de sobras, diagnósticos eleitorais e interferência direta no gráfico
                </span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="inter-ai-badge">Edge Llama 3.1</span>
              <button id="btn-ai-generate-report" class="btn btn-outline btn-xs" style="padding: 4px 10px; font-weight: 700; font-size: 0.76rem;" title="Gerar parecer analítico completo sobre as vagas e sobras atuais">
                📋 Gerar Parecer Eleitoral
              </button>
            </div>
          </div>

          <!-- ENTRADA DE COMANDOS EM LINGUAGEM NATURAL -->
          <div class="inter-ai-controls">
            <div class="inter-ai-input-wrapper">
              <input 
                type="text" 
                id="input-ai-prompt" 
                class="inter-ai-input" 
                placeholder="Ex: 'Transfira 15.000 votos para o Beto Pereira' ou 'Simule a chapa do MDB atingindo o Quociente'..."
              />
              <button id="btn-ai-send-prompt" class="btn btn-primary btn-sm" style="font-weight: 700; padding: 0 16px; white-space: nowrap;">
                ⚡ Executar no Gráfico
              </button>
            </div>

            <!-- SUGESTÕES RÁPIDAS DE COMANDOS ELEITORAIS -->
            <div class="inter-ai-quick-tags">
              <span style="font-size: 0.7rem; color: var(--text-muted); align-self: center;">Sugestões:</span>
              <span class="ai-quick-tag" data-prompt="Analisar riscos de perda de vagas por sobras">⚠️ Riscos de Sobras</span>
              <span class="ai-quick-tag" data-prompt="Aumentar primeiro colocado em 20.000 votos">📈 +20k no Líder</span>
              <span class="ai-quick-tag" data-prompt="Distribuir 10.000 votos de legenda no partido com maior sobra">🏛️ Reforço de Legenda</span>
              <span class="ai-quick-tag" data-prompt="Quais candidatos estão mais perto de ultrapassar a barreira de 20% do QE?">🎯 Trave 20% QE</span>
            </div>
          </div>

          <!-- ÁREA DE RESPOSTA E DIAGNÓSTICO DO WORKERS AI -->
          <div id="ai-copilot-output" class="inter-ai-output-box" style="display: none;">
            <!-- Preenchido dinamicamente pelo AiCopilot -->
          </div>
        </section>

      </div>
    `;
  }

  /**
   * Associa eventos aos botões e manipuladores globais
   */
  bindEvents() {
    const btnReset = this.container.querySelector('#btn-inter-reset');
    const btnApply = this.container.querySelector('#btn-inter-apply');

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Deseja reverter os votos do gráfico para os dados originais da simulação?')) {
          this.workingGroups = JSON.parse(JSON.stringify(this.originalGroupsSnapshot));
          this.recalculateAndRender();
        }
      });
    }

    if (btnApply) {
      btnApply.addEventListener('click', () => {
        if (typeof this.onApplyCallback === 'function') {
          this.onApplyCallback(this.workingGroups, this.validVotes);
        }
      });
    }

    // Controles de Zoom Dedicados ao Gráfico
    const btnZoomIn = this.container.querySelector('#btn-chart-zoom-in');
    const btnZoomOut = this.container.querySelector('#btn-chart-zoom-out');
    const btnZoomReset = this.container.querySelector('#btn-chart-zoom-reset');

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        if (this.zoomLevel < 2.5) {
          this.zoomLevel = Math.min(2.5, +(this.zoomLevel + 0.2).toFixed(1));
          this.updateZoomDisplay();
          this.renderChart();
        }
      });
    }

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        if (this.zoomLevel > 0.6) {
          this.zoomLevel = Math.max(0.6, +(this.zoomLevel - 0.2).toFixed(1));
          this.updateZoomDisplay();
          this.renderChart();
        }
      });
    }

    if (btnZoomReset) {
      btnZoomReset.addEventListener('click', () => {
        this.zoomLevel = 1.0;
        this.updateZoomDisplay();
        this.renderChart();
      });
    }

    // Eventos globais de mousemove e mouseup para drag contínuo mesmo fora da barra
    window.addEventListener('mousemove', (e) => this.handleGlobalDragMove(e));
    window.addEventListener('mouseup', () => this.handleGlobalDragEnd());
    window.addEventListener('touchmove', (e) => this.handleGlobalDragMove(e), { passive: false });
    window.addEventListener('touchend', () => this.handleGlobalDragEnd());

    // Eventos do Módulo Workers AI Copilot
    this.bindAiCopilotEvents();
  }

  /**
   * Associa os eventos da interface do Copiloto Workers AI
   */
  bindAiCopilotEvents() {
    const btnReport = this.container.querySelector('#btn-ai-generate-report');
    const btnSend = this.container.querySelector('#btn-ai-send-prompt');
    const inputPrompt = this.container.querySelector('#input-ai-prompt');
    const outputBox = this.container.querySelector('#ai-copilot-output');
    const quickTags = this.container.querySelectorAll('.ai-quick-tag');

    if (btnReport) {
      btnReport.addEventListener('click', async () => {
        if (!outputBox) return;
        outputBox.style.display = 'block';
        outputBox.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted);">
            <span class="spinner" style="width: 14px; height: 14px;"></span>
            <span>Consultando Workers AI e analisando sobras, quocientes e cláusulas...</span>
          </div>
        `;

        try {
          const report = await this.aiCopilot.generateStrategicReport();
          this.renderAiReport(report, outputBox);
        } catch (err) {
          outputBox.innerHTML = `<span style="color: var(--accent-red);">Erro ao gerar parecer: ${err.message}</span>`;
        }
      });
    }

    const executePrompt = async () => {
      const text = inputPrompt?.value?.trim();
      if (!text || !outputBox) return;

      outputBox.style.display = 'block';
      outputBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted);">
          <span class="spinner" style="width: 14px; height: 14px;"></span>
          <span>Workers AI interpretando comando e calculando mutação de votos...</span>
        </div>
      `;

      try {
        const result = await this.aiCopilot.executeCommand(text);
        outputBox.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #22C55E; font-weight: 800;">✓ Executado com Sucesso</span>
              ${result.isLocal ? '<span style="font-size: 0.65rem; color: var(--text-muted);">(Motor Analítico Integrado)</span>' : '<span style="font-size: 0.65rem; color: #38BDF8;">(Cloudflare Workers AI Llama 3.1)</span>'}
            </div>
            <p style="margin: 0; font-size: 0.84rem; color: var(--text-main);">${result.explanation || 'Votações atualizadas no gráfico.'}</p>
          </div>
        `;
      } catch (err) {
        outputBox.innerHTML = `<span style="color: var(--accent-red);">Erro na execução: ${err.message}</span>`;
      }
    };

    if (btnSend) {
      btnSend.addEventListener('click', executePrompt);
    }

    if (inputPrompt) {
      inputPrompt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executePrompt();
        }
      });
    }

    quickTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const prompt = tag.getAttribute('data-prompt');
        if (inputPrompt && prompt) {
          inputPrompt.value = prompt;
          executePrompt();
        }
      });
    });
  }

  /**
   * Renderiza o Parecer Eleitoral Estruturado da IA
   */
  renderAiReport(report, container) {
    if (!report) return;

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
        <strong style="font-size: 0.88rem; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
          <span>📋</span> Parecer Estratégico do Cenário Atual
        </strong>
        ${report.isLocal ? '<span style="font-size: 0.68rem; color: var(--text-muted);">Edge AI Local Fallback</span>' : '<span style="font-size: 0.68rem; color: #38BDF8; font-weight: 700;">Cloudflare Workers AI</span>'}
      </div>

      <p style="margin: 0; font-size: 0.84rem; color: var(--text-main); line-height: 1.5;">
        ${report.summary || report.raw || ''}
      </p>

      ${report.strengths && report.strengths.length > 0 ? `
        <div>
          <span class="ai-report-section-title" style="color: #4ADE80;">✓ Forças e Vagas Asseguradas:</span>
          <ul class="ai-bullet-list">
            ${report.strengths.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${report.risks && report.risks.length > 0 ? `
        <div>
          <span class="ai-report-section-title" style="color: #F87171;">⚠️ Pontos de Atenção & Sobras em Risco:</span>
          <ul class="ai-bullet-list">
            ${report.risks.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${report.recommendations && report.recommendations.length > 0 ? `
        <div>
          <span class="ai-report-section-title" style="color: #38BDF8;">💡 Diretrizes Táticas Sugeridas:</span>
          <ul class="ai-bullet-list">
            ${report.recommendations.map(rc => `<li>${rc}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
  }

  updateZoomDisplay() {
    const display = this.container.querySelector('#inter-zoom-display');
    if (display) {
      display.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
  }

  /**
   * Recalcula a simulação oficial e renderiza todas as partes
   */
  recalculateAndRender() {
    this.currentResult = ElectoralEngine.runSimulation({
      validVotes: this.validVotes,
      totalSeats: this.totalSeats,
      groups: this.workingGroups
    });

    this.renderTopMetrics();
    this.renderFilterChips();
    this.renderChart();
    this.renderPartySeatsTable();
    this.renderElectedList();
    this.renderSuplentesList();
  }

  /**
   * Renderiza os chips de filtros de agremiação
   */
  renderFilterChips() {
    const container = this.container.querySelector('#inter-chips-container');
    if (!container) return;

    let html = `
      <button class="inter-chip ${this.activeFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">
        <span>⭐ Todos (Mais Competitivos)</span>
      </button>
    `;

    this.workingGroups.forEach(g => {
      const activeClass = this.activeFilter === g.name ? 'active' : '';
      const totalCandVotes = (g.candidates || []).reduce((s, c) => s + (c.votes || 0), 0);
      let shortName = g.name;
      if (g.federacao) {
        if (g.federacao.includes('UNIÃO') && g.federacao.includes('PROGRESSISTA')) {
          shortName = 'FED. UNIÃO / PP';
        } else if (g.federacao.includes('PSDB') && g.federacao.includes('CIDADANIA')) {
          shortName = 'FED. PSDB / CIDADANIA';
        } else if (g.federacao.includes('ESPERANÇA')) {
          shortName = 'FE BRASIL (PT/PCdoB/PV)';
        } else if (g.federacao.includes('PSOL') && g.federacao.includes('REDE')) {
          shortName = 'FED. PSOL / REDE';
        } else {
          shortName = g.federacao.replace('FEDERAÇÃO ', 'FED. ');
        }
      }
      
      html += `
        <button class="inter-chip ${activeClass}" data-filter="${g.name}" title="${g.name}">
          <span>${shortName}</span>
          <span class="chip-votes">${totalCandVotes.toLocaleString('pt-BR')}</span>
        </button>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.inter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.getAttribute('data-filter');
        this.renderFilterChips();
        this.renderChart();
      });
    });
  }

  /**
   * Atualiza as métricas da barra superior
   */
  renderTopMetrics() {
    if (!this.currentResult) return;
    const qe = this.currentResult.qe || 0;
    const b10 = Math.round(qe * 0.10);
    const b20 = Math.round(qe * 0.20);

    const elQe = this.container.querySelector('#inter-metric-qe');
    const elB10 = this.container.querySelector('#inter-metric-barreira-10');
    const elB20 = this.container.querySelector('#inter-metric-barreira-20');

    if (elQe) elQe.textContent = qe.toLocaleString('pt-BR');
    if (elB10) elB10.textContent = b10.toLocaleString('pt-BR');
    if (elB20) elB20.textContent = b20.toLocaleString('pt-BR');
  }

  /**
   * Obtém a lista de itens (candidatos + votos de legenda) a exibir no gráfico
   * Para Deputado Federal: exibe até 9 candidatos + Legenda
   * Para Deputado Estadual: exibe até 25 candidatos + Legenda
   */
  getCandidatesToDisplay() {
    const electedNamesSet = new Set(
      (this.currentResult?.allElected || []).map(e => e.nome.toUpperCase())
    );

    const items = [];

    if (this.activeFilter !== 'ALL') {
      const group = this.workingGroups.find(g => g.name === this.activeFilter);
      if (!group) return [];

      // 1. Barra de Voto de Legenda do partido selecionado
      items.push({
        nome: 'VOTO DE LEGENDA',
        isLegenda: true,
        votes: group.partyVotes || 0,
        groupName: group.name,
        partyLabel: group.party || group.name,
        isElected: false
      });

      // 2. Todos os candidatos da chapa (até 9 para Federal ou 25 para Estadual)
      const validCands = (group.candidates || [])
        .filter(c => c.situacao !== 'INDEFERIDO' && c.situacao !== 'CANCELADO')
        .sort((a, b) => (b.votes || 0) - (a.votes || 0));

      validCands.forEach(c => {
        items.push({
          ...c,
          isLegenda: false,
          groupName: group.name,
          partyLabel: c.partido || group.party || group.name,
          isElected: electedNamesSet.has(c.nome.toUpperCase())
        });
      });

      return items;
    }

    // Se 'ALL' (Visão Geral):
    // Inclui obrigatoriamente:
    // 1. Qualquer candidato que tenha votos (> 0) lançados pelo usuário
    // 2. Os principais cabeças de chapa de cada agremiação
    // 3. Legendas que tenham votos (> 0) ou representem agremiações com votos
    this.workingGroups.forEach(g => {
      // Voto de legenda (exibe se houver votos ou como referência mínima)
      if ((g.partyVotes || 0) > 0) {
        items.push({
          nome: `LEGENDA (${g.party || g.name.substring(0, 6)})`,
          isLegenda: true,
          votes: g.partyVotes || 0,
          groupName: g.name,
          partyLabel: g.party || g.name,
          isElected: false
        });
      }

      // Candidatos da chapa
      const validCands = (g.candidates || [])
        .filter(c => c.situacao !== 'INDEFERIDO' && c.situacao !== 'CANCELADO')
        .sort((a, b) => (b.votes || 0) - (a.votes || 0));

      // Todos os candidatos que possuem voto lançado (> 0) SEMPRE entram no gráfico
      const candsWithVotes = validCands.filter(c => (c.votes || 0) > 0);
      candsWithVotes.forEach(c => {
        items.push({
          ...c,
          isLegenda: false,
          groupName: g.name,
          partyLabel: c.partido || g.party || g.name,
          isElected: electedNamesSet.has(c.nome.toUpperCase())
        });
      });

      // Se a chapa não tem nenhum candidato com voto, exibe ao menos os 2 primeiros como amostra
      if (candsWithVotes.length === 0) {
        validCands.slice(0, 2).forEach(c => {
          items.push({
            ...c,
            isLegenda: false,
            groupName: g.name,
            partyLabel: c.partido || g.party || g.name,
            isElected: electedNamesSet.has(c.nome.toUpperCase())
          });
        });
      }
    });

    // Remove duplicatas caso ocorra e ordena decrescente por votos
    const uniqueMap = new Map();
    items.forEach(it => {
      const k = `${it.groupName}:::${it.nome}`;
      if (!uniqueMap.has(k)) uniqueMap.set(k, it);
    });

    return Array.from(uniqueMap.values()).sort((a, b) => (b.votes || 0) - (a.votes || 0));
  }

  /**
   * Renderiza o gráfico de barras SVG interativo de alta precisão
   */
  renderChart() {
    const stage = this.container.querySelector('#inter-chart-stage');
    if (!stage) return;

    const candidates = this.getCandidatesToDisplay();
    if (candidates.length === 0) {
      stage.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
          Nenhum candidato encontrado com votos neste filtro. Lance votos na simulação ou selecione outra agremiação.
        </div>
      `;
      return;
    }

    const qe = this.currentResult.qe || 1;
    const b10 = Math.round(qe * 0.10);
    const b20 = Math.round(qe * 0.20);

    // Determina a altura máxima para escala do eixo Y
    const maxVotes = Math.max(...candidates.map(c => c.votes || 0), b20 * 1.3, 1000);
    const chartHeight = 340;

    // Escala de zoom independente aplicada à largura das barras e do palco
    const zoom = this.zoomLevel || 1.0;
    const baseBarWidth = Math.max(46, Math.min(68, Math.floor(1200 / candidates.length)));
    const barWidth = Math.round(baseBarWidth * zoom);
    const gap = Math.round(Math.max(22, Math.min(34, Math.floor(baseBarWidth * 0.45)) * zoom));
    const totalWidth = Math.max(1000, Math.round((candidates.length * (barWidth + gap) + 160) * zoom));

    // Função de mapeamento de Votos para Coordenada Y no SVG
    const plotY = (votes) => {
      const clamped = Math.max(0, votes);
      const ratio = clamped / maxVotes;
      return chartHeight - (ratio * (chartHeight - 60)) - 30;
    };

    const yB10 = plotY(b10);
    const yB20 = plotY(b20);

    let barsSvg = '';

    candidates.forEach((cand, index) => {
      const x = 70 + index * (barWidth + gap);
      const votes = cand.votes || 0;
      const barY = plotY(votes);
      const barH = (chartHeight - 30) - barY;
      const themeColor = this.getPartyColor(cand.partyLabel || cand.groupName);
      const uniqueCandKey = `${cand.groupName}:::${cand.nome}`;

      const electedClass = cand.isElected ? 'is-elected-bar' : '';

      barsSvg += `
        <g class="inter-cand-group ${electedClass} ${cand.isLegenda ? 'is-legenda-bar' : ''}" data-cand-key="${uniqueCandKey}" transform="translate(${x}, 0)">
          
          <!-- EFEITO DE GLOW SE ELEITO -->
          ${cand.isElected ? `
            <rect x="-4" y="${barY - 4}" width="${barWidth + 8}" height="${barH + 8}" rx="8" fill="${themeColor.light}" opacity="0.18" class="elected-glow-pulse" />
          ` : ''}

          <!-- CORPO DA BARRA -->
          <rect 
            x="0" 
            y="${barY}" 
            width="${barWidth}" 
            height="${Math.max(4, barH)}" 
            rx="6" 
            fill="url(#grad-${index})" 
            stroke="${cand.isElected ? '#22C55E' : (cand.isLegenda ? '#F59E0B' : themeColor.border)}" 
            stroke-width="${cand.isElected ? '2' : (cand.isLegenda ? '2' : '1')}"
            stroke-dasharray="${cand.isLegenda ? '4,3' : 'none'}"
            class="cand-bar-rect"
          />

          <!-- DEFINIÇÃO DO GRADIENTE DA BARRA -->
          <defs>
            <linearGradient id="grad-${index}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${cand.isElected ? '#22C55E' : themeColor.light}" />
              <stop offset="100%" stop-color="${themeColor.main}" />
            </linearGradient>
          </defs>

          <!-- VALOR NUMÉRICO ACIMA DA BARRA (ALTO CONTRASTE) -->
          <text 
            x="${barWidth / 2}" 
            y="${barY - 10}" 
            text-anchor="middle" 
            font-family="'Inter', sans-serif" 
            font-size="11" 
            font-weight="800" 
            fill="var(--text-main)"
            class="cand-votes-text"
          >
            ${votes.toLocaleString('pt-BR')}
          </text>

          <!-- ALÇA DE ARRASTE (DRAG HANDLE VERTICAL) -->
          <g class="inter-drag-handle" data-cand-key="${uniqueCandKey}" transform="translate(${barWidth / 2}, ${barY})">
            <circle cx="0" cy="0" r="11" fill="var(--bg-card)" stroke="${cand.isElected ? '#16A34A' : (cand.isLegenda ? '#F59E0B' : 'var(--primary)')}" stroke-width="2.5" class="handle-circle" />
            <path d="M-3.5 -3.5 L0 -7 L3.5 -3.5 M-3.5 3.5 L0 7 L3.5 3.5" stroke="var(--text-main)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </g>

          <!-- BADGE DE ELEITO SE ESTIVER ELEITO OU BADGE LEGENDA -->
          ${cand.isElected ? `
            <g transform="translate(${barWidth / 2}, ${barY - 26})">
              <rect x="-24" y="-8" width="48" height="15" rx="4" fill="#15803D" />
              <text x="0" y="3" text-anchor="middle" font-family="'Inter', sans-serif" font-size="8.5" font-weight="900" fill="#FFFFFF">ELEITO</text>
            </g>
          ` : (cand.isLegenda ? `
            <g transform="translate(${barWidth / 2}, ${barY - 26})">
              <rect x="-28" y="-8" width="56" height="15" rx="4" fill="#B45309" />
              <text x="0" y="3" text-anchor="middle" font-family="'Inter', sans-serif" font-size="8" font-weight="900" fill="#FFFFFF">LEGENDA</text>
            </g>
          ` : '')}

          <!-- INFORMAÇÕES DO CANDIDATO NA BASE DO EIXO X (ALTERNADO EM 2 NÍVEIS P/ NUNCA SOBREPOR) -->
          <g transform="translate(${barWidth / 2}, ${chartHeight - 14})">
            ${index % 2 === 1 ? `
              <!-- Traço guia conectando a barra ao segundo nível alternado -->
              <line x1="0" y1="2" x2="0" y2="28" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="2,2" opacity="0.6" />
            ` : ''}

            <!-- NOME DO CANDIDATO / LEGENDA (ALTERNADO: NÍVEL 1 y=16, NÍVEL 2 y=46) -->
            <text 
              x="0" 
              y="${index % 2 === 0 ? 16 : 46}" 
              text-anchor="middle" 
              font-family="'Inter', sans-serif" 
              font-size="10.5" 
              font-weight="800" 
              fill="${cand.isLegenda ? '#F59E0B' : 'var(--text-main)'}"
              title="${cand.nome}"
            >
              ${this.truncateName(cand.nome, 13)}
            </text>

            <!-- PARTIDO / LEGENDA (ALTERNADO: NÍVEL 1 y=28, NÍVEL 2 y=58) -->
            <text 
              x="0" 
              y="${index % 2 === 0 ? 28 : 58}" 
              text-anchor="middle" 
              font-family="'Inter', sans-serif" 
              font-size="9" 
              font-weight="700" 
              fill="var(--text-muted)"
            >
              ${cand.partido || cand.partyLabel}
            </text>
          </g>

        </g>
      `;
    });

    const svgContent = `
      <svg 
        id="inter-svg-element" 
        width="${Math.max(100, Math.round(totalWidth))}px" 
        height="${chartHeight + 90}" 
        viewBox="0 0 ${totalWidth} ${chartHeight + 90}" 
        preserveAspectRatio="xMinYMin meet"
        style="overflow: visible; user-select: none; min-width: ${Math.round(totalWidth)}px; display: block;"
      >
        <!-- GRID DE LINHAS DE FUNDO -->
        <line x1="40" y1="${chartHeight - 30}" x2="${totalWidth - 20}" y2="${chartHeight - 30}" stroke="#334155" stroke-width="1.5" />
        
        <!-- LINHA DA CLÁUSULA 10% (QP) -->
        <line x1="40" y1="${yB10}" x2="${totalWidth - 20}" y2="${yB10}" stroke="#F59E0B" stroke-width="1.8" stroke-dasharray="5,4" opacity="0.85" />
        <text x="${totalWidth - 25}" y="${yB10 + 4}" text-anchor="end" font-family="'Inter', sans-serif" font-size="9.5" font-weight="700" fill="#F59E0B">
          10% QE (${b10.toLocaleString('pt-BR')})
        </text>

        <!-- LINHA DA CLÁUSULA 20% (SOBRAS) -->
        <line x1="40" y1="${yB20}" x2="${totalWidth - 20}" y2="${yB20}" stroke="#06B6D4" stroke-width="1.8" stroke-dasharray="5,4" opacity="0.85" />
        <text x="${totalWidth - 25}" y="${yB20 + 4}" text-anchor="end" font-family="'Inter', sans-serif" font-size="9.5" font-weight="700" fill="#06B6D4">
          20% QE (${b20.toLocaleString('pt-BR')})
        </text>

        <!-- BARRAS DOS CANDIDATOS -->
        ${barsSvg}
      </svg>
    `;

    stage.innerHTML = svgContent;
    this.bindChartDragEvents(maxVotes, chartHeight);
  }

  /**
   * Associa os eventos de clique e arraste às alças do gráfico
   */
  bindChartDragEvents(maxVotes, chartHeight) {
    const stage = this.container.querySelector('#inter-chart-stage');
    if (!stage) return;

    const handles = stage.querySelectorAll('.inter-drag-handle');
    handles.forEach(handle => {
      const candKey = handle.getAttribute('data-cand-key');

      const onStart = (clientY) => {
        const [groupName, candNome] = candKey.split(':::');
        const isLegenda = candNome.toUpperCase().includes('LEGENDA');
        const startVotes = this.getCurrentVotes(groupName, candNome);

        this.dragContext = {
          candKey,
          groupName,
          candNome,
          isLegenda,
          startY: clientY,
          startVotes: startVotes || 0,
          maxVotes,
          chartHeight,
          hasChanged: false
        };

        handle.classList.add('dragging');
        document.body.style.cursor = 'ns-resize';
      };

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onStart(e.clientY);
      });

      handle.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          onStart(e.touches[0].clientY);
        }
      }, { passive: false });
    });
  }

  /**
   * Manipula o movimento contínuo do mouse/touch durante o arraste
   */
  handleGlobalDragMove(e) {
    if (!this.dragContext) return;
    if (e.cancelable && e.type === 'touchmove') e.preventDefault();

    const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
    const dy = this.dragContext.startY - clientY; // para cima é positivo

    // Sensibilidade de escala: 1px = X votos dependendo do maxVotes e da altura do gráfico
    const sensitivity = (this.dragContext.maxVotes / (this.dragContext.chartHeight - 60)) * 0.95;
    const deltaVotes = Math.round(dy * sensitivity);
    
    const targetVotes = Math.max(0, this.dragContext.startVotes + deltaVotes);

    if (targetVotes !== this.getCurrentVotes(this.dragContext.groupName, this.dragContext.candNome)) {
      this.dragContext.hasChanged = true;
      this.applyProportionalCompensation(this.dragContext.groupName, this.dragContext.candNome, targetVotes);
    }
  }

  /**
   * Finaliza o arraste
   */
  handleGlobalDragEnd() {
    if (!this.dragContext) return;
    this.dragContext = null;
    document.body.style.cursor = 'default';
    
    // Atualiza a interface completa ao soltar
    this.recalculateAndRender();
  }

  /**
   * REGRA MATEMÁTICA DA COMPENSAÇÃO PROPORCIONAL ESTRITA
   * Mantém o limite de votos válidos 100% preservado e redistribui a variação
   * proporcionalmente entre todos os outros candidatos e legendas que possuem votos.
   */
  applyProportionalCompensation(targetGroupName, targetCandNome, newVotes) {
    const isLegenda = targetCandNome.toUpperCase().includes('LEGENDA');
    const group = this.workingGroups.find(g => g.name === targetGroupName);
    if (!group) return;

    const oldVotes = isLegenda ? (group.partyVotes || 0) : ((this.findCandidate(targetGroupName, targetCandNome) || {}).votes || 0);
    const delta = newVotes - oldVotes;
    if (delta === 0) return;

    // Coleta todas as fontes de voto (candidatos + votos de legenda) que possuem votos > 0
    const otherSources = [];
    let sumOtherVotes = 0;

    this.workingGroups.forEach(g => {
      // Voto de legenda do grupo (se não for o próprio alvo)
      if (isLegenda && g.name === targetGroupName) {
        // Alvo é a própria legenda
      } else if ((g.partyVotes || 0) > 0) {
        otherSources.push({
          type: 'legenda',
          group: g,
          get votes() { return g.partyVotes || 0; },
          set votes(v) { g.partyVotes = v; }
        });
        sumOtherVotes += g.partyVotes;
      }

      // Candidatos da chapa
      (g.candidates || []).forEach(c => {
        if (!isLegenda && g.name === targetGroupName && c.nome.toUpperCase() === targetCandNome.toUpperCase()) {
          // É o próprio candidato alvo, não entra na dedução dos outros
          return;
        }
        if ((c.votes || 0) > 0) {
          otherSources.push({
            type: 'candidate',
            cand: c,
            get votes() { return c.votes || 0; },
            set votes(v) { c.votes = v; }
          });
          sumOtherVotes += c.votes;
        }
      });
    });

    // Se não há outras fontes com votos para compensar, restringe
    if (sumOtherVotes <= 0 && delta > 0) {
      return;
    }

    // Aplica o novo valor no alvo
    if (isLegenda) {
      group.partyVotes = newVotes;
    } else {
      const targetCand = this.findCandidate(targetGroupName, targetCandNome);
      if (targetCand) targetCand.votes = newVotes;
    }

    // Se há outras fontes, compensa -delta proporcionalmente
    if (otherSources.length > 0 && sumOtherVotes > 0) {
      let distributedCompensation = 0;

      otherSources.forEach(source => {
        const share = source.votes / sumOtherVotes;
        const compDelta = Math.round(delta * share);
        source.votes = Math.max(0, source.votes - compDelta);
        distributedCompensation += compDelta;
      });

      // Ajuste residual para garantir precisão exata de 1 voto
      const residual = delta - distributedCompensation;
      if (residual !== 0 && otherSources.length > 0) {
        const biggest = otherSources.reduce((max, s) => (s.votes > max.votes ? s : max), otherSources[0]);
        biggest.votes = Math.max(0, biggest.votes - residual);
      }
    }

    // Executa a simulação em tempo real para alimentar o dashboard inferior e as barras
    this.currentResult = ElectoralEngine.runSimulation({
      validVotes: this.validVotes,
      totalSeats: this.totalSeats,
      groups: this.workingGroups
    });

    // Atualização fluida do dashboard inferior se estiver montado no DOM
    if (this.container) {
      this.renderPartySeatsTable();
      this.renderElectedList();
      this.renderSuplentesList();

      // Atualiza rapidamente o texto de votos da barra atual no SVG
      const candKey = `${targetGroupName}:::${targetCandNome}`;
      const groupEl = this.container.querySelector(`.inter-cand-group[data-cand-key="${candKey}"]`);
      if (groupEl) {
        const textEl = groupEl.querySelector('.cand-votes-text');
        if (textEl) textEl.textContent = newVotes.toLocaleString('pt-BR');
      }
    }
  }

  /**
   * CARD 1: Distribuição de Vagas por Partido (QP, Sobras 80/20, Sobras Gerais)
   */
  renderPartySeatsTable() {
    const container = this.container.querySelector('#inter-party-seats-container');
    if (!container || !this.currentResult) return;

    const partiesList = this.currentResult.partyStats || this.currentResult.parties || [];
    const partiesWithSeats = partiesList
      .filter(p => (p.totalSeatsWon || 0) > 0)
      .sort((a, b) => (b.totalSeatsWon || 0) - (a.totalSeatsWon || 0) || (b.totalVotes || 0) - (a.totalVotes || 0));

    if (partiesWithSeats.length === 0) {
      container.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          Nenhuma agremiação atingiu o Quociente Partidário ou as Sobras até o momento.
        </div>
      `;
      return;
    }

    let rowsHtml = '';
    partiesWithSeats.forEach(party => {
      const color = this.getPartyColor(party.party || party.name);
      const logoSvg = getPartyLogoSvg(party.name, party.federationName);
      const percent = (((party.totalSeatsWon || 0) / this.totalSeats) * 100).toFixed(1);

      rowsHtml += `
        <div class="inter-seat-row">
          <div class="inter-seat-party-info">
            <div class="inter-seat-logo">${logoSvg}</div>
            <div>
              <span class="inter-seat-party-name" title="${party.name}">${this.truncateName(party.name, 20)}</span>
              <span class="inter-seat-party-votes">${Number(party.totalVotes || 0).toLocaleString('pt-BR')} votos (${party.voteSharePercent || '0.00'}%)</span>
            </div>
          </div>

          <div class="inter-seat-bars-breakdown">
            <div class="inter-seat-badge-group">
              <span class="seat-pill pill-qp" title="Vagas pelo Quociente Partidário (QP)">${party.seatsByQP || 0} QP</span>
              <span class="seat-pill pill-sobra-8020" title="Sobras 80/20">${party.seatsBySobras8020 || 0} Sobra 80/20</span>
              ${(party.seatsBySobrasGerais || 0) > 0 ? `<span class="seat-pill pill-sobra-geral" title="Sobras Gerais STF">${party.seatsBySobrasGerais} Sobra Geral</span>` : ''}
            </div>
            <div class="inter-seat-total-box" style="border-color: ${color.main};">
              <span class="total-seats-number">${party.totalSeatsWon || 0}</span>
              <span class="total-seats-label">vagas (${percent}%)</span>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = rowsHtml;
  }

  /**
   * CARD 2: Lista dos Eleitos em Tempo Real
   */
  renderElectedList() {
    const container = this.container.querySelector('#inter-elected-list-container');
    if (!container || !this.currentResult) return;

    const allElected = this.currentResult.allElected || this.currentResult.elected || [];
    if (allElected.length === 0) {
      container.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          Aguardando distribuição de vagas...
        </div>
      `;
      return;
    }

    let itemsHtml = '';
    allElected.forEach((cand, idx) => {
      const pos = idx + 1;
      const type = cand.tipoVaga || cand.seatType || 'QP';
      const typeLabel = type === 'QP' ? 'Vaga QP' : (type === 'SOBRA_80_20' ? 'Sobra 80/20' : 'Sobra Geral');
      const typeClass = type === 'QP' ? 'badge-qp' : 'badge-sobra';
      const color = this.getPartyColor(cand.partido || cand.party || cand.groupName);

      itemsHtml += `
        <div class="inter-elected-card">
          <div class="inter-elected-left">
            <span class="elected-position-rank">#${pos}</span>
            <div class="elected-avatar" style="border-color: ${color.main};">
              <span>${this.getInitials(cand.nome)}</span>
            </div>
            <div class="elected-details">
              <strong class="elected-name" title="${cand.nome}">${cand.nome}</strong>
              <span class="elected-party-tag">${cand.partido || cand.party || cand.groupName}</span>
            </div>
          </div>

          <div class="inter-elected-right">
            <span class="elected-votes-badge">${Number(cand.votes || 0).toLocaleString('pt-BR')} votos</span>
            <span class="elected-type-tag ${typeClass}">${typeLabel}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = itemsHtml;
  }

  /**
   * CARD 3: Régua de Suplência e Próxima Cadeira
   */
  renderSuplentesList() {
    const container = this.container.querySelector('#inter-suplentes-container');
    if (!container || !this.currentResult) return;

    const partiesList = this.currentResult.partyStats || this.currentResult.parties || [];
    let html = '';

    partiesList.forEach(party => {
      const suplentes = party.remainingCandidates || [];
      if (suplentes.length === 0) return;

      const p1 = suplentes[0];
      const p2 = suplentes[1];
      const logoSvg = getPartyLogoSvg(party.name, party.federationName);

      html += `
        <div class="inter-suplente-group-card">
          <div class="suplente-group-header">
            <div class="suplente-logo-mini">${logoSvg}</div>
            <strong class="suplente-group-name">${this.truncateName(party.name, 22)}</strong>
            <span class="suplente-seats-summary">${party.totalSeatsWon || 0} vaga(s) obtida(s)</span>
          </div>

          <div class="suplentes-chips-row">
            ${p1 ? `
              <div class="suplente-chip chip-primeiro">
                <span class="suplente-rank-tag">1º Suplente</span>
                <span class="suplente-cand-name" title="${p1.nome}">${this.truncateName(p1.nome, 16)}</span>
                <span class="suplente-cand-votes">${Number(p1.votes || 0).toLocaleString('pt-BR')} votos</span>
              </div>
            ` : ''}

            ${p2 ? `
              <div class="suplente-chip chip-segundo">
                <span class="suplente-rank-tag">2º Suplente</span>
                <span class="suplente-cand-name" title="${p2.nome}">${this.truncateName(p2.nome, 16)}</span>
                <span class="suplente-cand-votes">${Number(p2.votes || 0).toLocaleString('pt-BR')} votos</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    if (!html) {
      html = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          Sem suplentes cadastrados para este cenário.
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // --- MÉTODOS AUXILIARES ---

  findCandidate(groupName, candNome) {
    const group = this.workingGroups.find(g => g.name === groupName);
    if (!group) return null;
    if (candNome && candNome.toUpperCase().includes('LEGENDA')) {
      return {
        nome: candNome,
        isLegenda: true,
        get votes() { return group.partyVotes || 0; },
        set votes(v) { group.partyVotes = v; }
      };
    }
    if (!Array.isArray(group.candidates)) return null;
    return group.candidates.find(c => c.nome.toUpperCase() === candNome.toUpperCase());
  }

  getCurrentVotes(groupName, candNome) {
    if (candNome && candNome.toUpperCase().includes('LEGENDA')) {
      const group = this.workingGroups.find(g => g.name === groupName);
      return group ? (group.partyVotes || 0) : 0;
    }
    const cand = this.findCandidate(groupName, candNome);
    return cand ? cand.votes || 0 : 0;
  }

  truncateName(name, maxChars) {
    if (!name) return '';
    if (name.length <= maxChars) return name;
    return name.substring(0, maxChars - 1) + '…';
  }

  getInitials(name) {
    if (!name) return 'CD';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}

export const interactiveSimulator = new InteractiveSimulator();
