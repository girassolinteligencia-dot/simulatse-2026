
// Atualiza a visão da aba de Resultados isolada e especificamente para o cargo ativo
function updateResultsViewForCurrentCargo() {
  const currentResult = state.simulationResults ? state.simulationResults[state.currentCargo] : null;
  const emptyState = document.getElementById('results-empty-state');
  const biContent = document.getElementById('results-bi-content');
  const emptyCargoName = document.getElementById('results-empty-cargo-name');

  if (emptyCargoName) {
    emptyCargoName.textContent = state.currentCargo === 'DEPUTADO ESTADUAL' ? 'Deputado Estadual' : 'Deputado Federal';
  }

  if (currentResult) {
    if (emptyState) emptyState.style.display = 'none';
    if (biContent) biContent.style.display = 'block';
    displayResults(currentResult);
  } else {
    if (biContent) biContent.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
  }
}


function getInitials(name) {
  if (!name) return 'CD';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


// ==========================================================================
// SEGURANÇA E HIGIENIZAÇÃO DE DADOS (PWA Client-Side Baseline)
// ==========================================================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Hash criptográfico para autenticação segura de PIN (SHA-256 via Web Crypto)
async function hashPin(pin) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode('simulatse_salt_2026_' + pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback caso crypto.subtle nao esteja disponivel em contexto inseguro
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      hash = ((hash << 5) - hash) + pin.charCodeAt(i);
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }
}

// ==========================================================================
// SISTEMA DE NOTIFICAÇÕES TOAST ACESSÍVEL E NÃO-BLOQUEANTE (UX Design)
// ==========================================================================
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.log('[' + type + '] ' + message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'toast-item toast-' + type;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✨';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '🛑';

  toast.innerHTML = 
    '<div style="display: flex; align-items: center; gap: 8px;">' +
      '<span style="font-size: 1.1rem; flex-shrink: 0;">' + icon + '</span>' +
      '<span>' + escapeHtml(message) + '</span>' +
    '</div>' +
    '<button class="toast-close-btn" aria-label="Fechar notificação">&times;</button>';

  const closeBtn = toast.querySelector('.toast-close-btn');
  const dismiss = () => {
    toast.classList.add('toast-closing');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 260);
  };

  if (closeBtn) closeBtn.addEventListener('click', dismiss);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}

/**
 * app.js
 * Orquestrador principal da interface, preenchimento ágil contínuo,
 * sincronização de estado, execução estrita do motor TSE e Business Intelligence.
 */

import { candidateStore } from './data/candidateStore.js';
import { scenarioManager } from './scenarios/scenarioManager.js';
import { ShareManager } from './scenarios/shareManager.js';
import { ElectoralEngine } from './engine/electoralRules.js';
import { ElectoralValidator } from './engine/validator.js';
import { getPartyLogoSvg } from './partyLogos.js';

// Estado global reativo da aplicação
const state = {
  currentCargo: 'DEPUTADO ESTADUAL', // ou 'DEPUTADO FEDERAL'
  totalSeats: 24,                    // 24 para Estadual, 8 para Federal
  validVotes: 1400000,
  partyGroups: [],                   // Agrupamentos oficiais por Partido ou Federação
  simulationResults: {
    'DEPUTADO ESTADUAL': null,
    'DEPUTADO FEDERAL': null
  },
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
            // Mantém fechado por padrão a menos que o usuário abra explicitamente
            targetGroup.isCollapsed = savedGroup.isCollapsed !== undefined ? savedGroup.isCollapsed : true;
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
  renderPartiesStatusSidebar();
  updateMetricsDisplay();
  renderScenariosList();

  // Verifica se a aplicação foi aberta via Link Codificado de Compartilhamento (#sim=...)
  checkIncomingSharedLink();
}

/**
 * Detecta e carrega simulação a partir do link codificado de 24h na URL
 */
function checkIncomingSharedLink() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('sim=')) return;

  try {
    const match = hash.match(/sim=([^&]+)/);
    if (match && match[1]) {
      const encoded = match[1];
      const payload = ShareManager.decodePayload(encoded);
      handleImportedPayload(payload, true);
      // Limpa a hash da barra de endereços para não reprocessar num reload
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  } catch (err) {
    showToast('Falha ao decodificar link de simulação: ' + err.message, 'error', 5000);
  }
}

/**
 * Processa e aplica um payload de simulação (seja via Link URL ou Arquivo .simtse)
 * Executa a checagem rigorosa de 24 horas de validade
 */
function handleImportedPayload(payload, isLink = false) {
  const validation = ShareManager.validatePayload(payload);
  if (!validation.valid) {
    showToast(validation.error, 'error', 8000);
    alert('⚠️ SIMULAÇÃO EXPIRADA OU INVÁLIDA:\n\n' + validation.error);
    return;
  }

  // Se o cargo recebido for diferente do atual, sincroniza os botões e estado
  if (state.currentCargo !== payload.cargo) {
    state.currentCargo = payload.cargo;
    state.totalSeats = payload.totalSeats || (payload.cargo === 'DEPUTADO ESTADUAL' ? 24 : 8);
    const btnEstadual = document.getElementById('cargo-estadual-btn');
    const btnFederal = document.getElementById('cargo-federal-btn');
    if (state.currentCargo === 'DEPUTADO ESTADUAL') {
      if (btnEstadual) btnEstadual.classList.add('active');
      if (btnFederal) btnFederal.classList.remove('active');
    } else {
      if (btnFederal) btnFederal.classList.add('active');
      if (btnEstadual) btnEstadual.classList.remove('active');
    }
    initPartyGroupsForCargo(state.currentCargo);
  }

  ShareManager.applyPayloadToState(payload, state);

  // Atualiza input de votos válidos
  const inputVotes = document.getElementById('input-valid-votes');
  if (inputVotes) {
    inputVotes.value = (state.validVotes || 0).toLocaleString('pt-BR');
  }

  saveDraft();
  renderPartyChipsNav();
  renderPartyGroups();
  renderPartiesStatusSidebar();
  updateMetricsDisplay();

  // Executa o cálculo automático e leva o usuário direto para a tela de Eleitos/Resultados
  executeSimulation();

  const sourceMsg = isLink ? 'Link recebido via WhatsApp' : 'Arquivo .simtse';
  showToast(`✨ Projeção carregada com sucesso (${sourceMsg})! Válida por mais ${validation.remainingHours}h.`, 'success', 6000);
}

// Navegação entre Tabs (Mobile / Desktop)
function setupNavigationTabs() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');
      if (!targetTabId) return;
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
  renderPartiesStatusSidebar();
  updateMetricsDisplay();
  updateResultsViewForCurrentCargo();
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
      const isFirst = groupsMap.size === 0;
      groupsMap.set(groupName, {
        name: groupName,
        party: c.partido,
        federacao: c.federacao || null,
        partyVotes: 0,
        candidates: [],
        isCollapsed: !isFirst
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
      statusBadge.textContent = '100%';
    } else if (balance.status === 'SURPLUS') {
      progressBar.className = 'progress-fill surplus';
      statusBadge.className = 'badge badge-red';
      statusBadge.textContent = `+${(balance.difference * -1).toLocaleString('pt-BR')}`;
    } else {
      progressBar.className = 'progress-fill';
      statusBadge.className = 'badge badge-yellow';
      statusBadge.textContent = `Faltam ${balance.difference.toLocaleString('pt-BR')}`;
    }
  }

  // Comportamento Inteligente da Barra Fixa de Cálculo (Smart Action Dock)
  const btnSmartCalc = document.getElementById('btn-run-simulation');
  const smartCalcIcon = document.getElementById('smart-calc-icon');
  const smartCalcText = document.getElementById('smart-calc-text');
  const smartCalcBadge = document.getElementById('smart-calc-badge');

  if (btnSmartCalc && smartCalcIcon && smartCalcText && smartCalcBadge) {
    if (balance.isBalanced) {
      btnSmartCalc.className = 'btn-smart-calc state-ready';
      smartCalcIcon.textContent = '✨';
      smartCalcText.textContent = 'Calcular Distribuição de Vagas';
      smartCalcBadge.textContent = 'Pronto ➔';
      btnSmartCalc.setAttribute('title', 'Votos 100% equilibrados. Clique para gerar a distribuição oficial.');
    } else if (balance.status === 'SURPLUS') {
      btnSmartCalc.className = 'btn-smart-calc state-surplus';
      smartCalcIcon.textContent = '⚠️';
      const surplus = (balance.difference * -1).toLocaleString('pt-BR');
      smartCalcText.textContent = `Excesso de ${surplus} votos (ajuste)`;
      smartCalcBadge.textContent = '+Excesso';
      btnSmartCalc.setAttribute('title', `Soma excede a meta projetada em ${surplus} votos. Reduza votos para calcular.`);
    } else {
      btnSmartCalc.className = 'btn-smart-calc state-pending';
      smartCalcIcon.textContent = '⏳';
      const remaining = balance.difference.toLocaleString('pt-BR');
      smartCalcText.textContent = `Faltam ${remaining} votos para calcular`;
      smartCalcBadge.textContent = `${percent.toFixed(0)}%`;
      btnSmartCalc.setAttribute('title', `Lançamento em andamento (${percent.toFixed(0)}%). Faltam ${remaining} votos.`);
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

  updateStatusSidebar();
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
      <div class="party-group-header" data-group-index="${groupIndex}">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <span class="party-group-chevron">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
          
          <div style="min-width: 0; flex: 1;">
            <strong style="color: var(--text-main); font-size: 0.92rem; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${group.name}</strong>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${group.candidates.length} candidatos</span>
          </div>
        </div>
        <div style="flex-shrink: 0;">
          <span id="party-total-votes-${groupIndex}" class="badge-field-fixed" style="font-size: 0.76rem; padding: 2px 8px;">
            ${totalGroupVotes.toLocaleString('pt-BR')} votos
          </span>
        </div>
      </div>

      <div class="party-group-body" id="group-body-${groupIndex}">
        
        <!-- Lista Sequencial de Candidatos -->
        <div class="candidates-list-wrapper" style="display: flex; flex-direction: column; gap: 4px;">
          ${group.candidates.map((cand, candIndex) => {
            const isNonDeferido = cand.situacao && cand.situacao !== 'DEFERIDO';
            const hasVotes = cand.votes && cand.votes > 0;
            const fotoUrl = cand.foto_url || (cand.sq ? `fotos_tse/${cand.sq}.webp` : '');
            const initials = getInitials(cand.nome);
            const numDisplay = cand.numero ? `<span class="cand-badge-number">${escapeHtml(cand.numero)}</span>` : '';

            return `
              <div class="candidate-row ${hasVotes ? 'has-votes' : ''}" id="cand-row-${groupIndex}-${candIndex}">
                <div class="candidate-avatar-col">
                  ${fotoUrl ? `
                    <img src="${fotoUrl}" alt="${escapeHtml(cand.nome)}" class="candidate-avatar-thumb" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="candidate-avatar-fallback" style="display: none;">${initials}</div>
                  ` : `
                    <div class="candidate-avatar-fallback">${initials}</div>
                  `}
                </div>
                <div class="candidate-info">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="candidate-name">${escapeHtml(cand.nome)}</span>
                    ${numDisplay}
                  </div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                    <span style="font-weight: 700; color: var(--pastel-green-text);">${escapeHtml(cand.partido)}</span>
                    ${cand.nomeCompleto && cand.nomeCompleto !== cand.nome ? `<span style="color: var(--text-dim);">• ${escapeHtml(cand.nomeCompleto)}</span>` : ''}
                    ${isNonDeferido ? `<span class="badge badge-red" style="font-size: 0.6rem; padding: 1px 4px;">${escapeHtml(cand.situacao)}</span>` : ''}
                  </div>
                </div>
                <div class="vote-input-wrapper">
                  <input type="text" inputmode="numeric" class="vote-input-field cand-vote-input ${hasVotes ? 'has-value' : ''}" 
                    data-group="${groupIndex}" data-cand="${candIndex}" 
                    value="${cand.votes ? cand.votes.toLocaleString('pt-BR') : ''}" 
                    placeholder="0">
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Linha Oficial de Votos de Legenda (Sigla) -->
        <div class="candidate-row" style="background: var(--pastel-yellow-light); border: 1.5px dashed var(--pastel-yellow-border); margin-top: 4px;">
          <div class="candidate-info">
            <span style="font-size: 0.82rem; font-weight: 800; color: var(--pastel-yellow-text);">VOTOS DE LEGENDA</span>
            <span style="font-size: 0.68rem; color: var(--text-muted);">Votos diretos no número da agremiação</span>
          </div>
          <div class="vote-input-wrapper">
            <input type="text" inputmode="numeric" class="vote-input-field party-vote-input ${group.partyVotes > 0 ? 'has-value' : ''}" 
              data-group="${groupIndex}" 
              value="${group.partyVotes ? group.partyVotes.toLocaleString('pt-BR') : ''}" 
              placeholder="0">
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
      if (rawVal > 0) {
        e.target.classList.add('has-value');
      } else {
        e.target.classList.remove('has-value');
      }
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
      
      const row = document.getElementById(`cand-row-${gIdx}-${cIdx}`);
      if (row) {
        if (rawVal > 0) {
          row.classList.add('has-votes');
          e.target.classList.add('has-value');
        } else {
          row.classList.remove('has-votes');
          e.target.classList.remove('has-value');
        }
      }

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
  const btnQuickFill = document.getElementById('btn-quick-fill');
  if (btnQuickFill) {
    btnQuickFill.addEventListener('click', () => {
      autoDistributeRealisticVotes();
    });
  }

  // Limpar votos
  const btnClearVotes = document.getElementById('btn-clear-votes');
  if (btnClearVotes) {
    btnClearVotes.addEventListener('click', () => {
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
  }

  // Botão Principal de Ação Direta
  const btnRunSim = document.getElementById('btn-run-simulation');
  if (btnRunSim) {
    btnRunSim.addEventListener('click', () => {
      executeSimulation();
    });
  }

  // Eventos de Abertura/Fechamento do Drawer de Status das Chapas
  const btnToggleSidebar = document.getElementById('btn-toggle-status-sidebar');
  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStatusSidebar();
    });
  }

  const btnFloating = document.getElementById('btn-floating-status');
  if (btnFloating) {
    btnFloating.addEventListener('click', () => toggleStatusSidebar());
  }

  const btnCloseDrawer = document.getElementById('btn-close-status-drawer');
  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener('click', () => closeStatusSidebar());
  }

  const backdrop = document.getElementById('status-drawer-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => closeStatusSidebar());
  }

  setupSurveyImporter();
}

/**
 * Renderiza a coluna/drawer lateral com cards de checklist e logos oficiais
 */
function renderPartiesStatusSidebar() {
  const listContainer = document.getElementById('drawer-parties-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  state.partyGroups.forEach((group, idx) => {
    const totalGroupVotes = (group.partyVotes || 0) + group.candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
    const filledCandsCount = group.candidates.filter(c => (c.votes || 0) > 0).length;
    const isFilled = totalGroupVotes > 0;

    const card = document.createElement('div');
    card.className = `party-status-card ${isFilled ? 'status-completed' : 'status-pending'}`;
    card.id = `status-sidebar-card-${idx}`;
    card.setAttribute('data-group-index', idx);

    card.innerHTML = `
      <div class="status-card-header">
        <strong class="status-card-name" title="${group.name}">${group.name}</strong>
        ${isFilled ? '<span class="status-card-badge badge-green" title="Com votos lançados">✓</span>' : ''}
      </div>
      <div class="status-card-logo">
        ${getPartyLogoSvg(group.name)}
      </div>
      <div class="status-card-footer">
        <span class="status-card-votes">
          <strong>${totalGroupVotes.toLocaleString('pt-BR')}</strong> votos
        </span>
        <span style="color: var(--text-muted); font-size: 0.72rem;">
          ${filledCandsCount}/${group.candidates.length} cand.
        </span>
      </div>
    `;

    card.addEventListener('click', () => {
      const partyCard = document.getElementById(`party-card-${idx}`);
      if (partyCard) {
        if (partyCard.classList.contains('collapsed')) {
          partyCard.classList.remove('collapsed');
          state.partyGroups[idx].isCollapsed = false;
        }
        // Fecha drawer no mobile para focar no partido selecionado
        if (window.innerWidth < 1024) {
          closeStatusSidebar();
        }
        partyCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = partyCard.querySelector('.cand-vote-input');
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 350);
        }
      }
    });

    listContainer.appendChild(card);
  });

  updateStatusSidebar();
}

function updateStatusSidebar() {
  let filledGroupsCount = 0;
  state.partyGroups.forEach((group, idx) => {
    const totalGroupVotes = (group.partyVotes || 0) + group.candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
    const filledCandsCount = group.candidates.filter(c => (c.votes || 0) > 0).length;
    const isFilled = totalGroupVotes > 0;
    if (isFilled) filledGroupsCount++;

    const card = document.getElementById(`status-sidebar-card-${idx}`);
    if (card) {
      card.className = `party-status-card ${isFilled ? 'status-completed' : 'status-pending'}`;
      let badge = card.querySelector('.status-card-badge');
      if (isFilled) {
        if (!badge) {
          const header = card.querySelector('.status-card-header');
          badge = document.createElement('span');
          badge.className = 'status-card-badge badge-green';
          badge.title = 'Com votos lançados';
          badge.textContent = '✓';
          header.appendChild(badge);
        }
      } else {
        if (badge) badge.remove();
      }
      const votesEl = card.querySelector('.status-card-votes');
      if (votesEl) {
        votesEl.innerHTML = `<strong>${totalGroupVotes.toLocaleString('pt-BR')}</strong> votos`;
      }
      const footerCands = card.querySelector('.status-card-footer span:last-child');
      if (footerCands) {
        footerCands.textContent = `${filledCandsCount}/${group.candidates.length} cand.`;
      }
    }
  });

  const totalGroups = state.partyGroups.length;
  const progressText = `${filledGroupsCount}/${totalGroups}`;
  
  const counterBtn = document.getElementById('sidebar-progress-counter');
  if (counterBtn) counterBtn.textContent = progressText;

  const floatingBadge = document.getElementById('floating-progress-badge');
  if (floatingBadge) {
    floatingBadge.textContent = progressText;
    floatingBadge.className = `badge ${filledGroupsCount === totalGroups && totalGroups > 0 ? 'badge-green' : 'badge-yellow'}`;
  }

  const subtitle = document.getElementById('drawer-subtitle-progress');
  if (subtitle) {
    subtitle.textContent = `${filledGroupsCount} de ${totalGroups} com votos lançados`;
  }

  const drawerProgress = document.getElementById('drawer-progress-fill');
  if (drawerProgress) {
    const pct = totalGroups > 0 ? (filledGroupsCount / totalGroups) * 100 : 0;
    drawerProgress.style.width = `${pct}%`;
  }
}

function openStatusSidebar() {
  const drawer = document.getElementById('parties-status-drawer');
  const backdrop = document.getElementById('status-drawer-backdrop');
  const btnToggleSidebar = document.getElementById('btn-toggle-status-sidebar');
  if (drawer && backdrop) {
    drawer.classList.add('active');
    backdrop.classList.add('active');
    if (btnToggleSidebar) btnToggleSidebar.classList.add('active');
    updateStatusSidebar();
  }
}

function closeStatusSidebar() {
  const drawer = document.getElementById('parties-status-drawer');
  const backdrop = document.getElementById('status-drawer-backdrop');
  const btnToggleSidebar = document.getElementById('btn-toggle-status-sidebar');
  if (drawer && backdrop) {
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
    if (btnToggleSidebar) btnToggleSidebar.classList.remove('active');
  }
}

function toggleStatusSidebar() {
  const drawer = document.getElementById('parties-status-drawer');
  if (drawer && drawer.classList.contains('active')) {
    closeStatusSidebar();
  } else {
    openStatusSidebar();
  }
}

/**
 * Módulo Discreto de Importação e Parsing de Pesquisas Eleitorais
 */
function setupSurveyImporter() {
  const toggleBtn = document.getElementById('btn-toggle-survey-importer');
  const body = document.getElementById('survey-importer-adm-body');
  const textarea = document.getElementById('textarea-survey-input');
  const btnProcess = document.getElementById('btn-process-survey');
  const feedback = document.getElementById('survey-feedback-msg');
  const fileInput = document.getElementById('file-survey-input');
  const btnTriggerFile = document.getElementById('btn-trigger-survey-file');

  if (!toggleBtn || !body) return;

  toggleBtn.addEventListener('click', () => {
    const isHidden = body.style.display === 'none' || !body.style.display;
    body.style.display = isHidden ? 'flex' : 'none';
    toggleBtn.textContent = isHidden ? 'Fechar Importador' : 'Abrir Importador';
  });

  if (btnTriggerFile && fileInput) {
    btnTriggerFile.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const content = await file.text();
        textarea.value = content;
        processSurveyInput(content);
      } catch (err) {
        feedback.style.color = 'var(--accent-red)';
        feedback.textContent = `Erro ao ler arquivo: ${err.message}`;
      }
    });
  }

  if (btnProcess) {
    btnProcess.addEventListener('click', () => {
      const content = textarea.value.trim();
      if (!content) {
        feedback.style.color = 'var(--accent-red)';
        feedback.textContent = 'Cole os dados da pesquisa ou selecione um arquivo primeiro.';
        return;
      }
      processSurveyInput(content);
    });
  }

  function processSurveyInput(text) {
    feedback.style.color = 'var(--primary-light)';
    feedback.textContent = 'Processando dados da pesquisa...';

    try {
      // 1. Tenta interpretar como JSON
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          const parsedJson = JSON.parse(text);
          applySurveyJson(parsedJson);
          return;
        } catch (e) {}
      }

      // 2. Parser textual linha por linha (percentuais ou votos absolutos)
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      let matchedCount = 0;
      const targetValidVotes = state.validVotes;

      lines.forEach(line => {
        // Padrões como: "Nome: 15,5%", "Nome - 12%", "Nome: 45.000", "Nome 45000"
        const percentMatch = line.match(/([a-zA-ZÀ-ÿ\s\.\-]{3,})[:\-\t,]+([0-9]+[.,]?[0-9]*)\s*%/);
        const absoluteMatch = line.match(/([a-zA-ZÀ-ÿ\s\.\-]{3,})[:\-\t,]+([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,})/);

        if (percentMatch) {
          const rawName = percentMatch[1].trim();
          const percentVal = parseFloat(percentMatch[2].replace(',', '.'));
          if (!isNaN(percentVal) && percentVal > 0) {
            const calculatedVotes = Math.round((percentVal / 100) * targetValidVotes);
            if (assignVotesToCandidateOrParty(rawName, calculatedVotes)) {
              matchedCount++;
            }
          }
        } else if (absoluteMatch) {
          const rawName = absoluteMatch[1].trim();
          const votesVal = parseNumberFromMask(absoluteMatch[2]);
          if (votesVal > 0) {
            if (assignVotesToCandidateOrParty(rawName, votesVal)) {
              matchedCount++;
            }
          }
        }
      });

      if (matchedCount > 0) {
        saveDraft();
        renderPartyGroups();
        updateMetricsDisplay();
        feedback.style.color = 'var(--accent-green)';
        feedback.textContent = `Sucesso! ${matchedCount} candidatos/partidos identificados e atualizados na base oficial.`;
      } else {
        feedback.style.color = 'var(--accent-yellow)';
        feedback.textContent = 'Não foi possível associar automaticamente os nomes às candidaturas oficiais de MS. Verifique a grafia dos nomes.';
      }

    } catch (err) {
      feedback.style.color = 'var(--accent-red)';
      feedback.textContent = `Erro ao processar: ${err.message}`;
    }
  }

  function applySurveyJson(data) {
    const list = Array.isArray(data) ? data : data.candidatos || data.pesquisa || [];
    let matched = 0;
    list.forEach(item => {
      const name = item.nome || item.candidato || item.name;
      let votes = item.votos || item.votes;
      if (item.percentual || item.percent) {
        const pct = parseFloat((item.percentual || item.percent).toString().replace(',', '.'));
        votes = Math.round((pct / 100) * state.validVotes);
      }
      if (name && votes) {
        if (assignVotesToCandidateOrParty(name, parseNumberFromMask(votes))) {
          matched++;
        }
      }
    });

    if (matched > 0) {
      saveDraft();
      renderPartyGroups();
      updateMetricsDisplay();
      feedback.style.color = 'var(--accent-green)';
      feedback.textContent = `JSON processado: ${matched} registros importados com sucesso!`;
    }
  }

  function assignVotesToCandidateOrParty(searchName, votes) {
    const normSearch = candidateStore.constructor.normalizeText(searchName);
    
    // Procura nos candidatos dos grupos carregados
    for (const group of state.partyGroups) {
      for (const cand of group.candidates) {
        const normNome = candidateStore.constructor.normalizeText(cand.nome);
        const normCompleto = candidateStore.constructor.normalizeText(cand.nomeCompleto || '');
        if (normNome === normSearch || normNome.includes(normSearch) || normSearch.includes(normNome) || (normCompleto && normCompleto.includes(normSearch))) {
          cand.votes = votes;
          return true;
        }
      }
      // Se coincidir com o partido ou federação direta (votos de legenda)
      const normGroup = candidateStore.constructor.normalizeText(group.name);
      if (normGroup === normSearch || normGroup.includes(normSearch)) {
        group.partyVotes = votes;
        return true;
      }
    }
    return false;
  }
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
      showToast(`⏳ Lançamento incompleto: ainda faltam ${balance.difference.toLocaleString('pt-BR')} votos a lançar para atingir os 100% projetados.`, 'warning', 4500);
      const diffEl = document.getElementById('display-vote-diff');
      if (diffEl) {
        diffEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      const surplus = (balance.difference * -1).toLocaleString('pt-BR');
      showToast(`⚠️ Atenção: a soma dos votos ultrapassou a meta em ${surplus} votos. Reduza o valor nos candidatos antes de calcular.`, 'error', 4500);
      const diffEl = document.getElementById('display-vote-diff');
      if (diffEl) {
        diffEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    return;
  }

  const result = ElectoralEngine.runSimulation({
    validVotes: state.validVotes,
    totalSeats: state.totalSeats,
    groups: state.partyGroups
  });

  if (!state.simulationResults) {
    state.simulationResults = {};
  }
  state.simulationResults[state.currentCargo] = result;
  state.lastSimulationResult = result;
  updateResultsViewForCurrentCargo();

  showToast('✨ Distribuição oficial de vagas calculada com sucesso!', 'success');

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
          <span style="color: var(--text-main); font-weight: 700;">${p.name}</span>
          <span style="color: var(--primary-light); font-weight: 700;">${p.totalSeatsWon} ${p.totalSeatsWon === 1 ? 'vaga' : 'vagas'} (${p.voteSharePercent}%)</span>
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
        <span class="elected-name" style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">${idx + 1}º ${cand.nome}</span>
        <span class="badge ${badgeClass}" style="font-size: 0.68rem;">${cand.seatType}</span>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between;">
        <span>${cand.groupName}</span>
        <strong style="color: var(--text-main); font-size: 0.85rem;">${(cand.votes || 0).toLocaleString('pt-BR')} votos</strong>
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
    showToast('Cenário salvo com sucesso!', 'success');
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
      showToast('Cenários importados com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao importar cenários: ' + err.message, 'error');
    }
  });

  // =========================================================================
  // COMPARTILHAMENTO EXCLUSIVO VIA WHATSAPP / LINK 24H / ARQUIVO .SIMTSE
  // =========================================================================
  const btnShareWhatsApp = document.getElementById('btn-share-whatsapp');
  if (btnShareWhatsApp) {
    btnShareWhatsApp.addEventListener('click', () => {
      const currentRes = state.simulationResults ? state.simulationResults[state.currentCargo] : null;
      ShareManager.shareViaWhatsApp(state, currentRes);
      showToast('Abrindo WhatsApp para envio da simulação...', 'success');
    });
  }

  const btnCopyShareLink = document.getElementById('btn-copy-share-link');
  if (btnCopyShareLink) {
    btnCopyShareLink.addEventListener('click', async () => {
      try {
        const shareUrl = ShareManager.generateShareableUrl(state);
        await navigator.clipboard.writeText(shareUrl);
        showToast('🔗 Link codificado copiado! Válido por 24 horas.', 'success');
      } catch (err) {
        // Fallback caso clipboard API falhe
        const shareUrl = ShareManager.generateShareableUrl(state);
        prompt('Copie o link seguro abaixo (Válido por 24h):', shareUrl);
      }
    });
  }

  const btnExportSimtse = document.getElementById('btn-export-simtse');
  if (btnExportSimtse) {
    btnExportSimtse.addEventListener('click', () => {
      ShareManager.exportSimtseFile(state);
      showToast('Arquivo .simtse baixado! Envie pelo WhatsApp para outro usuário do SimulaTSE.', 'success');
    });
  }

  // Importação de arquivo .simtse recebido via WhatsApp
  const inputLoadSimtse = document.getElementById('input-load-simtse-file');
  const btnTriggerLoadSimtse = document.getElementById('btn-trigger-load-simtse');
  if (btnTriggerLoadSimtse && inputLoadSimtse) {
    btnTriggerLoadSimtse.addEventListener('click', () => {
      inputLoadSimtse.click();
    });

    inputLoadSimtse.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        handleImportedPayload(payload);
        inputLoadSimtse.value = '';
      } catch (err) {
        showToast('Falha ao ler arquivo .simtse: ' + err.message, 'error');
      }
    });
  }
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
        showToast('Pelo menos um dos cargos deve permanecer habilitado!', 'warning');
        return;
      }

      state.admSettings.showEstadual = checkEstadual.checked;
      state.admSettings.showFederal = checkFederal.checked;
      state.admSettings.requirePin = checkRequirePin.checked;

      saveAdmSettings();
      applyCargoVisibility();
      admModal.classList.remove('active');
      showToast('Configurações salvas com sucesso!', 'success');
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
        hashPin(entered).then(hash => {
          state.admSettings.pinHash = hash;
          delete state.admSettings.pinCode;
          saveAdmSettings();
          pinModal.classList.remove('active');
          showToast('PIN de segurança definido com sucesso!', 'success');
          if (pinCallback) pinCallback();
        });
      } else {
        hashPin(entered).then(hash => {
          const isValid = (state.admSettings.pinHash && state.admSettings.pinHash === hash) ||
                          (state.admSettings.pinCode && state.admSettings.pinCode === entered);
          if (isValid) {
            if (!state.admSettings.pinHash) {
              state.admSettings.pinHash = hash;
              delete state.admSettings.pinCode;
              saveAdmSettings();
            }
            pinModal.classList.remove('active');
            if (pinCallback) pinCallback();
          } else {
            pinError.textContent = 'PIN incorreto. Tente novamente.';
            pinInputs.forEach(i => { i.value = ''; });
            pinInputs[0].focus();
          }
        });
      }
    });
  }
}
