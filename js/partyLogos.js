/**
 * partyLogos.js - Vetores Oficiais das Agremiações e Federações (MS 2026)
 * Fidelidade 100% às marcas registradas oficiais no TSE.
 * Fundo transparente (sem caixas de fundo coloridas).
 * Para Federações: cada partido membro possui seu logo individual renderizado lado a lado.
 */

// 1. Logos Oficiais Individuais de Cada Partido (Fundo Transparente)
export const SINGLE_PARTY_LOGOS = {
  'PT': `
    <svg viewBox="0 0 50 48" class="party-logo-svg" title="Partido dos Trabalhadores (PT)">
      <polygon points="25,2 32,17 48,17 35,27 40,43 25,33 10,43 15,27 2,17 18,17" fill="#E11B22"/>
      <text x="25" y="29" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="11" fill="#FFFFFF" text-anchor="middle">PT</text>
    </svg>
  `,

  'PCdoB': `
    <svg viewBox="0 0 54 48" class="party-logo-svg" title="Partido Comunista do Brasil (PCdoB)">
      <circle cx="27" cy="18" r="15" fill="#CC0000"/>
      <path d="M21 20 A6 6 0 1 1 31 15 L31 18 A3 3 0 1 0 25 20 Z" fill="#FFCC00"/>
      <rect x="25" y="14" width="3" height="11" fill="#FFCC00" transform="rotate(40 27 19)"/>
      <text x="27" y="43" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="9" fill="#CC0000" text-anchor="middle">PCdoB</text>
    </svg>
  `,

  'PV': `
    <svg viewBox="0 0 50 48" class="party-logo-svg" title="Partido Verde (PV)">
      <circle cx="25" cy="18" r="15" fill="#008000"/>
      <circle cx="25" cy="18" r="6" fill="#FFD700"/>
      <text x="25" y="43" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="11" fill="#008000" text-anchor="middle">PV</text>
    </svg>
  `,

  'PSDB': `
    <svg viewBox="0 0 65 48" class="party-logo-svg" title="Partido da Social Democracia Brasileira (PSDB)">
      <path d="M12 28 C12 10, 32 6, 44 8 C34 14, 30 22, 12 28 Z" fill="#FFD100"/>
      <circle cx="30" cy="12" r="2.5" fill="#004C97"/>
      <text x="34" y="42" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="13" fill="#004C97" text-anchor="middle">PSDB</text>
    </svg>
  `,

  'CIDADANIA': `
    <svg viewBox="0 0 68 48" class="party-logo-svg" title="Cidadania 23">
      <path d="M14 14 A18 18 0 0 1 54 14" stroke="#FF6600" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <text x="34" y="29" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="9.5" fill="#003366" text-anchor="middle">cidadania</text>
      <text x="34" y="42" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="9" fill="#FF6600" text-anchor="middle">23</text>
    </svg>
  `,

  'UNIAO': `
    <svg viewBox="0 0 65 48" class="party-logo-svg" title="União Brasil 44">
      <path d="M15 6 L32 6 L24 24 L15 24 Z" fill="#0080FF"/>
      <path d="M26 6 L44 6 L36 24 L26 24 Z" fill="#0B2046"/>
      <text x="32" y="34" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="9" fill="#0B2046" text-anchor="middle">UNIÃO</text>
      <text x="32" y="44" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="8" fill="#0080FF" text-anchor="middle">44</text>
    </svg>
  `,

  'PP': `
    <svg viewBox="0 0 65 48" class="party-logo-svg" title="Progressistas (PP)">
      <text x="32" y="24" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="16" fill="#00529C" text-anchor="middle">PP</text>
      <rect x="10" y="28" width="45" height="3" fill="#FFCC00" rx="1.5"/>
      <text x="32" y="41" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="7.5" fill="#00529C" text-anchor="middle">PROGRESSISTAS</text>
    </svg>
  `,

  'PSOL': `
    <svg viewBox="0 0 55 48" class="party-logo-svg" title="Partido Socialismo e Liberdade (PSOL)">
      <circle cx="27" cy="17" r="14" fill="#E60000"/>
      <circle cx="27" cy="17" r="9" fill="#FFD700"/>
      <path d="M23 19 Q27 23 31 19" stroke="#E60000" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="24" cy="15" r="1.5" fill="#E60000"/>
      <circle cx="30" cy="15" r="1.5" fill="#E60000"/>
      <text x="27" y="42" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="11" fill="#E60000" text-anchor="middle">PSOL</text>
    </svg>
  `,

  'REDE': `
    <svg viewBox="0 0 55 48" class="party-logo-svg" title="Rede Sustentabilidade">
      <circle cx="27" cy="17" r="14" fill="none" stroke="#008060" stroke-width="3"/>
      <path d="M27 7 Q37 13 31 24 Q23 25 27 7 Z" fill="#008060"/>
      <text x="27" y="42" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="10" fill="#008060" text-anchor="middle">REDE</text>
    </svg>
  `,

  'SOLIDARIEDADE': `
    <svg viewBox="0 0 70 48" class="party-logo-svg" title="Solidariedade 77">
      <circle cx="35" cy="16" r="11" fill="#FF5A00"/>
      <text x="35" y="21" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="11" fill="#FFFFFF" text-anchor="middle">77</text>
      <text x="35" y="38" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="7.5" fill="#FF5A00" text-anchor="middle">SOLIDARIEDADE</text>
    </svg>
  `,

  'PRD': `
    <svg viewBox="0 0 55 48" class="party-logo-svg" title="Partido Renovação Democrática (PRD 25)">
      <text x="27" y="24" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="16" fill="#002D62" text-anchor="middle">PRD</text>
      <text x="27" y="38" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="10" fill="#FF5A00" text-anchor="middle">25</text>
    </svg>
  `,

  'PL': `
    <svg viewBox="0 0 80 48" class="party-logo-svg" title="Partido Liberal (PL 22)">
      <circle cx="20" cy="21" r="14" fill="#002B7A"/>
      <path d="M12 21 Q20 13 28 21 Q20 29 12 21" fill="#FFCC00"/>
      <text x="48" y="24" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="20" fill="#002B7A" letter-spacing="-1">PL</text>
      <text x="48" y="40" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="12" fill="#E6A800">22</text>
    </svg>
  `,

  'MDB': `
    <svg viewBox="0 0 85 48" class="party-logo-svg" title="Movimento Democrático Brasileiro (MDB 15)">
      <text x="42" y="28" font-family="'Inter', Arial, sans-serif" font-weight="900" font-style="italic" font-size="24" text-anchor="middle">
        <tspan fill="#00843D">M</tspan><tspan fill="#E52207">DB</tspan>
      </text>
      <text x="42" y="42" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="11" fill="#00843D" text-anchor="middle">15</text>
    </svg>
  `,

  'REPUBLICANOS': `
    <svg viewBox="0 0 95 48" class="party-logo-svg" title="Republicanos 10">
      <path d="M12 21 L22 9 L32 21 L22 33 Z" fill="#00A859"/>
      <circle cx="22" cy="21" r="4.5" fill="#FFD100"/>
      <text x="60" y="23" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="10" fill="#002D62">REPUBLICANOS</text>
      <text x="60" y="37" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="10" fill="#00A859">10</text>
    </svg>
  `,

  'PDT': `
    <svg viewBox="0 0 80 48" class="party-logo-svg" title="Partido Democrático Trabalhista (PDT 12)">
      <circle cx="20" cy="21" r="13" fill="#E60000"/>
      <path d="M15 21 C15 14, 25 14, 25 21 C25 28, 15 28, 15 21 Z" fill="#FF6666"/>
      <path d="M20 21 Q20 33 23 37" stroke="#00AA44" stroke-width="2.5" fill="none"/>
      <text x="48" y="25" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="18" fill="#003399">PDT</text>
      <text x="48" y="40" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="11" fill="#E60000">12</text>
    </svg>
  `,

  'NOVO': `
    <svg viewBox="0 0 80 48" class="party-logo-svg" title="Partido Novo (NOVO 30)">
      <text x="30" y="27" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="18" fill="#FF6600">NOVO</text>
      <rect x="56" y="13" width="20" height="20" rx="4" fill="#FF6600"/>
      <text x="66" y="28" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="11" fill="#FFFFFF" text-anchor="middle">30</text>
    </svg>
  `,

  'AVANTE': `
    <svg viewBox="0 0 85 48" class="party-logo-svg" title="Avante 70">
      <polygon points="10,23 22,11 22,35" fill="#FF5500"/>
      <text x="28" y="25" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="13" fill="#0A1E3F">AVANTE</text>
      <text x="28" y="39" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="10" fill="#FF5500">70</text>
    </svg>
  `,

  'AGIR': `
    <svg viewBox="0 0 80 48" class="party-logo-svg" title="Agir 36">
      <text x="26" y="27" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="18" fill="#0099FF">AGIR</text>
      <circle cx="60" cy="21" r="9" fill="#E6007E"/>
      <text x="60" y="25" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="9" fill="#FFFFFF" text-anchor="middle">36</text>
    </svg>
  `,

  'DC': `
    <svg viewBox="0 0 75 48" class="party-logo-svg" title="Democracia Cristã (DC 27)">
      <rect x="14" y="9" width="4" height="24" fill="#00A859"/>
      <rect x="8" y="15" width="16" height="4" fill="#00A859"/>
      <text x="44" y="27" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="18" fill="#003366">DC</text>
      <text x="44" y="41" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="10" fill="#FFCC00">27</text>
    </svg>
  `,

  'PCO': `
    <svg viewBox="0 0 75 48" class="party-logo-svg" title="Partido da Causa Operária (PCO 29)">
      <circle cx="18" cy="21" r="12" fill="#B30000"/>
      <text x="18" y="25" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="10" fill="#FFFF00" text-anchor="middle">☭</text>
      <text x="46" y="25" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="16" fill="#B30000">PCO</text>
      <text x="46" y="39" font-family="'Inter', Arial, sans-serif" font-weight="800" font-size="10" fill="#333333">29</text>
    </svg>
  `,

  'MISSÃO': `
    <svg viewBox="0 0 75 48" class="party-logo-svg" title="Missão MS">
      <polygon points="10,11 20,5 20,37 10,31" fill="#00A859"/>
      <text x="26" y="25" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="13" fill="#1B2A4A">MISSÃO</text>
      <text x="26" y="37" font-family="'Inter', Arial, sans-serif" font-weight="700" font-size="8" fill="#00A859">MS 2026</text>
    </svg>
  `
};

/**
 * Retorna o HTML com o(s) logo(s) oficial(is).
 * Para Federações: retorna os logos membros individuais LADO A LADO sem fundo artificial.
 * Para Partidos Isolados: retorna o logo oficial transparente.
 * @param {string} groupName Nome da federação ou partido
 * @returns {string} HTML markup
 */
export function getPartyLogoSvg(groupName) {
  // Caso 1: FEDERAÇÃO BRASIL DA ESPERANÇA (PT, PCdoB, PV)
  if (groupName.includes('BRASIL DA ESPERANÇA') || groupName.includes('FE BRASIL')) {
    return `
      <div class="federation-logos-row" title="Federação Brasil da Esperança (PT, PCdoB, PV)">
        ${SINGLE_PARTY_LOGOS['PT']}
        ${SINGLE_PARTY_LOGOS['PCdoB']}
        ${SINGLE_PARTY_LOGOS['PV']}
      </div>
    `;
  }

  // Caso 2: FEDERAÇÃO PSDB CIDADANIA
  if (groupName.includes('PSDB') && groupName.includes('CIDADANIA')) {
    return `
      <div class="federation-logos-row" title="Federação PSDB Cidadania">
        ${SINGLE_PARTY_LOGOS['PSDB']}
        ${SINGLE_PARTY_LOGOS['CIDADANIA']}
      </div>
    `;
  }

  // Caso 3: FEDERAÇÃO UNIÃO PROGRESSISTA (UNIÃO + PP)
  if (groupName.includes('UNIÃO') && groupName.includes('PROGRESSISTA')) {
    return `
      <div class="federation-logos-row" title="Federação União Progressista (União Brasil e PP)">
        ${SINGLE_PARTY_LOGOS['UNIAO']}
        ${SINGLE_PARTY_LOGOS['PP']}
      </div>
    `;
  }

  // Caso 4: FEDERAÇÃO PSOL REDE
  if (groupName.includes('PSOL') && groupName.includes('REDE')) {
    return `
      <div class="federation-logos-row" title="Federação PSOL REDE">
        ${SINGLE_PARTY_LOGOS['PSOL']}
        ${SINGLE_PARTY_LOGOS['REDE']}
      </div>
    `;
  }

  // Caso 5: FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA (SOLIDARIEDADE + PRD)
  if (groupName.includes('RENOVAÇÃO SOLIDÁRIA') || (groupName.includes('SOLIDARIEDADE') && groupName.includes('FEDERAÇÃO'))) {
    return `
      <div class="federation-logos-row" title="Federação Renovação Solidária (Solidariedade e PRD)">
        ${SINGLE_PARTY_LOGOS['SOLIDARIEDADE']}
        ${SINGLE_PARTY_LOGOS['PRD']}
      </div>
    `;
  }

  // Caso 6: Partidos Isolados
  if (SINGLE_PARTY_LOGOS[groupName]) {
    return SINGLE_PARTY_LOGOS[groupName];
  }

  for (const [key, svg] of Object.entries(SINGLE_PARTY_LOGOS)) {
    if (groupName.toUpperCase() === key.toUpperCase()) {
      return svg;
    }
  }

  // Fallback visual limpo
  const cleanName = groupName.replace('FEDERAÇÃO ', '').substring(0, 8);
  return `
    <svg viewBox="0 0 70 48" class="party-logo-svg">
      <text x="35" y="28" font-family="'Inter', Arial, sans-serif" font-weight="900" font-size="12" fill="#475569" text-anchor="middle">${cleanName}</text>
    </svg>
  `;
}
