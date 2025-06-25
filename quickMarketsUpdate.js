// 📄 quickMarketsUpdate.js - ACTUALIZACIÓN RÁPIDA SOLO MERCADOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();

// Datos de mercados directamente aquí para evitar problemas de import
const UPDATED_BETTING_MARKETS = [
  // MERCADOS PRINCIPALES
  {
    key: '1X2',
    name: 'Match Winner',
    description: 'Predicción del ganador del partido',
    category: 'MATCH_RESULT',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    priority: 100,
    isActive: true
  },
  {
    key: 'DOUBLE_CHANCE',
    name: 'Double Chance',
    description: 'Dos de tres posibles resultados',
    category: 'MATCH_RESULT',
    possibleOutcomes: ['1X', 'X2', '12'],
    priority: 80,
    isActive: true
  },
  
  // MERCADOS DE GOLES
  {
    key: 'OVER_UNDER_2_5',
    name: 'Over/Under 2.5 Goals',
    description: 'Total de goles mayor o menor a 2.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 2.5 },
    priority: 95,
    isActive: true
  },
  {
    key: 'BTTS',
    name: 'Both Teams To Score',
    description: 'Ambos equipos anotan al menos un gol',
    category: 'GOALS',
    possibleOutcomes: ['YES', 'NO'],
    priority: 90,
    isActive: true
  },
  {
    key: 'OVER_UNDER_1_5',
    name: 'Over/Under 1.5 Goals',
    description: 'Total de goles mayor o menor a 1.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 1.5 },
    priority: 75,
    isActive: true
  },
  {
    key: 'OVER_UNDER_0_5',
    name: 'Over/Under 0.5 Goals',
    description: 'Total de goles mayor o menor a 0.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 0.5 },
    priority: 60,
    isActive: true
  },
  {
    key: 'OVER_UNDER_3_5',
    name: 'Over/Under 3.5 Goals',
    description: 'Total de goles mayor o menor a 3.5',
    category: 'GOALS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 3.5 },
    priority: 70,
    isActive: true
  },
  
  // EXACT SCORE
  {
    key: 'EXACT_SCORE',
    name: 'Exact Score',
    description: 'Predicción del resultado exacto',
    category: 'EXACT_SCORE',
    possibleOutcomes: ['0_0', '1_0', '0_1', '1_1', '2_0', '0_2', '2_1', '1_2', '2_2', '3_0', '0_3', '3_1', '1_3', '3_2', '2_3', 'OTHER'],
    priority: 65,
    isActive: true
  },
  
  // PRIMER TIEMPO
  {
    key: 'HT_1X2',
    name: 'Halftime Result',
    description: 'Resultado al medio tiempo',
    category: 'HALFTIME',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    priority: 85,
    isActive: true
  },
  {
    key: 'HT_OVER_UNDER_0_5',
    name: 'Halftime Over/Under 0.5',
    description: 'Goles en primer tiempo mayor o menor a 0.5',
    category: 'HALFTIME',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 0.5 },
    priority: 70,
    isActive: true
  },
  {
    key: 'HT_BTTS',
    name: 'Halftime Both Teams To Score',
    description: 'Ambos equipos marcan en primer tiempo',
    category: 'HALFTIME',
    possibleOutcomes: ['YES', 'NO'],
    priority: 55,
    isActive: true
  },
  
  // SEGUNDO TIEMPO
  {
    key: 'ST_1X2',
    name: 'Second Half Winner',
    description: 'Ganador del segundo tiempo',
    category: 'SECOND_HALF',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    priority: 50,
    isActive: true
  },
  {
    key: 'ST_OVER_UNDER_0_5',
    name: 'Second Half Over/Under 0.5',
    description: 'Goles en segundo tiempo mayor o menor a 0.5',
    category: 'SECOND_HALF',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 0.5 },
    priority: 45,
    isActive: true
  },
  
  // CORNERS
  {
    key: 'CORNERS_OVER_UNDER_9_5',
    name: 'Corners Over/Under 9.5',
    description: 'Total de esquinas mayor o menor a 9.5',
    category: 'CORNERS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 9.5 },
    priority: 55,
    isActive: true
  },
  {
    key: 'CORNERS_OVER_UNDER_8_5',
    name: 'Corners Over/Under 8.5',
    description: 'Total de esquinas mayor o menor a 8.5',
    category: 'CORNERS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 8.5 },
    priority: 50,
    isActive: true
  },
  {
    key: 'CORNERS_1X2',
    name: 'Corners 1X2',
    description: 'Qué equipo tendrá más esquinas',
    category: 'CORNERS',
    possibleOutcomes: ['HOME', 'DRAW', 'AWAY'],
    priority: 45,
    isActive: true
  },
  
  // CARDS
  {
    key: 'CARDS_OVER_UNDER_3_5',
    name: 'Cards Over/Under 3.5',
    description: 'Total de tarjetas mayor o menor a 3.5',
    category: 'CARDS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 3.5 },
    priority: 50,
    isActive: true
  },
  {
    key: 'CARDS_OVER_UNDER_4_5',
    name: 'Cards Over/Under 4.5',
    description: 'Total de tarjetas mayor o menor a 4.5',
    category: 'CARDS',
    possibleOutcomes: ['OVER', 'UNDER'],
    parameters: { line: 4.5 },
    priority: 45,
    isActive: true
  },
  {
    key: 'RED_CARD',
    name: 'Red Card',
    description: 'Habrá al menos una tarjeta roja',
    category: 'CARDS',
    possibleOutcomes: ['YES', 'NO'],
    priority: 40,
    isActive: true
  },
  
  // ESPECIALES
  {
    key: 'HT_FT',
    name: 'Halftime/Fulltime',
    description: 'Resultado al medio tiempo y tiempo completo',
    category: 'SPECIALS',
    possibleOutcomes: ['HOME_HOME', 'HOME_DRAW', 'HOME_AWAY', 'DRAW_HOME', 'DRAW_DRAW', 'DRAW_AWAY', 'AWAY_HOME', 'AWAY_DRAW', 'AWAY_AWAY'],
    priority: 55,
    isActive: true
  },
  {
    key: 'WIN_TO_NIL',
    name: 'To Win To Nil',
    description: 'Ganar sin recibir goles',
    category: 'SPECIALS',
    possibleOutcomes: ['HOME', 'AWAY'],
    priority: 35,
    isActive: true
  }
];

async function quickUpdateMarkets() {
  try {
    console.log('🚀 ACTUALIZACIÓN RÁPIDA DE MERCADOS');
    console.log('═'.repeat(50));
    
    // Conectar directamente a la BD sin sincronizar modelos
    const { Sequelize, DataTypes } = require('sequelize');
    
    const sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false // Silenciar logs
      }
    );

    // Conectar
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const marketData of UPDATED_BETTING_MARKETS) {
      try {
        // Usar query raw para evitar problemas de modelo
        const [results] = await sequelize.query(`
          INSERT INTO betting_markets (
            id, key, name, description, category, possible_outcomes, 
            parameters, is_active, priority, created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            :key,
            :name,
            :description,
            :category::enum_betting_markets_category,
            :possibleOutcomes::jsonb,
            :parameters::jsonb,
            :isActive,
            :priority,
            NOW(),
            NOW()
          )
          ON CONFLICT (key) 
          DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            possible_outcomes = EXCLUDED.possible_outcomes,
            parameters = EXCLUDED.parameters,
            priority = EXCLUDED.priority,
            updated_at = NOW()
          RETURNING id, (xmax = 0) AS inserted
        `, {
          replacements: {
            key: marketData.key,
            name: marketData.name,
            description: marketData.description,
            category: marketData.category,
            possibleOutcomes: JSON.stringify(marketData.possibleOutcomes),
            parameters: JSON.stringify(marketData.parameters || {}),
            isActive: marketData.isActive,
            priority: marketData.priority
          },
          type: Sequelize.QueryTypes.SELECT
        });

        if (results[0]?.inserted) {
          created++;
          console.log(`   ✅ Creado: ${marketData.name}`);
        } else {
          updated++;
          console.log(`   🔄 Actualizado: ${marketData.name}`);
        }

      } catch (error) {
        console.error(`   ❌ Error con ${marketData.key}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Creados: ${created}`);
    console.log(`   🔄 Actualizados: ${updated}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📋 Total: ${UPDATED_BETTING_MARKETS.length}`);

    // Verificar mercados finales
    const [totalResult] = await sequelize.query(
      'SELECT COUNT(*) as total FROM betting_markets',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`\n🎯 Total mercados en BD: ${totalResult.total}`);

    await sequelize.close();
    console.log('\n🎉 ¡ACTUALIZACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Reiniciar servidor: npm run dev');
    console.log('2. Probar mercados: GET /api/odds/markets');
    console.log('3. Sincronizar odds: POST /api/odds/sync');
    
    process.exit(0);

  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
    console.error('\n🔧 SOLUCIONES:');
    console.error('1. Verificar que el servidor esté corriendo');
    console.error('2. Verificar variables .env');
    console.error('3. Verificar conexión a PostgreSQL');
    
    process.exit(1);
  }
}

// Ejecutar
quickUpdateMarkets();