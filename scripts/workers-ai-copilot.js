/**
 * Cloudflare Worker: SimulaTSE Workers AI Copilot
 * Modelo padrão: @cf/meta/llama-3.1-8b-instruct
 * Função:
 * 1. Analisa os dados eleitorais em tempo real (QE, QP, Sobras, Cláusulas) e gera relatório estratégico.
 * 2. Interpreta pedidos em linguagem natural e retorna mutações precisas em JSON para preenchimento em lote no gráfico.
 */

export default {
  async fetch(request, env, ctx) {
    // Configuração de CORS
    const origin = request.headers.get('Origin') || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json; charset=utf-8'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const body = await request.json();
      const { mode, userPrompt, simulationState } = body;

      if (!simulationState) {
        return new Response(JSON.stringify({ error: 'Estado da simulação não informado' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // System Prompt com regras eleitorais oficiais brasileiras e jurisdição STF
      const systemPrompt = `Você é o Consultor e Estrategista Eleitoral IA do SimulaTSE 2026 para o estado de Mato Grosso do Sul.
Sua especialidade é o sistema proporcional de eleições brasileiras (Código Eleitoral, Resoluções do TSE e ADI 7228/STF sobre sobras).
Regras capitais:
1. Quociente Eleitoral (QE) = Votos Válidos / Total de Vagas.
2. Quociente Partidário (QP) = Votos Válidos do Partido / QE.
3. Cláusula de Barreira Individual para QP: 10% do QE.
4. Cláusula de Barreira Individual para Sobras (ADI 7228): 20% do QE para o candidato e 80% do QE para o partido na 1ª fase; após isso, todos os partidos participam pelo maior quociente médio se restarem vagas.
5. Votos de legenda entram no quociente partidário, mas não concorrem a vagas nominais.

Você responderá estritamente em formato JSON dependendo do modo solicitado:

Modo 'REPORT':
{
  "summary": "Resumo do cenário atual em 2 parágrafos executivos.",
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "risks": ["Risco de sobras 1", "Risco de suplência 2"],
  "recommendations": ["Recomendação tática 1", "Recomendação tática 2"]
}

Modo 'MUTATION':
Interprete a intenção do usuário para alterar votos ou simular cenários no gráfico.
Retorne SEMPRE um JSON válido com o campo "mutations", onde cada item tem "party", "candidate" (ou "LEGENDA"), e "newVotes":
{
  "explanation": "Explicação sucinta do que foi ajustado e o objetivo tático.",
  "mutations": [
    { "party": "NOME_DO_PARTIDO", "candidate": "NOME_DO_CANDIDATO", "newVotes": 25000 }
  ]
}
Não inclua texto explicativo fora do bloco JSON.`;

      let promptContent = '';
      if (mode === 'REPORT') {
        promptContent = `Analise este cenário da eleição para ${simulationState.cargo || 'Deputado'} (${simulationState.totalSeats} vagas, ${simulationState.validVotes} votos válidos, QE: ${simulationState.qe}):
Dados dos partidos e candidatos eleitos/suplentes:
${JSON.stringify(simulationState.summary || simulationState, null, 2)}
Gere um relatório executivo de diagnóstico partidário.`;
      } else {
        promptContent = `Pedido do usuário: "${userPrompt}"
Cenário atual do gráfico (votos dos partidos e candidatos):
${JSON.stringify(simulationState.groupsMini || simulationState, null, 2)}
Calcule e retorne a lista de mutações de votos dos candidatos correspondentes.`;
      }

      // Executa o modelo no Workers AI
      // Fallback seguro de modelo Llama 3.1
      const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: promptContent }
        ],
        temperature: 0.2,
        max_tokens: 1024
      });

      let rawText = '';
      if (typeof aiResponse === 'string') {
        rawText = aiResponse;
      } else if (aiResponse.response) {
        rawText = aiResponse.response;
      } else {
        rawText = JSON.stringify(aiResponse);
      }

      // Sanitiza JSON caso o modelo envie com blocos markdown ```json
      const cleanJson = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      let parsedJson;
      try {
        parsedJson = JSON.parse(cleanJson);
      } catch (e) {
        parsedJson = {
          raw: cleanJson,
          summary: cleanJson,
          explanation: cleanJson,
          mutations: []
        };
      }

      return new Response(JSON.stringify({ success: true, data: parsedJson }), {
        headers: corsHeaders,
        status: 200
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
