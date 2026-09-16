/**
 * dataImporter.js
 * Módulo de alto nível para importação e normalização de dados em formato JSON, CSV e PARQUET
 * Suporta formatos oficiais do Repositório do TSE (consulta_cand_2026_MS.csv) e formatos simplificados.
 */

export class DataImporter {
  /**
   * Identifica e faz o parsing de arquivo enviado pelo usuário
   * @param {File} file 
   * @returns {Promise<Array>} Lista normalizada de candidatos
   */
  static async importFile(file) {
    const filename = file.name.toLowerCase();

    if (filename.endsWith('.json')) {
      return this.parseJSON(file);
    } else if (filename.endsWith('.csv') || filename.endsWith('.txt')) {
      return this.parseCSV(file);
    } else if (filename.endsWith('.parquet')) {
      return this.parseParquet(file);
    } else {
      throw new Error('Formato de arquivo não suportado. Utilize .json, .csv ou .parquet.');
    }
  }

  static async parseJSON(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const rawList = Array.isArray(parsed) ? parsed : (parsed.candidatos || parsed.data || []);
    return this.normalizeCandidates(rawList);
  }

  static async parseCSV(file) {
    // Tenta decodificar primeiro como UTF-8; se contiver caracteres inválidos, usa ISO-8859-1 (comum no TSE)
    const arrayBuffer = await file.arrayBuffer();
    let text = '';
    try {
      const decoderUtf8 = new TextDecoder('utf-8', { fatal: true });
      text = decoderUtf8.decode(arrayBuffer);
    } catch {
      const decoderLatin1 = new TextDecoder('iso-8859-1');
      text = decoderLatin1.decode(arrayBuffer);
    }

    const rows = this.csvToArray(text);
    if (rows.length < 2) {
      throw new Error('Arquivo CSV vazio ou sem cabeçalho válido.');
    }
    const headers = rows[0].map(h => h.trim().toUpperCase().replace(/["']/g, ''));
    const dataList = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] ? row[index].trim().replace(/^["']|["']$/g, '') : '';
      });
      dataList.push(obj);
    }

    return this.normalizeCandidates(dataList);
  }

  static async parseParquet(file) {
    // Leitura nativa de Parquet no browser via Apache Arrow ou hyparquet
    if (window.hyparquet && window.hyparquet.parquetRead) {
      const arrayBuffer = await file.arrayBuffer();
      let records = [];
      await window.hyparquet.parquetRead({
        file: arrayBuffer,
        onRowGroup: (rows) => {
          records = records.concat(rows);
        }
      });
      return this.normalizeCandidates(records);
    } else {
      // Fallback inteligente para Parquet / Arrow JS se biblioteca externa injetada
      throw new Error('Biblioteca Parquet sendo carregada. Tente novamente em instantes ou utilize formato .JSON / .CSV.');
    }
  }

  /**
   * Normaliza os dados provenientes de diferentes esquemas (TSE oficial ou formato simplificado)
   */
  static normalizeCandidates(rawList) {
    if (!Array.isArray(rawList) || rawList.length === 0) {
      throw new Error('Nenhum registro de candidatura encontrado no arquivo.');
    }

    return rawList.map(item => {
      // Extração resiliente de campos
      const nome = item.nome || 
                   item.NM_URNA_CANDIDATO || 
                   item.NM_CANDIDATO || 
                   item.nome_urna || 
                   item.Nome || 
                   'CANDIDATO';

      let cargo = item.cargo || 
                  item.DS_CARGO || 
                  item.cargo_disputado || 
                  item.Cargo || 
                  'DEPUTADO ESTADUAL';
      
      cargo = cargo.toUpperCase().trim();
      if (cargo.includes('ESTADUAL')) {
        cargo = 'DEPUTADO ESTADUAL';
      } else if (cargo.includes('FEDERAL')) {
        cargo = 'DEPUTADO FEDERAL';
      }

      const partido = (item.partido || 
                       item.SG_PARTIDO || 
                       item.sigla_partido || 
                       item.Partido || 
                       'INDEP').toUpperCase().trim();

      let federacao = item.federacao || 
                      item.NM_FEDERACAO || 
                      item.DS_COMPOSICAO_FEDERACAO || 
                      item.Federacao || 
                      null;
      if (federacao && (federacao === '#NULO#' || federacao === 'SEM FEDERAÇÃO' || federacao === 'null')) {
        federacao = null;
      }

      let genero = (item.genero || 
                    item.DS_GENERO || 
                    item.genero_candidato || 
                    item.Genero || 
                    'MASCULINO').toUpperCase().trim();
      if (genero.startsWith('FEM') || genero.startsWith('F')) {
        genero = 'FEMININO';
      } else {
        genero = 'MASCULINO';
      }

      let situacao = (item.situacao || 
                      item.DS_SITUACAO_CANDIDATURA || 
                      item.DS_SIT_TOT_TURNO || 
                      item.Situacao || 
                      'DEFERIDO').toUpperCase().trim();
      if (situacao.includes('DEFERIDO') && !situacao.includes('INDEFERIDO')) {
        situacao = 'DEFERIDO';
      }

      return {
        nome: nome.toUpperCase().trim(),
        cargo,
        partido,
        federacao: federacao ? federacao.toUpperCase().trim() : null,
        genero,
        situacao
      };
    });
  }

  /**
   * Parser robusto de CSV lidando com vírgulas, ponto e vírgula e aspas
   */
  static csvToArray(text) {
    const lines = text.split(/\r\n|\n|\r/);
    const delimiter = text.includes(';') ? ';' : ',';
    const result = [];

    for (let i = 0; i < lines.length; i++) {
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
      result.push(row);
    }
    return result;
  }
}
