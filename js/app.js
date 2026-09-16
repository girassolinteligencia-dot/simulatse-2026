/**
 * app.js
 * Orquestrador principal da interface, preenchimento ágil contínuo,
 * sincronização de estado, execução estrita do motor TSE e Business Intelligence.
 */

import { candidateStore } from './data/candidateStore.js';
import { scenarioManager } from './scenarios/scenarioManager.js';
import { ElectoralEngine } from './engine/electoralRules.js';
import { ElectoralValidator } from './engine/validator.js';

// Estado global reativo da aplicação
const state = {
  currentCargo: 'DEPUTADO ESTADUAL', // ou 'DEPUTADO FEDERAL'
  totalSeats: 24,                    // 24 para Estadual, 8 para Federal
  validVotes: 1400000,
  partyGroups: [],                   // Agrupamentos oficiais por Partido ou Federação
  lastSimulationResult: null,
  admSettings: {
    showEstadual: true,
    showFederal: true,
    requirePin: false,
    pinCode: null
  }
};

const ADM_SETTINGS_KEY = 'simulatse_2026_adm_settings';
const DRAFT_KEY_PREFIX = 'simulatse_draft_v2_';

function saveDraft() {
  const draft = {
    validVotes: state.validVotes,
    partyGroups: state.partyGroups
  };
  localStorage.setItem(DRAFT_KEY_PREFIX + state.currentCargo, JSON.stringify(draft));
}

function loadDraft() {
  const data = localStorage.getItem(DRAFT_KEY_PREFIX + state.currentCargo);
  if (data) {
    try {
      const draft = JSON.parse(data);
      if (draft.validVotes) state.validVotes = draft.validVotes;
      if (Array.isArray(draft.partyGroups) && draft.partyGroups.length > 0) {
        // Mescla votos salvos com a lista oficial para manter a integridade
        draft.partyGroups.forEach(savedGroup => {
          const targetGroup = state.partyGroups.find(g => g.name === savedGroup.name);
          if (targetGroup) {
            targetGroup.partyVotes = savedGroup.partyVotes || 0;
            if (savedGroup.isCollapsed !== undefined) targetGroup.isCollapsed = savedGroup.isCollapsed;
            if (Array.isArray(savedGroup.candidates)) {
              savedGroup.candidates.forEach(savedCand => {
                const targetCand = targetGroup.candidates.find(c => c.nome.toUpperCase() === savedCand.nome.toUpperCase());
                if (targetCand && savedCand.votes !== undefined) {
                  targetCand.votes = savedCand.votes;
                }
              });
            }
          }
        });
      }
      
      const validVotesInput = document.getElementById('input-valid-votes');
      if (validVotesInput && state.validVotes > 0) {
        validVotesInput.value = state.validVotes.toLocaleString('pt-BR');
      }
      return true;
    } catch(e) {
      console.warn('Erro ao carregar rascunho:', e);
    }
  }
  return false;
}

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', async () => {
  loadAdmSettings();
  applyCargoVisibility();
  setupNavigationTabs();
  setupCargoToggle();
  setupAdmAndPinModal();
  setupScenarioActions();
  setupGlobalInputs();

  if (state.admSettings.requirePin && state.admSettings.pinCode) {
    promptPinVerification('startup', () => {
      startApp();
    });
  } else {
    startApp();
  }
});

async function startApp() {
  await candidateStore.initialize();
  applyCargoVisibility();
  initPartyGroupsForCargo(state.currentCargo);
  loadDraft();
  renderPartyChipsNav();
  renderPartyGroups();
  updateMetricsDisplay();
  renderScenariosList();
}

// Navegação entre Tabs (Mobile / Desktop)
function setupNavigationTabs() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(targetTabId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// Alternador de Cargo (Deputado Estadual 24 vagas vs Federal 8 vagas)
function setupCargoToggle() {
  const btnEstadual = document.getElementById('cargo-estadual-btn');
  const btnFederal = document.getElementById('cargo-federal-btn');

  btnEstadual.addEventListener('click', () => {
    if (state.currentCargo === 'DEPUTADO ESTADUAL') return;
    state.currentCargo = 'DEPUTADO ESTADUAL';
    state.totalSeats = 24;
    btnEstadual.classList.add('active');
    btnFederal.classList.remove('active');
    onCargoChanged();
  });

  btnFederal.addEventListener('click', () => {
    if (state.currentCargo === 'DEPUTADO FEDERAL') return;
    state.currentCargo = 'DEPUTADO FEDERAL';
    state.totalSeats = 8;
    btnFederal.classList.add('active');
    btnEstadual.classList.remove('active');
    onCargoChanged();
  });
}

function onCargoChanged() {
  initPartyGroupsForCargo(state.currentCargo);
  loadDraft();
  renderPartyChipsNav();
  renderPartyGroups();
  updateMetricsDisplay();
}

/**
 * Constrói os grupos partidários/federações a partir da base oficial do cargo.
 * Cada grupo possui no máximo 9 candidatos (Federal) ou 25 (Estadual),
 * conforme a legislação eleitoral (100% das vagas + 1).
 */
function initPartyGroupsForCargo(cargo) {
  const allInCargo = candidateStore.getCandidatesByCargo(cargo);
  const maxLimit = state.totalSeats + 1; // 9 para Federal, 25 para Estadual

  const groupsMap = new Map();

  allInCargo.forEach(c => {
    const groupName = c.federacao ? c.federacao : c.partido;
    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, {
        name: groupName,
        party: c.partido,
        federacao: c.federacao || null,
        partyVotes: 0,
        candidates: [],
        isCollapsed: false
      });
    }

    const grp = groupsMap.get(groupName);
    // Limita estritamente ao teto legal oficial
    if (grp.candidates.length < maxLimit) {
      grp.candidates.push({
        ...c,
        votes: 0
      });
    }
  });

  // Ordena os partidos por ordem alfabética da sigla/nome
  state.partyGroups = Array.from(groupsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Utilitários de Máscara Numérica Brasileira
function parseNumberFromMask(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = val.toString().replace(/\D/g, '');
  return parseInt(clean, 10) || 0;
}

// Atualização dos Indicadores de Balanço e QE
function updateMetricsDisplay() {
  const validVotesInput = document.getElementById('input-valid-votes');
  state.validVotes = parseNumberFromMask(validVotesInput.value);

  const qe = ElectoralEngine.calculateQE(state.validVotes, state.totalSeats);

  const displayQe = document.getElementById('display-qe');
  if (displayQe) displayQe.textContent = qe.toLocaleString('pt-BR');

  const balance = ElectoralValidator.validateVoteBalance(state.validVotes, state.partyGroups);
  
  const allocEl = document.getElementById('display-allocated-votes');
  if (allocEl) allocEl.textContent = balance.totalAllocated.toLocaleString('pt-BR');

  const targetEl = document.getElementById('display-target-votes');
  if (targetEl) targetEl.textContent = state.validVotes.toLocaleString('pt-BR');

  const diffEl = document.getElementById('display-vote-diff');
  if (diffEl) diffEl.textContent = Math.abs(balance.difference).toLocaleString('pt-BR');

  // Contador de candidatos carregados
  let totalCandCount = 0;
  state.partyGroups.forEach(g => { totalCandCount += g.candidates.length; });
  const candCounter = document.getElementById('cand-list-counter');
  if (candCounter) {
    candCounter.textContent = `${totalCandCount} candidatos em ${state.partyGroups.length} agremiações`;
  }

  const progressBar = document.getElementById('balance-progress-bar');
  const statusBadge = document.getElementById('balance-status-badge');

  const percent = state.validVotes > 0 ? Math.min(100, (balance.totalAllocated / state.validVotes) * 100) : 0;
  if (progressBar) progressBar.style.width = `${percent}%`;

  if (statusBadge && progressBar) {
    if (balance.isBalanced) {
      progressBar.className = 'progress-fill';
      statusBadge.className = 'badge badge-green';
      statusBadge.textContent = 'Balanceado (100%)';
    } else if (balance.status === 'SURPLUS') {
      progressBar.className = 'progress-fill surplus';
      statusBadge.className = 'badge badge-red';
      statusBadge.textContent = `Excesso (+${(balance.difference * -1).toLocaleString('pt-BR')})`;
    } else {
      progressBar.className = 'progress-fill';
      statusBadge.className = 'badge badge-yellow';
      statusBadge.textContent = `Faltam ${balance.difference.toLocaleString('pt-BR')}`;
    }
  }

  // Atualiza totais nos cabeçalhos de cada partido
  state.partyGroups.forEach((group, idx) => {
    const totalGroupVotes = (group.partyVotes || 0) + group.candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
    const voteBadge = document.getElementById(`party-total-votes-${idx}`);
    if (voteBadge) {
      voteBadge.textContent = `${totalGroupVotes.toLocaleString('pt-BR')} votos`;
    }
  });
}

// Renderiza a barra deslizante horizontal de atalhos rápidos por partido
function renderPartyChipsNav() {
  const container = document.getElementById('party-chips-nav');
  if (!container) return;
  container.innerHTML = '';

  state.partyGroups.forEach((group, idx) => {
    const btn = document.createElement('button');
    btn.className = 'party-chip-btn';
    
    // Simplifica rótulo para caber no chip mobile
    let label = group.name;
    if (label.startsWith('FEDERAÇÃO ')) {
      label = label.replace('FEDERAÇÃO ', 'FED. ');
    }
    btn.textContent = label;
    btn.title = `Rolar para ${group.name}`;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.party-chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const card = document.getElementById(`party-card-${idx}`);
      if (card) {
        // Se estiver recolhido, expande automaticamente
        if (card.classList.contains('collapsed')) {
          card.classList.remove('collapsed');
          state.partyGroups[idx].isCollapsed = false;
        }
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Foca no primeiro input de candidato do partido
        const firstInput = card.querySelector('.cand-vote-input');
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 300);
        }
      }
    });

    container.appendChild(btn);
  });
}

// Renderização dos Blocos Partidários de Preenchimento Contínuo
function renderPartyGroups() {
  const container = document.getElementById('party-groups-container');
  if (!container) return;
  container.innerHTML = '';

  state.partyGroups.forEach((group, groupIndex) => {
    const card = document.createElement('div');
    const isCollapsed = Boolean(group.isCollapsed);
    card.className = `party-group-card ${isCollapsed ? 'collapsed' : ''}`;
    card.id = `party-card-${groupIndex}`;

    const totalGroupVotes = (group.partyVotes || 0) + group.candidates.reduce((sum, c) => sum + (c.votes || 0), 0);

    card.innerHTML = `
      <div class="party-group-header" data-group-index="${groupIndex}" style="padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="party-group-chevron">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
          <strong style="color: #FFFFFF; font-size: 0.9rem;">${group.name}</strong>
          <span style="font-size: 0.72rem; color: var(--text-muted);">(${group.candidates.length} cand.)</span>
        </div>
        <div>
          <span id="party-total-votes-${groupIndex}" style="font-size: 0.75rem; color: var(--primary-light); font-weight: 700;">
            ${totalGroupVotes.toLocaleString('pt-BR')} votos
          </span>
        </div>
      </div>

      <div class="party-group-body" id="group-body-${groupIndex}" style="padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;">
        
        <!-- Lista Sequencial de Candidatos -->
        <div class="candidates-list-wrapper" style="display: flex; flex-direction: column; gap: 4px;">
          ${group.candidates.map((cand, candIndex) => {
            const isNonDeferido = cand.situacao && cand.situacao !== 'DEFERIDO';
            return `
              <div class="candidate-row" id="cand-row-${groupIndex}-${candIndex}" style="display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; padding: 6px 8px; background: var(--bg-input); border: 1px solid var(--border-color);">
                <div class="candidate-info" style="display: flex; flex-direction: column;">
                  <span class="candidate-name" style="font-weight: 700; font-size: 0.85rem; color: #FFFFFF;">${cand.nome}</span>
                  <div style="font-size: 0.7rem; color: var(--text-muted); display: flex; gap: 4px; align-items: center;">
                    <span>${cand.partido}</span>
                    ${cand.nomeCompleto && cand.nomeCompleto !== cand.nome ? `<span style="color: var(--text-dim);">• ${cand.nomeCompleto}</span>` : ''}
                    ${isNonDeferido ? `<span class="badge badge-red" style="font-size: 0.6rem; padding: 1px 4px;">${cand.situacao}</span>` : ''}
                  </div>
                </div>
                <div class="vote-input-wrapper">
                  <input type="text" inputmode="numeric" class="vote-input-field cand-vote-input" 
                    data-group="${groupIndex}" data-cand="${candIndex}" 
                    value="${cand.votes ? cand.votes.toLocaleString('pt-BR') : ''}" 
                    placeholder="0"
                    style="width: 105px; padding: 6px 8px; font-size: 0.95rem; font-weight: 700; text-align: right; background: #000000; border: 1px solid var(--border-color); color: #FFFFFF;">
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Linha Oficial de Votos de Legenda (Sigla) -->
        <div class="candidate-row" style="display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; padding: 8px; background: rgba(0, 136, 204, 0.05); border: 1px dashed rgba(0, 136, 204, 0.35); margin-top: 4px;">
          <div class="candidate-info">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-accent-blue);">VOTOS DE LEGENDA</span>
            <span style="font-size: 0.68rem; color: var(--text-muted);">Voto direto no partido (soma no QP e sobras)</span>
          </div>
          <div class="vote-input-wrapper">
            <input type="text" inputmode="numeric" class="vote-input-field party-vote-input" 
              data-group="${groupIndex}" 
              value="${group.partyVotes ? group.partyVotes.toLocaleString('pt-BR') : ''}" 
              placeholder="0"
              style="width: 105px; padding: 6px 8px; font-size: 0.95rem; font-weight: 700; text-align: right; background: #000000; border: 1px solid var(--color-accent-blue); color: var(--primary-light);">
          </div>
        </div>

      </div>
    `;

    container.appendChild(card);
  });

  attachPartyGroupEvents();
}

function attachPartyGroupEvents() {
  // Clique no cabeçalho do partido/federação para alternar aberto/fechado
  document.querySelectorAll('.party-group-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('input')) return;
      const gIdx = parseInt(header.getAttribute('data-group-index'), 10);
      const card = document.getElementById(`party-card-${gIdx}`);
      if (!card) return;
      
      const isNowCollapsed = !card.classList.contains('collapsed');
      card.classList.toggle('collapsed');
      state.partyGroups[gIdx].isCollapsed = isNowCollapsed;
      saveDraft();
    });
  });

  // Inputs de votos de legenda
  document.querySelectorAll('.party-vote-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const gIdx = parseInt(e.target.getAttribute('data-group'), 10);
      const rawVal = parseNumberFromMask(e.target.value);
      state.partyGroups[gIdx].partyVotes = rawVal;
      e.target.value = rawVal > 0 ? rawVal.toLocaleString('pt-BR') : '';
      updateMetricsDisplay();
      saveDraft();
    });

    // Enter pula para o próximo partido
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const allInputs = Array.from(document.querySelectorAll('.cand-vote-input, .party-vote-input'));
        const currentIndex = allInputs.indexOf(e.target);
        if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
          allInputs[currentIndex + 1].focus();
          allInputs[currentIndex + 1].select();
        }
      }
    });
  });

  // Inputs de votos nominais de cada candidato com navegação fluida por Enter
  const allCandInputs = document.querySelectorAll('.cand-vote-input');
  allCandInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const gIdx = parseInt(e.target.getAttribute('data-group'), 10);
      const cIdx = parseInt(e.target.getAttribute('data-cand'), 10);
      const rawVal = parseNumberFromMask(e.target.value);
      state.partyGroups[gIdx].candidates[cIdx].votes = rawVal;
      e.target.value = rawVal > 0 ? rawVal.toLocaleString('pt-BR') : '';
      updateMetricsDisplay();
      saveDraft();
    });

    // Ao pressionar Enter/Avançar no teclado mobile, avança o foco instantaneamente para o próximo
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const allInputs = Array.from(document.querySelectorAll('.cand-vote-input, .party-vote-input'));
        const currentIndex = allInputs.indexOf(e.target);
        if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
          allInputs[currentIndex + 1].focus();
          allInputs[currentIndex + 1].select();
        }
      }
    });

    // Foco automático seleciona texto existente para facilitar substituição rápida
    input.addEventListener('focus', (e) => {
      setTimeout(() => e.target.select(), 50);
    });
  });
}

function setupGlobalInputs() {
  const validVotesInput = document.getElementById('input-valid-votes');

  validVotesInput.addEventListener('input', (e) => {
    const rawVal = parseNumberFromMask(e.target.value);
    state.validVotes = rawVal;
    if (rawVal > 0) {
      e.target.value = rawVal.toLocaleString('pt-BR');
    }
    updateMetricsDisplay();
    saveDraft();
  });

  // Botão de simulação rápida (proporcional realista calibrada para MS)
  document.getElementById('btn-quick-fill').addEventListener('click', () => {
    autoDistributeRealisticVotes();
  });

  // Limpar votos
  document.getElementById('btn-clear-votes').addEventListener('click', () => {
    if (confirm('Deseja zerar todos os votos lançados?')) {
      state.partyGroups.forEach(g => {
        g.partyVotes = 0;
        g.candidates.forEach(c => { c.votes = 0; });
      });
      saveDraft();
      renderPartyGroups();
      updateMetricsDisplay();
    }
  });

  // Botão Principal de Ação Direta
  document.getElementById('btn-run-simulation').addEventListener('click', () => {
    executeSimulation();
  });
}

function autoDistributeRealisticVotes() {
  const target = state.validVotes;
  if (!target || target <= 0) return;

  // Calibração proporcional para as agremiações existentes
  const groupCount = state.partyGroups.length;
  if (groupCount === 0) return;

  // Distribuição decrescente de pesos para simulação de forças eleitorais
  const weights = [0.24, 0.18, 0.15, 0.12, 0.10, 0.07, 0.05, 0.04, 0.03, 0.02];
  let allocated = 0;

  state.partyGroups.forEach((group, idx) => {
    const weight = weights[idx] || (1 / groupCount);
    const groupTargetVotes = Math.round(target * weight);

    // 4% do partido em votos de legenda
    group.partyVotes = Math.round(groupTargetVotes * 0.04);
    let candPool = groupTargetVotes - group.partyVotes;

    const cCount = group.candidates.length;
    if (cCount > 0) {
      group.candidates.forEach((cand, cIdx) => {
        // Puxador de votos concentra mais e cauda decresce
        const candShare = (cCount - cIdx) / ((cCount * (cCount + 1)) / 2);
        cand.votes = Math.round(candPool * candShare);
      });
    }
  });

  // Ajuste fino para cravar exatamente 100% dos votos válidos
  const balance = ElectoralValidator.validateVoteBalance(target, state.partyGroups);
  if (balance.difference !== 0 && state.partyGroups[0] && state.partyGroups[0].candidates[0]) {
    state.partyGroups[0].candidates[0].votes += balance.difference;
  }

  saveDraft();
  renderPartyGroups();
  updateMetricsDisplay();
}

// Execução da Simulação Eleitoral Oficial
function executeSimulation() {
  const balance = ElectoralValidator.validateVoteBalance(state.validVotes, state.partyGroups);
  
  if (!balance.isBalanced) {
    if (balance.difference > 0) {
      alert(`A soma dos votos (${balance.totalAllocated.toLocaleString('pt-BR')}) é MENOR que o total projetado (${state.validVotes.toLocaleString('pt-BR')}). Faltam ${balance.difference.toLocaleString('pt-BR')} votos.`);
    } else {
      alert(`A soma dos votos (${balance.totalAllocated.toLocaleString('pt-BR')}) é MAIOR que o total projetado (${state.validVotes.toLocaleString('pt-BR')}). Excesso de ${(balance.difference * -1).toLocaleString('pt-BR')} votos.`);
    }
    return;
  }

  const result = ElectoralEngine.runSimulation({
    validVotes: state.validVotes,
    totalSeats: state.totalSeats,
    groups: state.partyGroups
  });

  state.lastSimulationResult = result;
  displayResults(result);

  // Navega automaticamente para o painel de resultados de BI
  const resultsTabBtn = document.querySelector('.nav-tab-btn[data-tab="tab-results"]');
  if (resultsTabBtn) resultsTabBtn.click();
}

// Exibição do Cockpit de Business Intelligence (BI) e Resultados Oficiais
function displayResults(result) {
  // Scorecards de BI
  document.getElementById('res-cargo-title').textContent = state.currentCargo;
  document.getElementById('res-qe').textContent = result.qe.toLocaleString('pt-BR');
  document.getElementById('res-c10').textContent = result.clause10.toLocaleString('pt-BR');
  document.getElementById('res-c20').textContent = result.clause20Cand.toLocaleString('pt-BR');
  document.getElementById('res-seats-distributed').textContent = result.seatsDistributed;
  document.getElementById('res-total-seats').textContent = result.totalSeats;

  // Quebra de vagas (QP vs Sobras)
  let totalQP = 0;
  let totalSobras = 0;
  result.partyStats.forEach(p => {
    totalQP += p.seatsByQP;
    totalSobras += (p.seatsBySobras8020 + p.seatsBySobrasGerais);
  });
  const breakdownEl = document.getElementById('res-seats-breakdown');
  if (breakdownEl) {
    breakdownEl.textContent = `${totalQP} por QP direto | ${totalSobras} por Sobras`;
  }

  // Gráfico de Barras de Business Intelligence (Composição da Bancada)
  const chartContainer = document.getElementById('bi-bancadas-chart');
  chartContainer.innerHTML = '';

  const winningParties = result.partyStats.filter(p => p.totalSeatsWon > 0)
    .sort((a, b) => b.totalSeatsWon - a.totalSeatsWon);

  if (winningParties.length === 0) {
    chartContainer.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 8px;">Nenhuma agremiação atingiu os critérios mínimos para conquistar vagas.</div>`;
  } else {
    winningParties.forEach(p => {
      const qpPercent = (p.seatsByQP / result.totalSeats) * 100;
      const sobrasPercent = ((p.seatsBySobras8020 + p.seatsBySobrasGerais) / result.totalSeats) * 100;

      const row = document.createElement('div');
      row.className = 'chart-bar-row';
      row.innerHTML = `
        <div class="chart-bar-label">
          <span style="color: #FFFFFF;">${p.name}</span>
          <span style="color: var(--primary-light);">${p.totalSeatsWon} ${p.totalSeatsWon === 1 ? 'vaga' : 'vagas'} (${p.voteSharePercent}% dos votos)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${qpPercent}%;" title="${p.seatsByQP} por QP Direto"></div>
          <div class="chart-bar-fill sobra" style="width: ${sobrasPercent}%;" title="${p.seatsBySobras8020 + p.seatsBySobrasGerais} por Sobras"></div>
        </div>
      `;
      chartContainer.appendChild(row);
    });
  }

  // Tabela Consolidada de Partidos
  const tableBody = document.querySelector('#table-party-results tbody');
  tableBody.innerHTML = '';

  result.partyStats.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.name}</strong></td>
      <td>${p.totalVotes.toLocaleString('pt-BR')}</td>
      <td>${p.voteSharePercent}%</td>
      <td>${p.qp}</td>
      <td><span class="badge badge-blue">${p.seatsByQP}</span></td>
      <td><span class="badge badge-yellow">${p.seatsBySobras8020}</span></td>
      <td><span class="badge badge-purple">${p.seatsBySobrasGerais}</span></td>
      <td><strong style="color: var(--primary-light); font-size: 0.95rem;">${p.totalSeatsWon}</strong></td>
    `;
    tableBody.appendChild(tr);
  });

  // Cards dos Eleitos
  const electedContainer = document.getElementById('elected-candidates-list');
  electedContainer.innerHTML = '';
  document.getElementById('badge-elected-count').textContent = `${result.allElected.length} Eleitos`;

  result.allElected.forEach((cand, idx) => {
    const card = document.createElement('div');
    card.className = 'elected-card';
    const badgeClass = cand.seatType === 'QP' ? 'badge-blue' : cand.seatType.includes('80/20') ? 'badge-yellow' : 'badge-purple';
    
    card.innerHTML = `
      <div class="elected-card-top" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span class="elected-name" style="font-weight: 800; font-size: 0.9rem; color: #FFFFFF;">${idx + 1}º ${cand.nome}</span>
        <span class="badge ${badgeClass}" style="font-size: 0.68rem;">${cand.seatType}</span>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between;">
        <span>${cand.groupName}</span>
        <strong style="color: var(--primary-light); font-size: 0.85rem;">${(cand.votes || 0).toLocaleString('pt-BR')} votos</strong>
      </div>
    `;
    electedContainer.appendChild(card);
  });

  // Tabela de Margem de Corte (Primeiros Suplentes das Agremiações)
  const suplentesBody = document.querySelector('#table-suplentes tbody');
  if (suplentesBody) {
    suplentesBody.innerHTML = '';
    
    const suplentesList = [];
    result.partyStats.forEach(p => {
      if (p.remainingCandidates.length > 0) {
        const firstSuplente = p.remainingCandidates[0];
        suplentesList.push({
          ...firstSuplente,
          groupName: p.name,
          partySeatsWon: p.totalSeatsWon
        });
      }
    });

    suplentesList.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    if (suplentesList.length === 0) {
      suplentesBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Sem suplentes na base.</td></tr>`;
    } else {
      suplentesList.slice(0, 10).forEach(sup => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${sup.nome}</strong></td>
          <td>${sup.groupName}</td>
          <td>${(sup.votes || 0).toLocaleString('pt-BR')}</td>
          <td><span class="badge badge-yellow" style="font-size: 0.65rem;">1º Suplente da Bancada</span></td>
        `;
        suplentesBody.appendChild(tr);
      });
    }
  }

  // Tabela de Auditoria das Sobras (Tab 3)
  const auditBody = document.querySelector('#table-audit-rounds tbody');
  if (auditBody) {
    auditBody.innerHTML = '';
    if (result.auditRounds.length === 0) {
      auditBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-muted);">Todas as vagas foram preenchidas diretamente pelo QP (sem necessidade de sobras).</td></tr>`;
    } else {
      result.auditRounds.forEach(round => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>#${round.round}</strong></td>
          <td><span class="badge ${round.phase.includes('80/20') ? 'badge-yellow' : 'badge-purple'}">${round.phase}</span></td>
          <td>${round.partyName}</td>
          <td>${round.partyVotes.toLocaleString('pt-BR')}</td>
          <td>${round.seatsBefore}</td>
          <td>${round.divisor}</td>
          <td><strong style="color: var(--primary-light);">${round.average}</strong></td>
          <td><strong>${round.candidateElected}</strong></td>
          <td>${round.candidateVotes.toLocaleString('pt-BR')}</td>
        `;
        auditBody.appendChild(tr);
      });
    }
  }
}

// Configuração do Gerenciador de Cenários
function setupScenarioActions() {
  document.getElementById('btn-save-current-scenario').addEventListener('click', () => {
    const name = prompt('Informe um nome para o cenário:', `Cenário ${state.currentCargo} - ${new Date().toLocaleDateString('pt-BR')}`);
    if (!name) return;

    scenarioManager.saveScenario({
      title: name,
      cargo: state.currentCargo,
      totalSeats: state.totalSeats,
      validVotes: state.validVotes,
      partyGroups: state.partyGroups
    });

    renderScenariosList();
    alert('Cenário salvo com sucesso!');
  });

  document.getElementById('btn-export-scenarios').addEventListener('click', () => {
    scenarioManager.exportScenariosJSON();
  });

  const importScenariosInput = document.getElementById('input-import-scenarios-file');
  document.getElementById('btn-trigger-import-scenarios').addEventListener('click', () => {
    importScenariosInput.click();
  });

  importScenariosInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      scenarioManager.importScenariosJSON(text);
      renderScenariosList();
      alert('Cenários importados com sucesso!');
    } catch (err) {
      alert('Erro ao importar cenários: ' + err.message);
    }
  });
}

function renderScenariosList() {
  const container = document.getElementById('scenarios-list');
  if (!container) return;
  const scenarios = scenarioManager.getScenarios();
  container.innerHTML = '';

  if (scenarios.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">Nenhum cenário salvo ainda.</div>`;
    return;
  }

  scenarios.forEach(sc => {
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';
    card.style.padding = '10px 14px';

    card.innerHTML = `
      <div>
        <strong style="font-size: 0.92rem; color: #FFFFFF;">${sc.title}</strong>
        <div style="font-size: 0.75rem; color: var(--text-muted);">
          ${sc.cargo} • ${sc.validVotes.toLocaleString('pt-BR')} Votos Válidos • Salvo em: ${new Date(sc.updatedAt || sc.createdAt).toLocaleString('pt-BR')}
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="btn btn-primary btn-sm btn-load-scenario" data-id="${sc.id}">Abrir</button>
        <button class="btn btn-danger btn-sm btn-del-scenario" data-id="${sc.id}">Excluir</button>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.btn-load-scenario').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const sc = scenarioManager.getScenarioById(id);
      if (sc) {
        state.currentCargo = sc.cargo;
        state.totalSeats = sc.totalSeats;
        state.validVotes = sc.validVotes;
        state.partyGroups = sc.partyGroups;

        document.getElementById('input-valid-votes').value = state.validVotes.toLocaleString('pt-BR');
        if (state.currentCargo === 'DEPUTADO ESTADUAL') {
          document.getElementById('cargo-estadual-btn').classList.add('active');
          document.getElementById('cargo-federal-btn').classList.remove('active');
        } else {
          document.getElementById('cargo-federal-btn').classList.add('active');
          document.getElementById('cargo-estadual-btn').classList.remove('active');
        }

        renderPartyChipsNav();
        renderPartyGroups();
        updateMetricsDisplay();
        document.querySelector('.nav-tab-btn[data-tab="tab-simulation"]').click();
      }
    });
  });

  container.querySelectorAll('.btn-del-scenario').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Deseja realmente excluir este cenário?')) {
        scenarioManager.deleteScenario(id);
        renderScenariosList();
      }
    });
  });
}

// Configurações ADM e Proteção por PIN
function loadAdmSettings() {
  try {
    const saved = localStorage.getItem(ADM_SETTINGS_KEY);
    if (saved) {
      state.admSettings = { ...state.admSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Erro ao ler configurações ADM:', e);
  }
}

function saveAdmSettings() {
  localStorage.setItem(ADM_SETTINGS_KEY, JSON.stringify(state.admSettings));
}

function applyCargoVisibility() {
  const btnEstadual = document.getElementById('cargo-estadual-btn');
  const btnFederal = document.getElementById('cargo-federal-btn');

  if (btnEstadual) btnEstadual.style.display = state.admSettings.showEstadual ? 'flex' : 'none';
  if (btnFederal) btnFederal.style.display = state.admSettings.showFederal ? 'flex' : 'none';

  if (!state.admSettings.showEstadual && state.currentCargo === 'DEPUTADO ESTADUAL') {
    if (state.admSettings.showFederal && btnFederal) {
      btnFederal.click();
    }
  } else if (!state.admSettings.showFederal && state.currentCargo === 'DEPUTADO FEDERAL') {
    if (state.admSettings.showEstadual && btnEstadual) {
      btnEstadual.click();
    }
  }
}

let pinCallback = null;
let currentPinMode = 'verify';

function promptPinVerification(mode, callback) {
  currentPinMode = mode;
  pinCallback = callback;

  const modal = document.getElementById('modal-pin');
  const title = document.getElementById('pin-modal-title');
  const desc = document.getElementById('pin-modal-desc');
  const errorMsg = document.getElementById('pin-error-msg');
  const digitInputs = document.querySelectorAll('.pin-digit-input');

  errorMsg.textContent = '';
  digitInputs.forEach(i => { i.value = ''; });

  if (mode === 'setup' || !state.admSettings.pinCode) {
    title.textContent = 'Definir PIN de 6 Dígitos';
    desc.textContent = 'Crie seu código PIN de segurança de 6 dígitos para o primeiro acesso:';
    currentPinMode = 'setup';
  } else if (mode === 'startup') {
    title.textContent = 'Acesso Protegido';
    desc.textContent = 'Digite seu PIN de 6 dígitos para desbloquear a plataforma:';
  } else {
    title.textContent = 'Acesso Administrativo';
    desc.textContent = 'Digite seu PIN de 6 dígitos para abrir o painel ADM:';
  }

  modal.classList.add('active');
  setTimeout(() => {
    digitInputs[0].focus();
  }, 200);
}

function setupAdmAndPinModal() {
  const btnOpenAdm = document.getElementById('btn-open-adm');
  const admModal = document.getElementById('modal-adm-panel');
  const btnCloseAdm = document.getElementById('btn-close-adm-panel');
  const btnSaveAdm = document.getElementById('btn-save-adm-settings');
  const btnChangePin = document.getElementById('btn-change-pin');

  const checkEstadual = document.getElementById('adm-toggle-estadual');
  const checkFederal = document.getElementById('adm-toggle-federal');
  const checkRequirePin = document.getElementById('adm-toggle-require-pin');

  if (btnOpenAdm) {
    btnOpenAdm.addEventListener('click', () => {
      if (!state.admSettings.pinCode) {
        promptPinVerification('setup', () => { openAdmPanel(); });
      } else {
        promptPinVerification('verify', () => { openAdmPanel(); });
      }
    });
  }

  function openAdmPanel() {
    checkEstadual.checked = state.admSettings.showEstadual;
    checkFederal.checked = state.admSettings.showFederal;
    checkRequirePin.checked = state.admSettings.requirePin;
    admModal.classList.add('active');
  }

  if (btnCloseAdm) {
    btnCloseAdm.addEventListener('click', () => {
      admModal.classList.remove('active');
    });
  }

  if (btnSaveAdm) {
    btnSaveAdm.addEventListener('click', () => {
      if (!checkEstadual.checked && !checkFederal.checked) {
        alert('Pelo menos um dos cargos deve permanecer habilitado!');
        return;
      }

      state.admSettings.showEstadual = checkEstadual.checked;
      state.admSettings.showFederal = checkFederal.checked;
      state.admSettings.requirePin = checkRequirePin.checked;

      saveAdmSettings();
      applyCargoVisibility();
      admModal.classList.remove('active');
      alert('Configurações salvas com sucesso!');
    });
  }

  if (btnChangePin) {
    btnChangePin.addEventListener('click', () => {
      admModal.classList.remove('active');
      promptPinVerification('setup', () => {
        openAdmPanel();
      });
    });
  }

  const pinInputs = document.querySelectorAll('.pin-digit-input');
  const pinModal = document.getElementById('modal-pin');
  const btnCancelPin = document.getElementById('btn-cancel-pin');
  const btnConfirmPin = document.getElementById('btn-confirm-pin');
  const pinError = document.getElementById('pin-error-msg');

  pinInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val && val.length > 0) {
        if (index < pinInputs.length - 1) {
          pinInputs[index + 1].focus();
        } else {
          btnConfirmPin.click();
        }
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        pinInputs[index - 1].focus();
      }
    });
  });

  if (btnCancelPin) {
    btnCancelPin.addEventListener('click', () => {
      pinModal.classList.remove('active');
    });
  }

  if (btnConfirmPin) {
    btnConfirmPin.addEventListener('click', () => {
      const entered = Array.from(pinInputs).map(i => i.value).join('');
      if (entered.length < 6) {
        pinError.textContent = 'Digite todos os 6 dígitos.';
        return;
      }

      if (currentPinMode === 'setup') {
        state.admSettings.pinCode = entered;
        saveAdmSettings();
        pinModal.classList.remove('active');
        alert('PIN de 6 dígitos definido com sucesso!');
        if (pinCallback) pinCallback();
      } else {
        if (entered === state.admSettings.pinCode) {
          pinModal.classList.remove('active');
          if (pinCallback) pinCallback();
        } else {
          pinError.textContent = 'PIN incorreto. Tente novamente.';
          pinInputs.forEach(i => { i.value = ''; });
          pinInputs[0].focus();
        }
      }
    });
  }
}
