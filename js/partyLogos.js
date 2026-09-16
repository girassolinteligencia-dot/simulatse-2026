/**
 * partyLogos.js - Vetores Oficiais das Agremiações Partidárias e Federações (MS 2026)
 * Gráficos vetoriais SVG leves, nítidos em qualquer resolução e 100% offline.
 */

export const PARTY_LOGOS = {
  'PL': `
    <svg viewBox="0 0 100 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="50" rx="6" fill="#002B7A"/>
      <path d="M6 6 L30 6 L30 44 L6 44 Z" fill="#FFCC00" opacity="0.15"/>
      <text x="35" y="34" font-family="'Inter', sans-serif" font-weight="900" font-size="28" fill="#FFCC00" letter-spacing="-1">PL</text>
      <text x="75" y="24" font-family="'Inter', sans-serif" font-weight="800" font-size="14" fill="#FFFFFF">22</text>
      <circle cx="18" cy="25" r="8" fill="#FFCC00"/>
      <path d="M14 25 Q18 19 22 25 Q18 31 14 25" fill="#002B7A"/>
    </svg>
  `,

  'FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL': `
    <svg viewBox="0 0 120 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="50" rx="6" fill="#CC0000"/>
      <!-- Estrela PT -->
      <polygon points="20,8 24,18 34,18 26,24 29,34 20,28 11,34 14,24 6,18 16,18" fill="#FFFFFF"/>
      <text x="20" y="24" font-family="'Inter', sans-serif" font-weight="900" font-size="7" fill="#CC0000" text-anchor="middle">PT</text>
      <!-- Bloco PCdoB e PV -->
      <rect x="42" y="8" width="22" height="34" rx="4" fill="#A00000"/>
      <text x="53" y="24" font-family="'Inter', sans-serif" font-weight="900" font-size="7" fill="#FFD700" text-anchor="middle">PCdoB</text>
      <circle cx="53" cy="33" r="4" fill="#FFD700"/>
      <rect x="70" y="8" width="44" height="34" rx="4" fill="#006633"/>
      <text x="92" y="22" font-family="'Inter', sans-serif" font-weight="900" font-size="9" fill="#FFFFFF" text-anchor="middle">FE BRASIL</text>
      <text x="92" y="34" font-family="'Inter', sans-serif" font-weight="800" font-size="8" fill="#7CFF7C" text-anchor="middle">PT•PCdoB•PV</text>
    </svg>
  `,

  'FEDERAÇÃO PSDB CIDADANIA': `
    <svg viewBox="0 0 110 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="110" height="50" rx="6" fill="#004C97"/>
      <!-- Tucano Stylized -->
      <path d="M10 36 C10 16, 26 12, 34 14 C28 20, 26 28, 10 36 Z" fill="#FFD100"/>
      <circle cx="24" cy="18" r="2.5" fill="#004C97"/>
      <text x="40" y="26" font-family="'Inter', sans-serif" font-weight="900" font-size="16" fill="#FFFFFF">PSDB</text>
      <rect x="40" y="30" width="62" height="12" rx="3" fill="#FF6600"/>
      <text x="71" y="39" font-family="'Inter', sans-serif" font-weight="800" font-size="8" fill="#FFFFFF" text-anchor="middle">CIDADANIA 23</text>
    </svg>
  `,

  'FEDERAÇÃO UNIÃO PROGRESSISTA': `
    <svg viewBox="0 0 110 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="110" height="50" rx="6" fill="#0B2046"/>
      <path d="M8 8 L32 8 L24 42 L8 42 Z" fill="#0080FF"/>
      <text x="20" y="28" font-family="'Inter', sans-serif" font-weight="900" font-size="11" fill="#FFFFFF">44</text>
      <text x="36" y="22" font-family="'Inter', sans-serif" font-weight="900" font-size="11" fill="#FFFFFF">UNIÃO</text>
      <rect x="36" y="27" width="66" height="15" rx="3" fill="#00529C"/>
      <text x="69" y="38" font-family="'Inter', sans-serif" font-weight="800" font-size="9" fill="#FFCC00" text-anchor="middle">PROGRESSISTAS PP</text>
    </svg>
  `,

  'MDB': `
    <svg viewBox="0 0 100 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="50" rx="6" fill="#00843D"/>
      <polygon points="12,12 28,12 36,38 20,38" fill="#FFCC00" opacity="0.2"/>
      <text x="50" y="34" font-family="'Inter', sans-serif" font-weight="900" font-style="italic" font-size="24" fill="#FFFFFF" text-anchor="middle">
        <tspan fill="#FFFFFF">M</tspan><tspan fill="#E52207">DB</tspan>
      </text>
      <text x="82" y="18" font-family="'Inter', sans-serif" font-weight="800" font-size="10" fill="#FFCC00">15</text>
    </svg>
  `,

  'REPUBLICANOS': `
    <svg viewBox="0 0 110 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="110" height="50" rx="6" fill="#002D62"/>
      <path d="M12 25 L24 12 L36 25 L24 38 Z" fill="#00A859"/>
      <circle cx="24" cy="25" r="5" fill="#FFD100"/>
      <text x="42" y="26" font-family="'Inter', sans-serif" font-weight="900" font-size="11" fill="#FFFFFF" letter-spacing="0.5">REPUBLICANOS</text>
      <text x="42" y="38" font-family="'Inter', sans-serif" font-weight="800" font-size="10" fill="#00A859">10 • BRASIL</text>
    </svg>
  `,

  'PDT': `
    <svg viewBox="0 0 100 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="50" rx="6" fill="#003399"/>
      <!-- Rosa Vermelha estilizada -->
      <circle cx="20" cy="25" r="12" fill="#E60000"/>
      <path d="M14 25 C14 18, 26 18, 26 25 C26 32, 14 32, 14 25 Z" fill="#FF4D4D"/>
      <path d="M20 25 Q20 38 23 42" stroke="#00CC44" stroke-width="3" fill="none"/>
      <text x="40" y="32" font-family="'Inter', sans-serif" font-weight="900" font-size="20" fill="#FFFFFF">PDT</text>
      <text x="80" y="22" font-family="'Inter', sans-serif" font-weight="800" font-size="11" fill="#FFCC00">12</text>
    </svg>
  `,

  'NOVO': `
    <svg viewBox="0 0 100 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="50" rx="6" fill="#FF6600"/>
      <text x="35" y="34" font-family="'Inter', sans-serif" font-weight="900" font-size="22" fill="#FFFFFF" letter-spacing="-0.5">NOVO</text>
      <rect x="70" y="14" width="22" height="22" rx="4" fill="#FFFFFF"/>
      <text x="81" y="30" font-family="'Inter', sans-serif" font-weight="900" font-size="13" fill="#FF6600" text-anchor="middle">30</text>
    </svg>
  `,

  'FEDERAÇÃO PSOL REDE': `
    <svg viewBox="0 0 110 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="110" height="50" rx="6" fill="#FFCC00"/>
      <!-- Sol PSOL -->
      <circle cx="20" cy="25" r="10" fill="#E60000"/>
      <circle cx="20" cy="25" r="6" fill="#FFEA00"/>
      <text x="36" y="25" font-family="'Inter', sans-serif" font-weight="900" font-size="15" fill="#E60000">PSOL</text>
      <text x="36" y="38" font-family="'Inter', sans-serif" font-weight="900" font-size="10" fill="#008060">REDE 50•18</text>
      <path d="M88 18 Q100 15 96 28 Q88 32 88 18 Z" fill="#008060"/>
    </svg>
  `,

  'AVANTE': `
    <svg viewBox="0 0 100 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="50" rx="6" fill="#0A1E3F"/>
      <polygon points="10,25 24,12 24,38" fill="#FF5500"/>
      <text x="30" y="32" font-family="'Inter', sans-serif" font-weight="900" font-size="14" fill="#FFFFFF">AVANTE</text>
      <text x="80" y="24" font-family="'Inter', sans-serif" font-weight="800" font-size="10" fill="#FF5500">70</text>
    </svg>
  `,

  'AGIR': `
    <svg viewBox="0 0 100 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="50" rx="6" fill="#0099FF"/>
      <text x="32" y="33" font-family="'Inter', sans-serif" font-weight="900" font-size="20" fill="#FFFFFF">AGIR</text>
      <circle cx="78" cy="25" r="10" fill="#E6007E"/>
      <text x="78" y="29" font-family="'Inter', sans-serif" font-weight="800" font-size="10" fill="#FFFFFF" text-anchor="middle">36</text>
    </svg>
  `,

  'DC': `
    <svg viewBox="0 0 100 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="50" rx="6" fill="#003366"/>
      <!-- Cruz Estilizada -->
      <rect x="18" y="10" width="6" height="30" fill="#FFCC00"/>
      <rect x="10" y="18" width="22" height="6" fill="#FFCC00"/>
      <text x="40" y="33" font-family="'Inter', sans-serif" font-weight="900" font-size="22" fill="#FFFFFF">DC</text>
      <text x="75" y="24" font-family="'Inter', sans-serif" font-weight="800" font-size="10" fill="#FFCC00">27</text>
    </svg>
  `,

  'FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA': `
    <svg viewBox="0 0 110 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="110" height="50" rx="6" fill="#FF5A00"/>
      <circle cx="20" cy="25" r="10" fill="#FFFFFF"/>
      <text x="20" y="29" font-family="'Inter', sans-serif" font-weight="900" font-size="9" fill="#FF5A00" text-anchor="middle">77</text>
      <text x="36" y="24" font-family="'Inter', sans-serif" font-weight="900" font-size="11" fill="#FFFFFF">SOLIDARIEDADE</text>
      <rect x="36" y="29" width="64" height="13" rx="3" fill="#002D62"/>
      <text x="68" y="39" font-family="'Inter', sans-serif" font-weight="800" font-size="8" fill="#FFFFFF" text-anchor="middle">PRD 25 • FEDERAÇÃO</text>
    </svg>
  `,

  'PCO': `
    <svg viewBox="0 0 100 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="50" rx="6" fill="#B30000"/>
      <text x="36" y="33" font-family="'Inter', sans-serif" font-weight="900" font-size="22" fill="#FFFF00">PCO</text>
      <circle cx="18" cy="25" r="9" fill="#800000"/>
      <text x="18" y="28" font-family="'Inter', sans-serif" font-weight="900" font-size="8" fill="#FFFF00" text-anchor="middle">☭</text>
      <text x="78" y="24" font-family="'Inter', sans-serif" font-weight="800" font-size="10" fill="#FFFFFF">29</text>
    </svg>
  `,

  'MISSÃO': `
    <svg viewBox="0 0 100 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="50" rx="6" fill="#1B2A4A"/>
      <polygon points="12,12 24,6 24,44 12,38" fill="#00A859"/>
      <text x="32" y="32" font-family="'Inter', sans-serif" font-weight="900" font-size="14" fill="#FFFFFF">MISSÃO</text>
      <text x="32" y="42" font-family="'Inter', sans-serif" font-weight="700" font-size="8" fill="#A7F3D0">MS 2026</text>
    </svg>
  `
};

/**
 * Retorna o SVG da logo oficial do partido/federação ou um badge elegante de fallback
 * @param {string} groupName Nome da federação ou partido
 * @returns {string} SVG markup
 */
export function getPartyLogoSvg(groupName) {
  if (PARTY_LOGOS[groupName]) {
    return PARTY_LOGOS[groupName];
  }

  // Tenta correspondência aproximada
  for (const [key, svg] of Object.entries(PARTY_LOGOS)) {
    if (groupName.includes(key) || key.includes(groupName)) {
      return svg;
    }
  }

  // Fallback visual limpo
  const cleanName = groupName.replace('FEDERAÇÃO ', '').substring(0, 10);
  return `
    <svg viewBox="0 0 100 50" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="50" rx="6" fill="#E2E8F0"/>
      <text x="50" y="30" font-family="'Inter', sans-serif" font-weight="800" font-size="12" fill="#475569" text-anchor="middle">${cleanName}</text>
    </svg>
  `;
}
