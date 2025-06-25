// 📄 updateBettingMarkets.js - SCRIPT PARA ACTUALIZAR MERCADOS DE APUESTAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const { BettingMarket } = require('./src/models');

const UPDATED_BETTING_MARKETS = [
  // ═══════════════════════════════════════════════════════════════════
  // MERCADOS PRINCIPALES - RESULTADO
  // ═══════════════════════════════════════════════════════════════════
  {
    key: '1X2',
    name: 'Match Winner',
    description: 'Predicción del ganador del partido (Local, Empate, Visitante)',
    category: 'MATCH_RESULT',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    priority: 100,
    displayOrder: 1,
    isPopular: true,
    iconName: 'trophy',
    shortDescription: 'Ganador del partido'
  },
  {
    key: 'DOUBLE_CHANCE',
    name: 'Double Chance',
    description: 'Dos de tres posibles resultados (1X, X2, 12)',
    category: 'MATCH_RESULT',
    possibleOutcomes: ['1X', 'X2', '12'],
    priority: 80,
    displayOrder: 2,
    isPopular: true,
    iconName: 'shield',
    shortDescription: 'Doble oportunidad'
  },

  // ═══════════════════════════════════════════════════════════════════
  // MERCADOS DE GOLES - TIEMPO COMPLETO
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'OVER_UNDER_2_5',
    name: 'Over/Under 2.5 Goals',
    description: 'Total de goles mayor o menor a 2.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 2.5 },
    priority: 95,
    displayOrder: 1,
    isPopular: true,
    iconName: 'target',
    shortDescription: 'Más/Menos de 2.5 goles'
  },
  {
    key: 'BTTS',
    name: 'Both Teams To Score',
    description: 'Ambos equipos anotan al menos un gol',
    category: 'GOALS',
    possibleOutcomes: ['YES', 'NO'],
    priority: 90,
    displayOrder: 2,
    isPopular: true,
    iconName: 'goal',
    shortDescription: 'Ambos equipos marcan'
  },
  {
    key: 'OVER_UNDER_1_5',
    name: 'Over/Under 1.5 Goals',
    description: 'Total de goles mayor o menor a 1.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 1.5 },
    priority: 75,
    displayOrder: 3,
    isPopular: false,
    iconName: 'target',
    shortDescription: 'Más/Menos de 1.5 goles'
  },
  {
    key: 'OVER_UNDER_0_5',
    name: 'Over/Under 0.5 Goals',
    description: 'Total de goles mayor o menor a 0.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 0.5 },
    priority: 60,
    displayOrder: 4,
    isPopular: false,
    iconName: 'target',
    shortDescription: 'Más/Menos de 0.5 goles'
  },
  {
    key: 'OVER_UNDER_3_5',
    name: 'Over/Under 3.5 Goals',
    description: 'Total de goles mayor o menor a 3.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 3.5 },
    priority: 70,
    displayOrder: 5,
    isPopular: false,
    iconName: 'target',
    shortDescription: 'Más/Menos de 3.5 goles'
  },
  {
    key: 'OVER_UNDER_4_5',
    name: 'Over/Under 4.5 Goals',
    description: 'Total de goles mayor o menor a 4.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 4.5 },
    priority: 50,
    displayOrder: 6,
    isPopular: false,
    iconName: 'target',
    shortDescription: 'Más/Menos de 4.5 goles'
  },
  {
    key: 'OVER_UNDER_5_5',
    name: 'Over/Under 5.5 Goals',
    description: 'Total de goles mayor o menor a 5.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 5.5 },
    priority: 40,
    displayOrder: 7,
    isPopular: false,
    iconName: 'target',
    shortDescription: 'Más/Menos de 5.5 goles'
  },

  // ═══════════════════════════════════════════════════════════════════
  // EXACT SCORE (Resultado Exacto)
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'EXACT_SCORE',
    name: 'Exact Score',
    description: 'Predicción del resultado exacto del partido',
    category: 'EXACT_SCORE',
    possibleOutcomes: ['0_0', '1_0', '0_1', '1_1', '2_0', '0_2', '2_1', '1_2', '2_2', '3_0', '0_3', '3_1', '1_3', '3_2', '2_3', '3_3', '4_0', '0_4', '4_1', '1_4', '4_2', '2_4', '4_3', '3_4', '4_4', 'OTHER'],
    priority: 65,
    displayOrder: 1,
    isPopular: true,
    iconName: 'bullseye',
    shortDescription: 'Resultado exacto'
  },

  // ═══════════════════════════════════════════════════════════════════
  // PRIMER TIEMPO (HALFTIME)
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'HT_1X2',
    name: 'Halftime Result',
    description: 'Resultado al medio tiempo',
    category: 'HALFTIME',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    priority: 85,
    displayOrder: 1,
    isPopular: true,
    iconName: 'clock',
    shortDescription: 'Resultado primer tiempo'
  },
  {
    key: 'HT_DOUBLE_CHANCE',
    name: 'Halftime Double Chance',
    description: 'Doble oportunidad en el primer tiempo',
    category: 'HALFTIME',
    possibleOutcomes: ['1X', 'X2', '12'],
    priority: 60,
    displayOrder: 2,
    isPopular: false,
    iconName: 'clock',
    shortDescription: 'Doble oportunidad PT'
  },
  {
    key: 'HT_OVER_UNDER_0_5',
    name: 'Halftime Over/Under 0.5',
    description: 'Goles en primer tiempo mayor o menor a 0.5',
    category: 'HALFTIME',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 0.5 },
    priority: 70,
    displayOrder: 3,
    isPopular: false,
    iconName: 'clock',
    shortDescription: 'PT Más/Menos 0.5 goles'
  },
  {
    key: 'HT_OVER_UNDER_1_5',
    name: 'Halftime Over/Under 1.5',
    description: 'Goles en primer tiempo mayor o menor a 1.5',
    category: 'HALFTIME',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 1.5 },
    priority: 65,
    displayOrder: 4,
    isPopular: false,
    iconName: 'clock',
    shortDescription: 'PT Más/Menos 1.5 goles'
  },
  {
    key: 'HT_BTTS',
    name: 'Halftime Both Teams To Score',
    description: 'Ambos equipos marcan en primer tiempo',
    category: 'HALFTIME',
    possibleOutcomes: ['YES', 'NO'],
    priority: 55,
    displayOrder: 5,
    isPopular: false,
    iconName: 'clock',
    shortDescription: 'PT Ambos marcan'
  },
  {
    key: 'HT_EXACT_SCORE',
    name: 'Halftime Exact Score',
    description: 'Resultado exacto del primer tiempo',
    category: 'HALFTIME',
    possibleOutcomes: ['0_0', '1_0', '0_1', '1_1', '2_0', '0_2', '2_1', '1_2', '2_2', 'OTHER'],
    priority: 45,
    displayOrder: 6,
    isPopular: false,
    iconName: 'clock',
    shortDescription: 'PT Resultado exacto'
  },

  // ═══════════════════════════════════════════════════════════════════
  // SEGUNDO TIEMPO
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'ST_1X2',
    name: 'Second Half Winner',
    description: 'Ganador del segundo tiempo',
    category: 'SECOND_HALF',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    priority: 50,
    displayOrder: 1,
    isPopular: false,
    iconName: 'clock-end',
    shortDescription: 'Ganador segundo tiempo'
  },
  {
    key: 'ST_OVER_UNDER_0_5',
    name: 'Second Half Over/Under 0.5',
    description: 'Goles en segundo tiempo mayor o menor a 0.5',
    category: 'SECOND_HALF',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 0.5 },
    priority: 45,
    displayOrder: 2,
    isPopular: false,
    iconName: 'clock-end',
    shortDescription: 'ST Más/Menos 0.5 goles'
  },
  {
    key: 'ST_OVER_UNDER_1_5',
    name: 'Second Half Over/Under 1.5',
    description: 'Goles en segundo tiempo mayor o menor a 1.5',
    category: 'SECOND_HALF',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 1.5 },
    priority: 40,
    displayOrder: 3,
    isPopular: false,
    iconName: 'clock-end',
    shortDescription: 'ST Más/Menos 1.5 goles'
  },
  {
    key: 'ST_BTTS',
    name: 'Second Half Both Teams To Score',
    description: 'Ambos equipos marcan en segundo tiempo',
    category: 'SECOND_HALF',
    possibleOutcomes: ['YES', 'NO'],
    priority: 35,
    displayOrder: 4,
    isPopular: false,
    iconName: 'clock-end',
    shortDescription: 'ST Ambos marcan'
  },

  // ═══════════════════════════════════════════════════════════════════
  // CORNERS (Esquinas)
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'CORNERS_OVER_UNDER_9_5',
    name: 'Corners Over/Under 9.5',
    description: 'Total de esquinas mayor o menor a 9.5',
    category: 'CORNERS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 9.5 },
    priority: 55,
    displayOrder: 1,
    isPopular: true,
    iconName: 'corner-flag',
    shortDescription: 'Esquinas Más/Menos 9.5'
  },
  {
    key: 'CORNERS_OVER_UNDER_8_5',
    name: 'Corners Over/Under 8.5',
    description: 'Total de esquinas mayor o menor a 8.5',
    category: 'CORNERS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 8.5 },
    priority: 50,
    displayOrder: 2,
    isPopular: false,
    iconName: 'corner-flag',
    shortDescription: 'Esquinas Más/Menos 8.5'
  },
  {
    key: 'CORNERS_OVER_UNDER_10_5',
    name: 'Corners Over/Under 10.5',
    description: 'Total de esquinas mayor o menor a 10.5',
    category: 'CORNERS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 10.5 },
    priority: 45,
    displayOrder: 3,
    isPopular: false,
    iconName: 'corner-flag',
    shortDescription: 'Esquinas Más/Menos 10.5'
  },
  {
    key: 'CORNERS_OVER_UNDER_7_5',
    name: 'Corners Over/Under 7.5',
    description: 'Total de esquinas mayor o menor a 7.5',
    category: 'CORNERS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 7.5 },
    priority: 40,
    displayOrder: 4,
    isPopular: false,
    iconName: 'corner-flag',
    shortDescription: 'Esquinas Más/Menos 7.5'
  },
  {
    key: 'CORNERS_OVER_UNDER_11_5',
    name: 'Corners Over/Under 11.5',
    description: 'Total de esquinas mayor o menor a 11.5',
    category: 'CORNERS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 11.5 },
    priority: 35,
    displayOrder: 5,
    isPopular: false,
    iconName: 'corner-flag',
    shortDescription: 'Esquinas Más/Menos 11.5'
  },
  {
    key: 'CORNERS_1X2',
    name: 'Corners 1X2',
    description: 'Qué equipo tendrá más esquinas',
    category: 'CORNERS',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    priority: 45,
    displayOrder: 6,
    isPopular: false,
    iconName: 'corner-flag',
    shortDescription: 'Más esquinas'
  },
  {
    key: 'HT_CORNERS_OVER_UNDER_3_5',
    name: 'First Half Corners Over/Under 3.5',
    description: 'Esquinas en primer tiempo mayor o menor a 3.5',
    category: 'CORNERS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 3.5 },
    priority: 30,
    displayOrder: 7,
    isPopular: false,
    iconName: 'corner-flag',
    shortDescription: 'PT Esquinas Más/Menos 3.5'
  },

  // ═══════════════════════════════════════════════════════════════════
  // CARDS (Tarjetas)
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'CARDS_OVER_UNDER_3_5',
    name: 'Cards Over/Under 3.5',
    description: 'Total de tarjetas mayor o menor a 3.5',
    category: 'CARDS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 3.5 },
    priority: 50,
    displayOrder: 1,
    isPopular: true,
    iconName: 'card',
    shortDescription: 'Tarjetas Más/Menos 3.5'
  },
  {
    key: 'CARDS_OVER_UNDER_4_5',
    name: 'Cards Over/Under 4.5',
    description: 'Total de tarjetas mayor o menor a 4.5',
    category: 'CARDS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 4.5 },
    priority: 45,
    displayOrder: 2,
    isPopular: false,
    iconName: 'card',
    shortDescription: 'Tarjetas Más/Menos 4.5'
  },
  {
    key: 'CARDS_OVER_UNDER_2_5',
    name: 'Cards Over/Under 2.5',
    description: 'Total de tarjetas mayor o menor a 2.5',
    category: 'CARDS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 2.5 },
    priority: 40,
    displayOrder: 3,
    isPopular: false,
    iconName: 'card',
    shortDescription: 'Tarjetas Más/Menos 2.5'
  },
  {
    key: 'CARDS_OVER_UNDER_5_5',
    name: 'Cards Over/Under 5.5',
    description: 'Total de tarjetas mayor o menor a 5.5',
    category: 'CARDS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 5.5 },
    priority: 35,
    displayOrder: 4,
    isPopular: false,
    iconName: 'card',
    shortDescription: 'Tarjetas Más/Menos 5.5'
  },
  {
    key: 'CARDS_OVER_UNDER_6_5',
    name: 'Cards Over/Under 6.5',
    description: 'Total de tarjetas mayor o menor a 6.5',
    category: 'CARDS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 6.5 },
    priority: 30,
    displayOrder: 5,
    isPopular: false,
    iconName: 'card',
    shortDescription: 'Tarjetas Más/Menos 6.5'
  },
  {
    key: 'RED_CARD',
    name: 'Red Card',
    description: 'Habrá al menos una tarjeta roja',
    category: 'CARDS',
    possibleOutcomes: ['YES', 'NO'],
    priority: 40,
    displayOrder: 6,
    isPopular: false,
    iconName: 'red-card',
    shortDescription: 'Tarjeta roja'
  },
  {
    key: 'BOTH_TEAMS_CARDS',
    name: 'Both Teams To Get Cards',
    description: 'Ambos equipos recibirán al menos una tarjeta',
    category: 'CARDS',
    possibleOutcomes: ['YES', 'NO'],
    priority: 25,
    displayOrder: 7,
    isPopular: false,
    iconName: 'card',
    shortDescription: 'Ambos reciben tarjetas'
  },
  {
    key: 'HOME_CARDS_OVER_UNDER_1_5',
    name: 'Home Team Cards Over/Under 1.5',
    description: 'Tarjetas del equipo local mayor o menor a 1.5',
    category: 'CARDS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 1.5 },
    priority: 20,
    displayOrder: 8,
    isPopular: false,
    iconName: 'card',
    shortDescription: 'Tarjetas local Más/Menos 1.5'
  },
  {
    key: 'AWAY_CARDS_OVER_UNDER_1_5',
    name: 'Away Team Cards Over/Under 1.5',
    description: 'Tarjetas del equipo visitante mayor o menor a 1.5',
    category: 'CARDS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 1.5 },
    priority: 20,
    displayOrder: 9,
    isPopular: false,
    iconName: 'card',
    shortDescription: 'Tarjetas visitante Más/Menos 1.5'
  },

  // ═══════════════════════════════════════════════════════════════════
  // MERCADOS ESPECIALES
  // ═══════════════════════════════════════════════════════════════════
  {
    key: 'HT_FT',
    name: 'Halftime/Fulltime',
    description: 'Resultado al medio tiempo y tiempo completo',
    category: 'SPECIALS',
    possibleOutcomes: ['HOME_HOME', 'HOME_DRAW', 'HOME_AWAY', 'DRAW_HOME', 'DRAW_DRAW', 'DRAW_AWAY', 'AWAY_HOME', 'AWAY_DRAW', 'AWAY_AWAY'],
    priority: 55,
    displayOrder: 1,
    isPopular: true,
    iconName: 'clock-split',
    shortDescription: 'PT/TT Resultado'
  },
  {
    key: 'FT_BTTS_COMBO',
    name: 'Full Time Result/Both Teams to Score',
    description: 'Resultado final combinado con ambos equipos marcan',
    category: 'COMBINED',
    possibleOutcomes: ['HOME_YES', 'HOME_NO', 'DRAW_YES', 'DRAW_NO', 'AWAY_YES', 'AWAY_NO'],
    priority: 45,
    displayOrder: 1,
    isPopular: false,
    iconName: 'combo',
    shortDescription: 'Resultado + Ambos marcan'
  },
  {
    key: 'WIN_TO_NIL',
    name: 'To Win To Nil',
    description: 'Ganar sin recibir goles',
    category: 'SPECIALS',
    possibleOutcomes: ['HOME', 'AWAY'],
    priority: 35,
    displayOrder: 2,
    isPopular: false,
    iconName: 'shield-check',
    shortDescription: 'Ganar sin recibir'
  },
  {
    key: 'FIRST_GOAL',
    name: 'To Score First',
    description: 'Qué equipo marcará primero',
    category: 'SPECIALS',
    possibleOutcomes: ['HOME', 'AWAY'],
    priority: 40,
    displayOrder: 3,
    isPopular: false,
    iconName: 'first',
    shortDescription: 'Primer gol'
  },
  {
    key: 'LAST_GOAL',
    name: 'To Score Last',
    description: 'Qué equipo marcará último',
    category: 'SPECIALS',
    possibleOutcomes: ['HOME', 'AWAY'],
    priority: 30,
    displayOrder: 4,
    isPopular: false,
    iconName: 'last',
    shortDescription: 'Último gol'
  },
  {
    key: 'CLEAN_SHEET',
    name: 'Clean Sheet',
    description: 'Qué equipo mantendrá su portería en cero',
    category: 'SPECIALS',
    possibleOutcomes: ['HOME', 'AWAY', 'NEITHER'],
    priority: 25,
    displayOrder: 5,
    isPopular: false,
    iconName: 'shield',
    shortDescription: 'Portería en cero'
  }
];

async function updateBettingMarkets() {
  try {
    console.log('🚀 Iniciando actualización de mercados de apuestas...');
    
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const marketData of UPDATED_BETTING_MARKETS) {
      try {
        const [market, wasCreated] = await BettingMarket.findOrCreate({
          where: { key: marketData.key },
          defaults: marketData
        });

        if (wasCreated) {
          created++;
          console.log(`   ✅ Creado: ${marketData.name}`);
        } else {
          // Actualizar mercado existente con nuevos campos
          await market.update({
            name: marketData.name,
            description: marketData.description,
            category: marketData.category,
            possibleOutcomes: marketData.possibleOutcomes,
            parameters: marketData.parameters,
            priority: marketData.priority,
            displayOrder: marketData.displayOrder,
            isPopular: marketData.isPopular,
            iconName: marketData.iconName,
            shortDescription: marketData.shortDescription
          });
          updated++;
          console.log(`   🔄 Actualizado: ${marketData.name}`);
        }

      } catch (error) {
        console.error(`   ❌ Error con ${marketData.key}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 RESUMEN DE ACTUALIZACIÓN:');
    console.log(`   ✅ Creados: ${created}`);
    console.log(`   🔄 Actualizados: ${updated}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📋 Total mercados: ${UPDATED_BETTING_MARKETS.length}`);
    
    // Mostrar estadísticas por categoría
    const categories = {};
    UPDATED_BETTING_MARKETS.forEach(market => {
      if (!categories[market.category]) {
        categories[market.category] = 0;
      }
      categories[market.category]++;
    });

    console.log('\n📈 MERCADOS POR CATEGORÍA:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} mercados`);
    });

    console.log('\n🎉 ¡Actualización de mercados completada exitosamente!');
    process.exit(0);

  } catch (error) {
    console.error('💥 Error general en actualización:', error);
    process.exit(1);
  }
}

// Función para verificar mercados existentes
async function checkExistingMarkets() {
  try {
    const existingMarkets = await BettingMarket.findAll({
      attributes: ['key', 'name', 'category'],
      order: [['category', 'ASC'], ['priority', 'DESC']]
    });

    console.log('\n📋 MERCADOS EXISTENTES EN BD:');
    const byCategory = {};
    existingMarkets.forEach(market => {
      if (!byCategory[market.category]) {
        byCategory[market.category] = [];
      }
      byCategory[market.category].push(`${market.key} - ${market.name}`);
    });

    Object.entries(byCategory).forEach(([category, markets]) => {
      console.log(`\n   ${category}:`);
      markets.forEach(market => console.log(`     • ${market}`));
    });

    console.log(`\n   Total: ${existingMarkets.length} mercados`);

  } catch (error) {
    console.error('Error verificando mercados:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'check') {
    checkExistingMarkets();
  } else {
    updateBettingMarkets();
  }
}

module.exports = {
  updateBettingMarkets,
  checkExistingMarkets,
  UPDATED_BETTING_MARKETS
};