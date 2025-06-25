// scripts/updateBettingMarkets.js
// 🎯 INICIALIZAR MERCADOS DE APUESTAS DESDE ids.json

const idsData = require('../ids.json');

// 📊 MAPEO COMPLETO DE MERCADOS BASADO EN TU ids.json
const UPDATED_BETTING_MARKETS = [
  // ═══════════════════════════════════════════════════════════════════
  // MERCADOS PRINCIPALES
  // ═══════════════════════════════════════════════════════════════════
  {
    key: '1X2',
    name: 'Match Winner',
    description: 'Resultado final del partido: Local (1), Empate (X), Visitante (2)',
    category: 'MATCH_RESULT',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    parameters: {},
    isActive: true,
    priority: 100,
    displayOrder: 1,
    isPopular: true,
    iconName: 'trophy',
    shortDescription: 'Ganador del partido'
  },
  {
    key: 'HOME_AWAY',
    name: 'Home/Away',
    description: 'Resultado sin considerar empate (solo Local o Visitante)',
    category: 'MATCH_RESULT',
    possibleOutcomes: ['HOME', 'AWAY'],
    parameters: {},
    isActive: true,
    priority: 70,
    displayOrder: 2,
    isPopular: false,
    iconName: 'swap-horizontal',
    shortDescription: 'Local o Visitante (sin empate)'
  },
  {
    key: 'DOUBLE_CHANCE',
    name: 'Double Chance',
    description: 'Apostar a dos de los tres posibles resultados',
    category: 'MATCH_RESULT',
    possibleOutcomes: ['1X', 'X2', '12'],
    parameters: {},
    isActive: true,
    priority: 85,
    displayOrder: 3,
    isPopular: true,
    iconName: 'shield-checkmark',
    shortDescription: 'Doble oportunidad'
  },

  // ═══════════════════════════════════════════════════════════════════
  // MERCADOS DE GOLES
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'OVER_UNDER_2_5',
    name: 'Goals Over/Under 2.5',
    description: 'Total de goles mayor o menor a 2.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 2.5 },
    isActive: true,
    priority: 95,
    displayOrder: 1,
    isPopular: true,
    iconName: 'football',
    shortDescription: 'Más/Menos de 2.5 goles'
  },
  {
    key: 'OVER_UNDER_1_5',
    name: 'Goals Over/Under 1.5',
    description: 'Total de goles mayor o menor a 1.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 1.5 },
    isActive: true,
    priority: 80,
    displayOrder: 2,
    isPopular: true,
    iconName: 'football',
    shortDescription: 'Más/Menos de 1.5 goles'
  },
  {
    key: 'OVER_UNDER_3_5',
    name: 'Goals Over/Under 3.5',
    description: 'Total de goles mayor o menor a 3.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 3.5 },
    isActive: true,
    priority: 75,
    displayOrder: 3,
    isPopular: false,
    iconName: 'football',
    shortDescription: 'Más/Menos de 3.5 goles'
  },
  {
    key: 'BTTS',
    name: 'Both Teams To Score',
    description: 'Ambos equipos anotan al menos un gol',
    category: 'GOALS',
    possibleOutcomes: ['YES', 'NO'],
    parameters: {},
    isActive: true,
    priority: 90,
    displayOrder: 4,
    isPopular: true,
    iconName: 'fitness',
    shortDescription: 'Ambos equipos marcan'
  },

  // ═══════════════════════════════════════════════════════════════════
  // PRIMER TIEMPO
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'HT_1X2',
    name: 'First Half Winner',
    description: 'Resultado al descanso',
    category: 'HALFTIME',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    parameters: {},
    isActive: true,
    priority: 75,
    displayOrder: 1,
    isPopular: false,
    iconName: 'time',
    shortDescription: 'Ganador 1er tiempo'
  },
  {
    key: 'HT_OVER_UNDER_1_5',
    name: 'Goals Over/Under First Half',
    description: 'Total de goles en el primer tiempo mayor o menor a 1.5',
    category: 'HALFTIME',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 1.5 },
    isActive: true,
    priority: 65,
    displayOrder: 2,
    isPopular: false,
    iconName: 'football',
    shortDescription: 'Goles 1er tiempo'
  },
  {
    key: 'HT_BTTS',
    name: 'Both Teams To Score - First Half',
    description: 'Ambos equipos anotan en el primer tiempo',
    category: 'HALFTIME',
    possibleOutcomes: ['YES', 'NO'],
    parameters: {},
    isActive: true,
    priority: 60,
    displayOrder: 3,
    isPopular: false,
    iconName: 'fitness',
    shortDescription: 'Ambos marcan 1er tiempo'
  },

  // ═══════════════════════════════════════════════════════════════════
  // SEGUNDO TIEMPO
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'SECOND_HALF_WINNER',
    name: 'Second Half Winner',
    description: 'Ganador del segundo tiempo',
    category: 'SECOND_HALF',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    parameters: {},
    isActive: true,
    priority: 60,
    displayOrder: 1,
    isPopular: false,
    iconName: 'time',
    shortDescription: 'Ganador 2do tiempo'
  },

  // ═══════════════════════════════════════════════════════════════════
  // EXACT SCORE
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'EXACT_SCORE',
    name: 'Exact Score',
    description: 'Resultado exacto del partido',
    category: 'EXACT_SCORE',
    possibleOutcomes: ['0_0', '1_0', '0_1', '1_1', '2_0', '0_2', '2_1', '1_2', '2_2', '3_0', '0_3', '3_1', '1_3', '3_2', '2_3', 'OTHER'],
    parameters: {},
    isActive: true,
    priority: 70,
    displayOrder: 1,
    isPopular: false,
    iconName: 'calculator',
    shortDescription: 'Resultado exacto'
  },

  // ═══════════════════════════════════════════════════════════════════
  // CORNERS
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'CORNERS_OVER_UNDER_8_5',
    name: 'Corners Over Under',
    description: 'Total de corners mayor o menor a 8.5',
    category: 'CORNERS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 8.5 },
    isActive: true,
    priority: 55,
    displayOrder: 1,
    isPopular: false,
    iconName: 'flag',
    shortDescription: 'Corners Over/Under 8.5'
  },
  {
    key: 'CORNERS_1X2',
    name: 'Corners 1x2',
    description: 'Qué equipo gana más corners',
    category: 'CORNERS',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    parameters: {},
    isActive: true,
    priority: 50,
    displayOrder: 2,
    isPopular: false,
    iconName: 'flag',
    shortDescription: 'Ganador de corners'
  },

  // ═══════════════════════════════════════════════════════════════════
  // CARDS
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'CARDS_OVER_UNDER_3_5',
    name: 'Cards Over/Under',
    description: 'Total de tarjetas mayor o menor a 3.5',
    category: 'CARDS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 3.5 },
    isActive: true,
    priority: 50,
    displayOrder: 1,
    isPopular: false,
    iconName: 'card',
    shortDescription: 'Tarjetas Over/Under 3.5'
  },

  // ═══════════════════════════════════════════════════════════════════
  // HANDICAPS
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'ASIAN_HANDICAP',
    name: 'Asian Handicap',
    description: 'Hándicap asiático',
    category: 'HANDICAP',
    possibleOutcomes: ['HOME', 'AWAY'],
    parameters: { handicap: 0 },
    isActive: true,
    priority: 65,
    displayOrder: 1,
    isPopular: false,
    iconName: 'scale',
    shortDescription: 'Hándicap asiático'
  },
  {
    key: 'HANDICAP_RESULT',
    name: 'Handicap Result',
    description: 'Resultado con hándicap',
    category: 'HANDICAP',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    parameters: { handicap: 0 },
    isActive: true,
    priority: 60,
    displayOrder: 2,
    isPopular: false,
    iconName: 'scale',
    shortDescription: 'Resultado con hándicap'
  },

  // ═══════════════════════════════════════════════════════════════════
  // ESPECIALES
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'ODD_EVEN',
    name: 'Odd/Even',
    description: 'Total de goles par o impar',
    category: 'SPECIALS',
    possibleOutcomes: ['ODD', 'EVEN'],
    parameters: {},
    isActive: true,
    priority: 45,
    displayOrder: 1,
    isPopular: false,
    iconName: 'calculator',
    shortDescription: 'Par/Impar'
  }
];

module.exports = {
  UPDATED_BETTING_MARKETS
};

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN PARA EJECUTAR ACTUALIZACIÓN
// ═══════════════════════════════════════════════════════════════════
async function updateBettingMarkets() {
  const { BettingMarket } = require('../src/models');
  
  try {
    console.log('🎯 Iniciando actualización de mercados de apuestas...');
    
    let created = 0;
    let updated = 0;
    
    for (const marketData of UPDATED_BETTING_MARKETS) {
      const [market, wasCreated] = await BettingMarket.findOrCreate({
        where: { key: marketData.key },
        defaults: marketData
      });

      if (wasCreated) {
        created++;
        console.log(`✅ Mercado creado: ${marketData.name}`);
      } else {
        await market.update(marketData);
        updated++;
        console.log(`🔄 Mercado actualizado: ${marketData.name}`);
      }
    }

    console.log(`\n🎉 Actualización completada:`);
    console.log(`   📝 ${created} mercados creados`);
    console.log(`   🔄 ${updated} mercados actualizados`);
    console.log(`   📊 Total: ${UPDATED_BETTING_MARKETS.length} mercados`);

    return { created, updated, total: UPDATED_BETTING_MARKETS.length };
  } catch (error) {
    console.error('❌ Error actualizando mercados:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  require('dotenv').config();
  updateBettingMarkets()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}