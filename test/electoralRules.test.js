import { ElectoralEngine } from '../js/engine/electoralRules.js';
import { ElectoralValidator } from '../js/engine/validator.js';

export function runAllTests() {
  const results = [];

  function assert(name, condition, extraInfo = '') {
    results.push({
      name,
      passed: Boolean(condition),
      extraInfo
    });
  }

  // 1. TESTE DO QUOCIENTE ELEITORAL (QE)
  // Caso 1: Fração <= 0.5 (desprezar fração)
  // 100.000 / 8 = 12.500 (fração 0.0 -> 12.500)
  // 100.004 / 8 = 12.500,5 (fração 0.5 -> 12.500)
  const qe1 = ElectoralEngine.calculateQE(100004, 8);
  assert('QE: Fração <= 0.5 desprezada (100004 / 8 = 12500.5 -> 12500)', qe1 === 12500, `Obtido: ${qe1}`);

  // Caso 2: Fração > 0.5 (arredondar para cima)
  // 100.005 / 8 = 12.500,625 (fração > 0.5 -> 12.501)
  const qe2 = ElectoralEngine.calculateQE(100005, 8);
  assert('QE: Fração > 0.5 arredondada para cima (100005 / 8 = 12500.625 -> 12501)', qe2 === 12501, `Obtido: ${qe2}`);

  // 2. TESTE DO QUOCIENTE PARTIDÁRIO (QP)
  // 25.000 / 10.000 = 2.5 -> QP = 2 (desprezar fração)
  const qp1 = ElectoralEngine.calculateQP(25000, 10000);
  assert('QP: Despreza fração inteiramente (25000 / 10000 -> 2)', qp1 === 2, `Obtido: ${qp1}`);

  // 3. TESTE DA CLÁUSULA DE BARREIRA INDIVIDUAL DO QP (10% DO QE)
  const simParams = {
    validVotes: 100000,
    totalSeats: 4, // QE = 25.000 (10% = 2.500, 80% = 20.000, 20% = 5.000)
    groups: [
      {
        name: 'PARTIDO A',
        party: 'PA',
        partyVotes: 0,
        candidates: [
          { nome: 'Cand A1', votes: 15000, genero: 'MASCULINO', situacao: 'DEFERIDO' }, // >= 10%
          { nome: 'Cand A2', votes: 1000, genero: 'FEMININO', situacao: 'DEFERIDO' }    // < 10% (barrado pelo QP)
        ]
      },
      {
        name: 'PARTIDO B',
        party: 'PB',
        partyVotes: 0,
        candidates: [
          { nome: 'Cand B1', votes: 20000, genero: 'MASCULINO', situacao: 'DEFERIDO' }, // >= 10%
          { nome: 'Cand B2', votes: 10000, genero: 'FEMININO', situacao: 'DEFERIDO' }   // >= 10%
        ]
      }
    ]
  };

  const simResult = ElectoralEngine.runSimulation(simParams);
  
  // Partido A teve 16.000 votos (QP = 0)
  // Partido B teve 30.000 votos (QP = 1, Cand B1 eleito por QP)
  // Sobras distribuídas
  assert('Simulação: Conferência obrigatória de total de vagas preenchidas (4/4)', simResult.isSumValid === true, `Distribuídas: ${simResult.seatsDistributed} de ${simResult.totalSeats}`);
  assert('Simulação: Barreira 10% do QE respeitada', simResult.allElected.some(e => e.nome === 'Cand B1'), 'Cand B1 eleito');

  // 4. TESTE DE COTA DE GÊNERO (30% a 70%)
  const validGenderList = [
    { nome: 'C1', genero: 'MASCULINO' },
    { nome: 'C2', genero: 'MASCULINO' },
    { nome: 'C3', genero: 'FEMININO' } // 33.3% F -> Válido
  ];
  const invalidGenderList = [
    { nome: 'C1', genero: 'MASCULINO' },
    { nome: 'C2', genero: 'MASCULINO' },
    { nome: 'C3', genero: 'MASCULINO' },
    { nome: 'C4', genero: 'MASCULINO' } // 0% F -> Inválido
  ];

  const genderVal1 = ElectoralValidator.validateGenderQuota(validGenderList);
  const genderVal2 = ElectoralValidator.validateGenderQuota(invalidGenderList);

  assert('Validador: Cota de gênero válida (33.3% F)', genderVal1.isValid === true);
  assert('Validador: Cota de gênero detecta irregularidade (< 30% F)', genderVal2.isValid === false);

  // 5. TESTE DE LIMITE DE LISTA (25 Estadual, 9 Federal)
  const listLimitEstadual = ElectoralValidator.validateListLimit('DEPUTADO ESTADUAL', 25);
  const listLimitEstadualExceeded = ElectoralValidator.validateListLimit('DEPUTADO ESTADUAL', 26);
  assert('Validador: Limite Estadual 25 aceito', listLimitEstadual.isValid === true);
  assert('Validador: Limite Estadual > 25 rejeitado', listLimitEstadualExceeded.isValid === false);

  return results;
}
