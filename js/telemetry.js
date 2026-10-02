/**
 * js/telemetry.js
 * Módulo de Telemetria e Monitoramento da Plataforma SIMULA JÁ MS
 * Monitora silenciosamente e sem atrito:
 * 1. Acessos e Tráfego (Pageviews, tempo de permanência, dispositivo)
 * 2. Estimativas Geradas (Votos simulados, quocientes, distribuição de vagas)
 * 3. Comportamento e Funil UX (Abas clicadas, exportação de arquivos, cenários salvos)
 */

class TelemetryTracker {
  constructor() {
    this.endpoint = '/api/telemetry';
    this.sessionStartTime = Date.now();
    this.hasSentPageView = false;
    this.debounceTimers = {};
  }

  /**
   * Envia evento para o backend de telemetria da Cloudflare
   * Utiliza navigator.sendBeacon para não travar a UI ou fetch assíncrono
   */
  track(eventName, eventData = {}, cargo = null) {
    try {
      const payload = {
        event: eventName,
        cargo: cargo,
        data: eventData,
        sessionDuration: Math.round((Date.now() - this.sessionStartTime) / 1000),
        screen: {
          width: window.innerWidth,
          height: window.innerHeight,
          pixelRatio: window.devicePixelRatio || 1
        },
        referrer: document.referrer || 'direct',
        clientTimestamp: Date.now()
      };

      const jsonStr = JSON.stringify(payload);

      // Tenta enviar via sendBeacon (ideal para telemetria em segundo plano)
      if (navigator.sendBeacon && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const queued = navigator.sendBeacon(this.endpoint, blob);
        if (queued) return;
      }

      // Fallback para fetch assíncrono desacoplado
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr,
        keepalive: true
      }).catch(() => {
        // Silencioso em caso de falha de conexão (sem poluir o console)
      });
    } catch (e) {
      // Falha silenciosa proposital para nunca impactar a experiência do usuário
    }
  }

  /**
   * Item 1: Rastreia visualização de página e início de sessão
   */
  trackPageView(cargo = 'DEPUTADO FEDERAL') {
    if (this.hasSentPageView) return;
    this.hasSentPageView = true;

    this.track('pageview', {
      url: window.location.href,
      path: window.location.pathname,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language || 'pt-BR',
      userAgentShort: navigator.userAgent.substring(0, 120)
    }, cargo);
  }

  /**
   * Item 2: Rastreia cálculo de simulação eleitoral (com debounce para não floodar)
   * Registra as estimativas dos partidos, QE e total de cadeiras obtidas
   */
  trackSimulation(cargo, simulationResults, validVotes) {
    if (!simulationResults || !simulationResults.partyResults) return;

    // Debounce de 3.5 segundos para só registrar após o usuário parar de digitar os votos
    if (this.debounceTimers['sim']) {
      clearTimeout(this.debounceTimers['sim']);
    }

    this.debounceTimers['sim'] = setTimeout(() => {
      try {
        const partySummary = {};
        const seatsSummary = {};

        simulationResults.partyResults.forEach(p => {
          if (p.totalVotes > 0) {
            partySummary[p.partyName] = p.totalVotes;
          }
          if (p.totalSeats > 0) {
            seatsSummary[p.partyName] = {
              total: p.totalSeats,
              qp: p.qpSeats || 0,
              sobras: (p.sobrasFase1Seats || 0) + (p.sobrasFase2Seats || 0)
            };
          }
        });

        this.track('simulation_calculated', {
          validVotes: validVotes,
          qe: simulationResults.qe,
          vagasDistribuidas: simulationResults.seatsDistributed,
          vagasTotais: simulationResults.totalSeats,
          partidosComVotos: Object.keys(partySummary).length,
          partidosEleitos: Object.keys(seatsSummary).length,
          distribuicaoVagas: seatsSummary,
          topPartidosVotos: Object.entries(partySummary)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
        }, cargo);
      } catch (err) {
        // Silencioso
      }
    }, 3500);
  }

  /**
   * Item 3: Rastreia ações de comportamento e funil UX
   */
  trackTabSwitch(fromTab, toTab) {
    this.track('tab_switched', { fromTab, toTab });
  }

  trackScenarioSaved(scenarioTitle, cargo) {
    this.track('scenario_saved', { scenarioTitle }, cargo);
  }

  trackSimtseExported(cargo) {
    this.track('simtse_exported', { format: 'simtse_encrypted' }, cargo);
  }

  trackWhatsAppShare(cargo) {
    this.track('whatsapp_shared', {}, cargo);
  }

  trackSurveyImported(candidatosCount, totalVotosImportados) {
    this.track('survey_imported', { candidatosCount, totalVotosImportados });
  }
}

export const telemetry = new TelemetryTracker();
