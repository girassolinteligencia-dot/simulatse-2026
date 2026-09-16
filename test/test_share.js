import { ShareManager } from '../js/scenarios/shareManager.js';

// Mock state
const mockState = {
  currentCargo: 'DEPUTADO ESTADUAL',
  totalSeats: 24,
  validVotes: 1400000,
  partyGroups: [
    {
      name: 'PARTIDO TESTE',
      partyVotes: 1000,
      candidates: [
        { nome: 'CANDIDATO 1', numero: '10111', votes: 25000 },
        { nome: 'CANDIDATO 2', numero: '10222', votes: 15000 }
      ]
    }
  ]
};

// Test packing and encoding
const payload = ShareManager.packSimulationPayload(mockState);
console.log('Payload criado:', { cargo: payload.cargo, validVotes: payload.validVotes, expiresAt: new Date(payload.expiresAt).toISOString() });

const encoded = ShareManager.encodePayload(payload);
console.log('Base64URL encoded length:', encoded.length);

const decoded = ShareManager.decodePayload(encoded);
console.log('Decoded match cargo:', decoded.cargo === mockState.currentCargo);

const validation = ShareManager.validatePayload(decoded);
console.log('Validation (recém-gerado):', validation);

// Test expired payload
const expiredPayload = { ...payload, expiresAt: Date.now() - 1000 };
const expiredValidation = ShareManager.validatePayload(expiredPayload);
console.log('Validation (expirado após 24h):', expiredValidation);

// Test apply to state
const targetState = {
  currentCargo: 'DEPUTADO ESTADUAL',
  totalSeats: 24,
  validVotes: 0,
  partyGroups: [
    {
      name: 'PARTIDO TESTE',
      partyVotes: 0,
      candidates: [
        { nome: 'CANDIDATO 1', numero: '10111', votes: 0 },
        { nome: 'CANDIDATO 2', numero: '10222', votes: 0 }
      ]
    }
  ]
};

ShareManager.applyPayloadToState(decoded, targetState);
console.log('Applied state:', {
  validVotes: targetState.validVotes,
  partyVotes: targetState.partyGroups[0].partyVotes,
  cand1Votes: targetState.partyGroups[0].candidates[0].votes
});

if (targetState.partyGroups[0].candidates[0].votes === 25000 && expiredValidation.valid === false) {
  console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
} else {
  console.error('❌ Falha nos testes.');
  process.exit(1);
}
