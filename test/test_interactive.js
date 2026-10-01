import { ElectoralEngine } from '../js/engine/electoralRules.js';
import { InteractiveSimulator } from '../js/interactive/interactiveSimulator.js';

console.log('--- TESTE DO ALGORITMO INTERATIVO ---');

const sim = new InteractiveSimulator();
sim.validVotes = 100000;
sim.totalSeats = 8;
sim.workingGroups = [
  {
    name: 'PARTIDO A',
    candidates: [
      { nome: 'CANDIDATO A1', votes: 20000 },
      { nome: 'CANDIDATO A2', votes: 15000 },
      { nome: 'CANDIDATO A3', votes: 10000 }
    ]
  },
  {
    name: 'PARTIDO B',
    candidates: [
      { nome: 'CANDIDATO B1', votes: 25000 },
      { nome: 'CANDIDATO B2', votes: 20000 },
      { nome: 'CANDIDATO B3', votes: 10000 }
    ]
  }
];

// Soma inicial
const sumInitial = sim.workingGroups.reduce((acc, g) => acc + g.candidates.reduce((s, c) => s + c.votes, 0), 0);
console.log('Soma inicial:', sumInitial);

// Ajusta CANDIDATO A1 de 20.000 para 30.000 (+10.000 votos)
console.log('Aumentando CANDIDATO A1 de 20.000 para 30.000...');
sim.applyProportionalCompensation('PARTIDO A', 'CANDIDATO A1', 30000);

const sumAfterIncrease = sim.workingGroups.reduce((acc, g) => acc + g.candidates.reduce((s, c) => s + c.votes, 0), 0);
console.log('Soma após aumento (+10.000):', sumAfterIncrease);

if (sumAfterIncrease !== 100000) {
  console.error('ERRO: A soma não permaneceu em 100.000!');
  process.exit(1);
}

// Reduz CANDIDATO A1 para 5.000 (-25.000 votos)
console.log('Reduzindo CANDIDATO A1 de 30.000 para 5.000...');
sim.applyProportionalCompensation('PARTIDO A', 'CANDIDATO A1', 5000);

const sumAfterDecrease = sim.workingGroups.reduce((acc, g) => acc + g.candidates.reduce((s, c) => s + c.votes, 0), 0);
console.log('Soma após redução:', sumAfterDecrease);

if (sumAfterDecrease !== 100000) {
  console.error('ERRO: A soma não permaneceu em 100.000!');
  process.exit(1);
}

console.log('Estado final dos candidatos:');
sim.workingGroups.forEach(g => {
  console.log(g.name + ':');
  g.candidates.forEach(c => console.log('  ', c.nome, c.votes));
});

console.log('✅ TESTE APROVADO COM 100% DE CONSERVAÇÃO DO LIMITE DE VOTOS VÁLIDOS!');
