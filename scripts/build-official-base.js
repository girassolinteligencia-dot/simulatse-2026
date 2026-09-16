const fs = require('fs');
const path = require('path');

function parseTseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('Arquivo inexistente:', filePath);
    return [];
  }
  const buffer = fs.readFileSync(filePath);
  // Arquivos do TSE utilizam tipicamente ISO-8859-1 (Latin-1)
  const text = new TextDecoder('iso-8859-1').decode(buffer);
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim().toUpperCase());

  const idxUrna = headers.indexOf('NM_URNA_CANDIDATO');
  const idxNome = headers.indexOf('NM_CANDIDATO');
  const idxCargo = headers.indexOf('DS_CARGO');
  const idxSigla = headers.indexOf('SG_PARTIDO');
  const idxFed = headers.indexOf('NM_FEDERACAO');
  const idxGen = headers.indexOf('DS_GENERO');
  const idxSit = headers.indexOf('DS_SITUACAO_CANDIDATURA');

  console.log(`[${path.basename(filePath)}] Índices encontrados: URNA=${idxUrna}, NOME=${idxNome}, CARGO=${idxCargo}, PARTIDO=${idxSigla}`);

  const list = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse respeitando aspas
    const row = [];
    let insideQuote = false;
    let entry = '';
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === delimiter && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());

    const nomeUrna = row[idxUrna] ? row[idxUrna].replace(/^["']|["']$/g, '').trim() : '';
    const nomeCompleto = row[idxNome] ? row[idxNome].replace(/^["']|["']$/g, '').trim() : '';
    let cargo = row[idxCargo] ? row[idxCargo].replace(/^["']|["']$/g, '').trim().toUpperCase() : '';
    let partido = row[idxSigla] ? row[idxSigla].replace(/^["']|["']$/g, '').trim().toUpperCase() : 'INDEP';
    let federacao = idxFed >= 0 && row[idxFed] ? row[idxFed].replace(/^["']|["']$/g, '').trim().toUpperCase() : null;
    let genero = idxGen >= 0 && row[idxGen] ? row[idxGen].replace(/^["']|["']$/g, '').trim().toUpperCase() : 'MASCULINO';
    let situacao = idxSit >= 0 && row[idxSit] ? row[idxSit].replace(/^["']|["']$/g, '').trim().toUpperCase() : 'DEFERIDO';

    if (!cargo) continue;

    if (cargo.includes('ESTADUAL')) {
      cargo = 'DEPUTADO ESTADUAL';
    } else if (cargo.includes('FEDERAL')) {
      cargo = 'DEPUTADO FEDERAL';
    } else {
      // Ignora cargos majoritários (Governador, Senador, etc.)
      continue;
    }

    const nomeFinal = nomeUrna || nomeCompleto;
    if (!nomeFinal) continue;

    if (federacao) {
      if (federacao.includes('#NULO') || federacao.includes('SEM FEDERA') || federacao.includes('NULL') || federacao.includes('#NE')) {
        federacao = null;
      } else {
        // Corrige qualquer artefato de encoding como FEDERAO -> FEDERAÇÃO
        federacao = federacao.replace(/FEDERA..O/gi, 'FEDERAÇÃO').replace(/FEDERA+O/gi, 'FEDERAÇÃO');
      }
    }

    if (genero.startsWith('FEM') || genero.startsWith('F')) {
      genero = 'FEMININO';
    } else {
      genero = 'MASCULINO';
    }

    if (situacao.includes('#NE') || situacao.includes('#NULO') || (situacao.includes('DEFERIDO') && !situacao.includes('INDEFERIDO'))) {
      situacao = 'DEFERIDO';
    }

    list.push({
      nome: nomeFinal.toUpperCase(),
      nomeCompleto: nomeCompleto.toUpperCase(),
      cargo,
      partido,
      federacao,
      genero,
      situacao
    });
  }
  return list;
}

const list1 = parseTseCSV('C:\\Users\\paulo\\Desktop\\consulta_cand_2026_MS.csv');
const list2 = parseTseCSV('C:\\Users\\paulo\\Desktop\\consulta_cand_complementar_2026_MS.csv');

const combined = [...list1, ...list2];
const seen = new Set();
const finalCandidates = [];

combined.forEach(c => {
  const key = c.cargo + '|' + c.nome + '|' + c.partido;
  if (!seen.has(key)) {
    seen.add(key);
    finalCandidates.push({
      nome: c.nome,
      nomeCompleto: c.nomeCompleto,
      cargo: c.cargo,
      partido: c.partido,
      federacao: c.federacao,
      genero: c.genero,
      situacao: c.situacao
    });
  }
});

console.log('Total de candidaturas proporcionais oficiais consolidadas:', finalCandidates.length);

const destFile = path.join(__dirname, '..', 'data', 'candidaturas-2026-ms.json');
fs.writeFileSync(destFile, JSON.stringify(finalCandidates, null, 2), 'utf-8');
console.log('Arquivo gravado com sucesso em:', destFile);

const destJsModule = path.join(__dirname, '..', 'js', 'data', 'officialCandidatesData.js');
const jsContent = `// Base Oficial Consolidada do TSE para MS 2026 (${finalCandidates.length} candidaturas)\nexport const officialCandidates = ${JSON.stringify(finalCandidates, null, 2)};\n`;
fs.writeFileSync(destJsModule, jsContent, 'utf-8');
console.log('Módulo JS gravado com sucesso em:', destJsModule);
