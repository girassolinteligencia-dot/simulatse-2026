/**
 * functions/api/apuracao.js
 * Cloudflare Pages Function - Proxy de Baixa Latência e Alta Confiabilidade
 * Conecta-se diretamente aos servidores oficiais de totalização do TSE.
 * 
 * Restrito exclusivamente aos cargos em disputa no Estado de Mato Grosso do Sul (MS):
 * - Deputado Estadual (c0007)
 * - Deputado Federal (c0006)
 * - Senador (c0005)
 * - Governador (c0003)
 */

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const cargo = url.searchParams.get('cargo') || 'DEPUTADO ESTADUAL';

  // Mapeamento oficial TSE para cargos proporcionais e majoritários de MS
  let codigoCargo = '0007'; // Deputado Estadual MS
  if (cargo.toUpperCase().includes('FEDERAL')) {
    codigoCargo = '0006'; // Deputado Federal MS
  } else if (cargo.toUpperCase().includes('SENAD')) {
    codigoCargo = '0005';
  } else if (cargo.toUpperCase().includes('GOV')) {
    codigoCargo = '0003';
  }

  const uf = 'ms';
  const ano = '2026';

  const candidateUrls = [
    `https://resultados.tse.jus.br/oficial/ele${ano}/atual/dados/${uf}/${uf}-c${codigoCargo}-e-u.json`,
    `https://resultados.tse.jus.br/oficial/ele${ano}/dados/${uf}/${uf}-c${codigoCargo}-e-u.json`,
    `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/eleicao/apuracao/${ano}/${uf}/${codigoCargo}`
  ];

  let tseData = null;
  let errorLog = [];

  for (const targetUrl of candidateUrls) {
    try {
      const resp = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'SimulaVagas2026-MS/LiveTSEProxy (Cloudflare Worker; girassolinteligencia.com.br)'
        },
        cf: {
          cacheTtl: 15,
          cacheEverything: true
        }
      });

      if (resp.ok) {
        tseData = await resp.json();
        break;
      } else {
        errorLog.push({ url: targetUrl, status: resp.status });
      }
    } catch (err) {
      errorLog.push({ url: targetUrl, error: err.message });
    }
  }

  const corsHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=15, stale-while-revalidate=30'
  };

  if (!tseData) {
    return new Response(JSON.stringify({
      status: 'waiting_or_not_started',
      message: 'Dados de apuração oficial do TSE para MS não iniciados ou em apuração preliminar.',
      uf: 'MS',
      cargoSolicitado: cargo,
      codigoCargo,
      horarioConsulta: new Date().toISOString(),
      debug: errorLog
    }), {
      status: 200,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({
    status: 'success',
    uf: 'MS',
    cargoSolicitado: cargo,
    codigoCargo,
    horarioConsulta: new Date().toISOString(),
    data: tseData
  }), {
    status: 200,
    headers: corsHeaders
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
