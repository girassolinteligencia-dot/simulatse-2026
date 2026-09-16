const fs = require('fs');

function findInFile(filePath) {
  console.log('--- Analisando arquivo:', filePath);
  if (!fs.existsSync(filePath)) {
    console.log('Arquivo não existe!');
    return;
  }
  const buf = fs.readFileSync(filePath);
  const text = new TextDecoder('iso-8859-1').decode(buf);
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(';').map(h => h.replace(/^["']|["']$/g, '').trim().toUpperCase());

  const nmCandIdx = headers.indexOf('NM_CANDIDATO');
  const nmUrnaIdx = headers.indexOf('NM_URNA_CANDIDATO');
  const cargoIdx = headers.indexOf('DS_CARGO');
  const partIdx = headers.indexOf('SG_PARTIDO');

  console.log('Total de linhas:', lines.length);
  lines.forEach((l, idx) => {
    if (l.toUpperCase().includes('MARCOS')) {
      const parts = l.split(';').map(p => p.replace(/^["']|["']$/g, '').trim());
      console.log(`[L${idx}] URNA: "${parts[nmUrnaIdx]}" | NOME: "${parts[nmCandIdx]}" | CARGO: "${parts[cargoIdx]}" | PARTIDO: "${parts[partIdx]}"`);
    }
  });
}

findInFile('C:\\Users\\paulo\\Desktop\\consulta_cand_2026_MS.csv');
findInFile('C:\\Users\\paulo\\Desktop\\consulta_cand_complementar_2026_MS.csv');
