/**
 * validator.js
 * Validação de conformidade legal de chapas e votos
 * 
 * Regras:
 * 1. Limite de candidatos da lista:
 *    - Deputado Estadual MS: até 25 candidatos (N vagas + 1)
 *    - Deputado Federal MS: até 9 candidatos (N vagas + 1)
 * 2. Cota de Gênero:
 *    - Mínimo de 30% e máximo de 70% para cada sexo (Art. 10, § 3º da Lei 9.504/1997)
 * 3. Validação do fechamento da soma de votos vs Votos Válidos
 */

export class ElectoralValidator {
  static getMaxCandidatesLimit(cargo) {
    if (cargo === 'DEPUTADO ESTADUAL') {
      return 25; // 24 vagas + 1
    }
    return 9; // 8 vagas + 1
  }

  /**
   * Valida cota de gênero de uma lista de candidatos de um partido/federação
   * @param {Array} candidates 
   * @returns {Object} { isValid, maleCount, femaleCount, malePercent, femalePercent, message }
   */
  static validateGenderQuota(candidates) {
    if (!candidates || candidates.length === 0) {
      return { isValid: true, maleCount: 0, femaleCount: 0, malePercent: 0, femalePercent: 0, message: 'Sem candidatos' };
    }

    const total = candidates.length;
    let maleCount = 0;
    let femaleCount = 0;

    candidates.forEach(c => {
      const g = (c.genero || '').toUpperCase();
      if (g.startsWith('FEM')) {
        femaleCount++;
      } else {
        maleCount++;
      }
    });

    const femalePercent = (femaleCount / total) * 100;
    const malePercent = (maleCount / total) * 100;

    // A regra de 30%/70% se aplica a listas com 2 ou mais candidatos
    const isValid = total < 2 || (femalePercent >= 30 && femalePercent <= 70);

    let message = 'Cota de gênero regular (30% a 70%).';
    if (!isValid) {
      if (femalePercent < 30) {
        message = `Atenção: Cota feminina abaixo do mínimo de 30% (${femalePercent.toFixed(1)}% - ${femaleCount}/${total}).`;
      } else {
        message = `Atenção: Cota masculina abaixo do mínimo de 30% (${malePercent.toFixed(1)}% - ${maleCount}/${total}).`;
      }
    }

    return {
      isValid,
      total,
      maleCount,
      femaleCount,
      malePercent: Number(malePercent.toFixed(1)),
      femalePercent: Number(femalePercent.toFixed(1)),
      message
    };
  }

  /**
   * Valida o limite de candidatos por chapa
   * @param {string} cargo 
   * @param {number} candidateCount 
   * @returns {Object}
   */
  static validateListLimit(cargo, candidateCount) {
    const maxLimit = this.getMaxCandidatesLimit(cargo);
    const isValid = candidateCount <= maxLimit;
    return {
      isValid,
      maxLimit,
      currentCount: candidateCount,
      message: isValid
        ? `Dentro do limite permitido (${candidateCount}/${maxLimit}).`
        : `Limite de candidatos excedido (${candidateCount}/${maxLimit} para ${cargo}).`
    };
  }

  /**
   * Valida se a soma dos votos informados coincide com o total de votos válidos
   * @param {number} targetValidVotes 
   * @param {Array} groups 
   * @returns {Object}
   */
  static validateVoteBalance(targetValidVotes, groups) {
    let candidateVotesSum = 0;
    let partyVotesSum = 0;

    groups.forEach(g => {
      partyVotesSum += (g.partyVotes || 0);
      (g.candidates || []).forEach(c => {
        candidateVotesSum += (c.votes || 0);
      });
    });

    const totalAllocated = candidateVotesSum + partyVotesSum;
    const difference = targetValidVotes - totalAllocated;
    const isBalanced = targetValidVotes > 0 && difference === 0;

    return {
      targetValidVotes,
      totalAllocated,
      candidateVotesSum,
      partyVotesSum,
      difference,
      isBalanced,
      status: isBalanced ? 'OK' : difference > 0 ? 'DEFICIT' : 'SURPLUS'
    };
  }
}
