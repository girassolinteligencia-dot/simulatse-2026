const fs = require('fs');
const path = require('path');

function parseCSV(filePath) {
  let buffer = fs.readFileSync(filePath);
  let text = '';
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch (e) {
    text = new TextDecoder('iso-8859-1').decode(buffer);
  }

  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '').toUpperCase());

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = [];
    let insideQuote = false;
    let entry = '';
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === delimiter && !insideQuote) {
        row.push(entry);
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry);

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ? row[idx].trim().replace(/^["']|["']$/g, '') : '';
    });
    records.push(obj);
  }
  return records;
}

const file1 = 'C:\\Users\\paulo\\Desktop\\consulta_cand_2026_MS.csv';
const file2 = 'C:\\Users\\paulo\\Desktop\\consulta_cand_complementar_2026_MS.csv';

let list1 = [];
let list2 = [];

if (fs.existsSync(file1)) {
  list1 = parseCSV(file1);
  console.log('Arquivo 1 carregado:', list1.length, 'registros');
} else {
  console.log('Arquivo 1 não encontrado:', file1);
}

if (fs.existsSync(file2)) {
  list2 = parseCSV(file2);
  console.log('Arquivo 2 carregado:', list2.length, 'registros');
} else {
  console.log('Arquivo 2 não encontrado:', file2);
}

const combined = [...list1, ...list2];

const normalized = [];
const seen = new Set();

combined.forEach(item => {
  let nome = item.NM_URNA_CANDIDATO || item.NM_CANDIDATO || item.nome || item.Nome;
  let cargo = item.DS_CARGO || item.cargo || item.Cargo;
  let partido = item.SG_PARTIDO || item.partido || item.Partido;
  let federacao = item.NM_FEDERACAO || item.DS_COMPOSICAO_FEDERACAO || item.federacao || null;
  let genero = item.DS_GENERO || item.genero || item.Genero || 'MASCULINO';
  let situacao = item.DS_SITUACAO_CANDIDATURA || item.situacao || item.Situacao || 'DEFERIDO';

  if (!nome || !cargo) return;

  nome = nome.toUpperCase().trim();
  cargo = cargo.toUpperCase().trim();
  if (cargo.includes('ESTADUAL')) cargo = 'DEPUTADO ESTADUAL';
  else if (cargo.includes('FEDERAL')) cargo = 'DEPUTADO FEDERAL';
  else return; // Filtra apenas Estadual e Federal

  partido = (partido || 'INDEP').toUpperCase().trim();
  
  if (federacao) {
    federacao = federacao.toUpperCase().trim();
    if (federacao.includes('#NULO') || federacao.includes('SEM FEDERA') || federacao.includes('NULL') || federacao.includes('#NE')) {
      federacao = null;
    }
  }

  genero = genero.toUpperCase().trim();
  if (genero.startsWith('FEM') || genero.startsWith('F')) genero = 'FEMININO';
  else genero = 'MASCULINO';

  situacao = situacao.toUpperCase().trim();
  if (situacao.includes('#NE') || situacao.includes('#NULO')) {
    situacao = 'DEFERIDO';
  } else if (situacao.includes('DEFERIDO') && !situacao.includes('INDEFERIDO')) {
    situacao = 'DEFERIDO';
  }

  const key = cargo + '|' + nome + '|' + partido;
  if (!seen.has(key)) {
    seen.add(key);
    normalized.push({
      nome,
      cargo,
      partido,
      federacao,
      genero,
      situacao
    });
  }
});

console.log('Total candidaturas válidas extraídas (Estadual e Federal):', normalized.length);
const destFile = path.join(__dirname, '..', 'data', 'candidaturas-2026-ms.json');
fs.writeFileSync(destFile, JSON.stringify(normalized, null, 2), 'utf-8');
console.log('Gravado com sucesso em:', destFile);
