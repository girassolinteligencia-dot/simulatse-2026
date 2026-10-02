/**
 * functions/api/telemetry.js
 * Cloudflare Pages Functions - Endpoint Serverless de Telemetria e Monitoramento
 * Recebe eventos anônimos de tráfego, estimativas eleitorais e funil de conversão UX.
 */

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json();

    // Sanitização e metadados de requisição
    const timestamp = Date.now();
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const country = request.cf?.country || request.headers.get('cf-ipcountry') || 'BR';
    const city = request.cf?.city || 'Desconhecida';
    const region = request.cf?.region || 'MS';
    const userAgent = request.headers.get('user-agent') || '';

    // Enriquecimento do registro
    const telemetryRecord = {
      id: `evt_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      dateIso: new Date(timestamp).toISOString(),
      country,
      region,
      city,
      event: payload.event || 'unknown',
      cargo: payload.cargo || null,
      data: payload.data || {},
      sessionDuration: payload.sessionDuration || 0
    };

    // 1. Se o KV SIMULATSE_TELEMETRY estiver vinculado, armazena para consulta histórica
    if (env && env.SIMULATSE_TELEMETRY) {
      const key = `telemetry:${telemetryRecord.event}:${timestamp}:${telemetryRecord.id}`;
      // TTL de 30 dias (2.592.000 segundos) para conservação eficiente
      await env.SIMULATSE_TELEMETRY.put(key, JSON.stringify(telemetryRecord), {
        expirationTtl: 2592000
      });

      // Atualiza contador incremental diário agregado
      const todayStr = new Date(timestamp).toISOString().split('T')[0];
      const statsKey = `stats_summary:${todayStr}`;
      const currentStatsRaw = await env.SIMULATSE_TELEMETRY.get(statsKey);
      let currentStats = currentStatsRaw ? JSON.parse(currentStatsRaw) : {
        date: todayStr,
        pageviews: 0,
        simulationsCalculated: 0,
        scenariosSaved: 0,
        simtseExported: 0,
        tabsSwitched: 0
      };

      if (telemetryRecord.event === 'pageview') currentStats.pageviews++;
      else if (telemetryRecord.event === 'simulation_calculated') currentStats.simulationsCalculated++;
      else if (telemetryRecord.event === 'scenario_saved') currentStats.scenariosSaved++;
      else if (telemetryRecord.event === 'simtse_exported') currentStats.simtseExported++;
      else if (telemetryRecord.event === 'tab_switched') currentStats.tabsSwitched++;

      await env.SIMULATSE_TELEMETRY.put(statsKey, JSON.stringify(currentStats), {
        expirationTtl: 7776000 // 90 dias
      });
    }

    // 2. Log estruturado no Cloudflare Pages Runtime (acessível via wrangler tail)
    console.log('[TELEMETRY_LOG]', JSON.stringify({
      evt: telemetryRecord.event,
      cargo: telemetryRecord.cargo,
      geo: `${city}, ${region} - ${country}`,
      metrics: telemetryRecord.data
    }));

    return new Response(JSON.stringify({ success: true, id: telemetryRecord.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    console.error('[TELEMETRY_ERROR]', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Suporte a OPTIONS para preflight CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
