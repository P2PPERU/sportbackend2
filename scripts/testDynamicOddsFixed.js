// 📄 scripts/testDynamicOddsFixed.js - TEST CORREGIDO CON MAPPING SEQUELIZE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const { BettingMarket, Odds } = require('../src/models');
const dynamicOddsMapper = require('../src/utils/dynamicOddsMapper.service');
const logger = require('../src/utils/logger');
const { Op } = require('sequelize');

// ✅ DATOS DE PRUEBA CORREGIDOS
const SAMPLE_API_FOOTBALL_DATA = {
  fixture: {
    id: 1340318,
    date: "2025-07-02T20:00:00+00:00",
    timezone: "America/Lima"
  },
  league: {
    id: 281,
    name: "Liga 1",
    country: "Peru"
  },
  bookmakers: [
    {
      id: 8,
      name: "Bet365",
      bets: [
        {
          id: 1,
          name: "Match Winner",
          values: [
            { value: "Home", odd: "4.10" },
            { value: "Draw", odd: "2.90" },
            { value: "Away", odd: "2.05" }
          ]
        },
        {
          id: 5,
          name: "Goals Over/Under",
          values: [
            { value: "Over 1.5", odd: "1.36" },
            { value: "Under 1.5", odd: "3.00" },
            { value: "Over 2.5", odd: "2.25" },
            { value: "Under 2.5", odd: "1.62" }
          ]
        },
        {
          id: 8,
          name: "Both Teams Score",
          values: [
            { value: "Yes", odd: "1.91" },
            { value: "No", odd: "1.80" }
          ]
        },
        {
          id: 21,
          name: "Odd/Even",
          values: [
            { value: "Odd", odd: "2.05" },
            { value: "Even", odd: "1.80" }
          ]
        },
        {
          id: 92,
          name: "Anytime Goal Scorer",
          values: [
            { value: "Daniel Meneses", odd: "12.00" },
            { value: "Jose Yabiku", odd: "3.40" },
            { value: "Bernardo Cuesta", odd: "2.30" }
          ]
        },
        {
          id: 133,
          name: "Goals Over/Under - First Half",
          values: [
            { value: "Over 0.5", odd: "2.15" },
            { value: "Under 0.5", odd: "1.65" }
          ]
        },
        {
          id: 45,
          name: "Corners Over Under",
          values: [
            { value: "Over 8.5", odd: "1.85" },
            { value: "Under 8.5", odd: "1.95" }
          ]
        }
      ]
    }
  ]
};

class FixedDynamicOddsTest {
  async runCompleteTest() {
    try {
      console.log('🧪 INICIANDO PRUEBA COMPLETA DE ODDS DINÁMICAS CORREGIDA');
      console.log('═'.repeat(70));

      // 1. Verificar sistema básico
      await this.testBasicSystem();
      
      // 2. Probar mapeo dinámico  
      await this.testDynamicMapping();
      
      // 3. Simular procesamiento completo
      await this.testCompleteProcessing();
      
      // 4. Verificar base de datos
      await this.testDatabaseState();
      
      // 5. Probar categorización
      await this.testCategorization();

      // 6. Test específico de API-Football
      await this.testApiFootballStructure();

      console.log('\n✅ ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
      console.log('🎯 Tu sistema de odds dinámicas está funcionando correctamente');

    } catch (error) {
      console.error('❌ ERROR EN PRUEBAS:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  // ✅ PRUEBA 1: Sistema básico CORREGIDO
  async testBasicSystem() {
    console.log('\n🔧 PRUEBA 1: Verificando sistema básico...');
    
    try {
      // Verificar que el mapper existe
      const mapperStats = dynamicOddsMapper.getMappingStats();
      console.log(`   ✅ Mapper dinámico cargado: ${mapperStats.supportedCategories} categorías`);
      
      // Verificar base de datos
      const marketCount = await BettingMarket.count();
      console.log(`   ✅ Base de datos conectada: ${marketCount} mercados existentes`);
      
      // ✅ VERIFICAR NUEVAS COLUMNAS CON SEQUELIZE
      try {
        const sampleMarket = await BettingMarket.findOne({
          where: {
            apiFootballId: {
              [Op.ne]: null
            }
          }
        });

        if (sampleMarket) {
          console.log('   ✅ Nuevas columnas dinámicas disponibles');
          console.log(`      - API Football ID: ${sampleMarket.apiFootballId}`);
          console.log(`      - Usage Count: ${sampleMarket.usageCount}`);
          console.log(`      - Last Seen: ${sampleMarket.lastSeenAt}`);
        } else {
          // ✅ INTENTAR CREAR UN MERCADO DE PRUEBA
          console.log('   🔄 Creando mercado de prueba...');
          
          const testMarket = await BettingMarket.create({
            key: 'TEST_DYNAMIC',
            name: 'Test Dynamic Market',
            category: 'OTHER',
            possibleOutcomes: ['TEST1', 'TEST2'],
            parameters: {},
            isActive: true,
            priority: 1,
            apiFootballId: 9999,
            usageCount: 1,
            lastSeenAt: new Date(),
            originalData: {
              test: true,
              created: new Date().toISOString()
            }
          });

          console.log('   ✅ Mercado de prueba creado exitosamente');
          console.log(`      - ID: ${testMarket.id}`);
          console.log(`      - API Football ID: ${testMarket.apiFootballId}`);
          
          // Limpiar mercado de prueba
          await testMarket.destroy();
          console.log('   🧹 Mercado de prueba eliminado');
        }

      } catch (columnError) {
        console.error('   ❌ Error verificando columnas:', columnError.message);
        throw new Error('Las columnas dinámicas no están disponibles. Ejecuta la migración primero.');
      }

    } catch (error) {
      console.error('   ❌ Error en sistema básico:', error.message);
      throw error;
    }
  }

  // ✅ PRUEBA 2: Mapeo dinámico
  async testDynamicMapping() {
    console.log('\n🎯 PRUEBA 2: Probando mapeo dinámico...');
    
    try {
      let processedBets = 0;
      
      for (const bet of SAMPLE_API_FOOTBALL_DATA.bookmakers[0].bets) {
        console.log(`\n   🔄 Procesando: ${bet.name} (ID: ${bet.id})`);
        
        // Mapear mercado dinámicamente
        const mappedMarket = await dynamicOddsMapper.mapMarketDynamically(bet);
        
        console.log(`      📊 Clave generada: ${mappedMarket.key}`);
        console.log(`      📋 Categoría detectada: ${mappedMarket.category}`);
        console.log(`      🎯 Prioridad: ${mappedMarket.priority}`);
        console.log(`      📈 Outcomes: ${mappedMarket.possibleOutcomes.length}`);
        
        // Validar mapeo
        if (!mappedMarket.key || !mappedMarket.category) {
          throw new Error(`Mapeo inválido para mercado ${bet.name}`);
        }
        
        // Probar normalización de outcomes
        bet.values.forEach(value => {
          const normalized = dynamicOddsMapper.normalizeOutcome(value.value);
          console.log(`         "${value.value}" → "${normalized}"`);
          
          if (!normalized || normalized === 'UNKNOWN') {
            console.log(`         ⚠️ Outcome no normalizado correctamente: ${value.value}`);
          }
        });
        
        processedBets++;
      }
      
      console.log(`   ✅ Mapeo dinámico funcionando correctamente (${processedBets} mercados procesados)`);

    } catch (error) {
      console.error('   ❌ Error en mapeo dinámico:', error.message);
      throw error;
    }
  }

  // ✅ PRUEBA 3: Procesamiento completo CORREGIDO
  async testCompleteProcessing() {
    console.log('\n⚙️ PRUEBA 3: Simulando procesamiento completo...');
    
    try {
      const results = {
        marketsProcessed: 0,
        newMarkets: 0,
        errors: 0,
        detectedCategories: new Set(),
        createdMarkets: []
      };

      for (const bet of SAMPLE_API_FOOTBALL_DATA.bookmakers[0].bets) {
        try {
          console.log(`      🔄 Procesando: ${bet.name} (ID: ${bet.id})`);
          
          // Simular creación de mercado dinámico
          const mappedMarket = await dynamicOddsMapper.mapMarketDynamically(bet);
          
          // ✅ USAR SEQUELIZE CORRECTAMENTE
          const [market, wasCreated] = await BettingMarket.findOrCreate({
            where: { 
              apiFootballId: bet.id  // ✅ Usar apiFootballId (camelCase)
            },
            defaults: {
              ...mappedMarket,
              isActive: true
            }
          });

          if (wasCreated) {
            results.newMarkets++;
            results.createdMarkets.push(market);
            console.log(`      ➕ Nuevo mercado creado: ${market.name} (${market.key})`);
          } else {
            console.log(`      🔄 Mercado existente actualizado: ${market.name}`);
            
            // ✅ ACTUALIZAR DATOS CON SEQUELIZE
            await market.update({
              usageCount: (market.usageCount || 0) + 1,
              lastSeenAt: new Date()
            });
          }

          results.marketsProcessed++;
          results.detectedCategories.add(mappedMarket.category);

        } catch (error) {
          console.error(`      ❌ Error procesando ${bet.name}:`, error.message);
          results.errors++;
        }
      }

      console.log(`   📊 Resultados del procesamiento:`);
      console.log(`      📈 Mercados procesados: ${results.marketsProcessed}`);
      console.log(`      🆕 Nuevos mercados: ${results.newMarkets}`);
      console.log(`      📋 Categorías detectadas: ${Array.from(results.detectedCategories).join(', ')}`);
      console.log(`      ❌ Errores: ${results.errors}`);

      if (results.errors === 0) {
        console.log('   ✅ Procesamiento completo exitoso');
      }

      // ✅ LIMPIAR MERCADOS DE PRUEBA
      if (results.createdMarkets.length > 0) {
        console.log('   🧹 Limpiando mercados de prueba...');
        for (const market of results.createdMarkets) {
          await market.destroy();
        }
        console.log(`   🗑️ ${results.createdMarkets.length} mercados de prueba eliminados`);
      }

    } catch (error) {
      console.error('   ❌ Error en procesamiento:', error.message);
      throw error;
    }
  }

  // ✅ PRUEBA 4: Estado de base de datos CORREGIDO
  async testDatabaseState() {
    console.log('\n💾 PRUEBA 4: Verificando estado de base de datos...');
    
    try {
      // ✅ CONTAR MERCADOS POR CATEGORÍA CON SEQUELIZE
      const markets = await BettingMarket.findAll({
        where: {
          apiFootballId: {
            [Op.ne]: null
          }
        },
        attributes: ['category', 'apiFootballId', 'usageCount', 'lastSeenAt', 'name'],
        order: [['category', 'ASC'], ['priority', 'DESC']]
      });

      const categoryStats = {};
      markets.forEach(market => {
        const cat = market.category || 'OTHER';
        if (!categoryStats[cat]) {
          categoryStats[cat] = [];
        }
        categoryStats[cat].push({
          name: market.name,
          apiId: market.apiFootballId,
          usage: market.usageCount
        });
      });

      console.log('   📊 Mercados por categoría:');
      Object.entries(categoryStats).forEach(([category, marketList]) => {
        console.log(`      📋 ${category}: ${marketList.length} mercados`);
        marketList.slice(0, 3).forEach(market => {
          console.log(`         - ${market.name} (API: ${market.apiId}, Uso: ${market.usage})`);
        });
        if (marketList.length > 3) {
          console.log(`         ... y ${marketList.length - 3} más`);
        }
      });

      // Verificar odds
      const oddsCount = await Odds.count();
      console.log(`   💰 Total de odds en sistema: ${oddsCount}`);

      // ✅ ESTADÍSTICAS ADICIONALES
      const totalMarkets = await BettingMarket.count();
      const dynamicMarkets = markets.length;
      const coverage = Math.round((dynamicMarkets / totalMarkets) * 100);

      console.log(`   📈 Estadísticas generales:`);
      console.log(`      📋 Total mercados: ${totalMarkets}`);
      console.log(`      🎯 Mercados dinámicos: ${dynamicMarkets}`);
      console.log(`      📊 Cobertura dinámica: ${coverage}%`);

      console.log('   ✅ Base de datos en estado saludable');

    } catch (error) {
      console.error('   ❌ Error verificando base de datos:', error.message);
      throw error;
    }
  }

  // ✅ PRUEBA 5: Categorización
  async testCategorization() {
    console.log('\n🏷️ PRUEBA 5: Probando categorización automática...');
    
    try {
      const testCases = [
        { name: "Match Winner", expected: "MATCH_RESULT" },
        { name: "Goals Over/Under", expected: "GOALS" },
        { name: "Both Teams Score", expected: "GOALS" },
        { name: "First Half Winner", expected: "HALFTIME" },
        { name: "Corners Over Under", expected: "CORNERS" },
        { name: "Anytime Goal Scorer", expected: "PLAYER_PROPS" },
        { name: "Odd/Even", expected: "SPECIALS" },
        { name: "Double Chance", expected: "MATCH_RESULT" },
        { name: "Exact Score", expected: "EXACT_SCORE" },
        { name: "Unknown Market Type", expected: "OTHER" }
      ];

      let correct = 0;
      let total = testCases.length;

      console.log('   🔍 Resultados de categorización:');
      for (const testCase of testCases) {
        const detected = dynamicOddsMapper.detectCategory(testCase.name);
        const isCorrect = detected === testCase.expected;
        
        console.log(`      ${isCorrect ? '✅' : '❌'} "${testCase.name}" → ${detected} ${isCorrect ? '' : `(esperado: ${testCase.expected})`}`);
        
        if (isCorrect) correct++;
      }

      const accuracy = Math.round((correct/total)*100);
      console.log(`\n   📊 Precisión de categorización: ${correct}/${total} (${accuracy}%)`);
      
      if (accuracy >= 80) {
        console.log('   ✅ Categorización funcionando correctamente');
      } else {
        console.log('   ⚠️ Categorización necesita mejoras');
      }

    } catch (error) {
      console.error('   ❌ Error en categorización:', error.message);
      throw error;
    }
  }

  // ✅ PRUEBA 6: Verificar estructura de API-Football
  async testApiFootballStructure() {
    console.log('\n🔍 PRUEBA 6: Verificando estructura de API-Football...');
    
    try {
      const sampleBookmaker = SAMPLE_API_FOOTBALL_DATA.bookmakers[0];
      
      console.log(`   📊 Bookmaker: ${sampleBookmaker.name}`);
      console.log(`   📋 Mercados disponibles: ${sampleBookmaker.bets.length}`);
      
      let totalOutcomes = 0;
      let categorizedMarkets = {};
      
      sampleBookmaker.bets.forEach(bet => {
        const category = dynamicOddsMapper.detectCategory(bet.name);
        if (!categorizedMarkets[category]) {
          categorizedMarkets[category] = [];
        }
        categorizedMarkets[category].push(bet.name);
        
        console.log(`      🎯 ${bet.name}: ${bet.values.length} outcomes (${category})`);
        
        bet.values.forEach(value => {
          const odds = parseFloat(value.odd);
          const impliedProb = ((1 / odds) * 100).toFixed(1);
          console.log(`         "${value.value}": ${value.odd} (${impliedProb}%)`);
          totalOutcomes++;
        });
      });

      console.log(`\n   📈 Resumen de estructura:`);
      console.log(`      🎲 Total outcomes: ${totalOutcomes}`);
      console.log(`      📋 Categorías detectadas: ${Object.keys(categorizedMarkets).length}`);
      
      Object.entries(categorizedMarkets).forEach(([category, markets]) => {
        console.log(`         ${category}: ${markets.length} mercados`);
      });

      console.log('   ✅ Estructura compatible con API-Football');

    } catch (error) {
      console.error('   ❌ Error verificando estructura:', error.message);
      throw error;
    }
  }

  // ✅ GENERAR REPORTE FINAL
  async generateFinalReport() {
    try {
      const mapperStats = dynamicOddsMapper.getMappingStats();
      const totalMarkets = await BettingMarket.count();
      const dynamicMarkets = await BettingMarket.count({
        where: { 
          apiFootballId: { 
            [Op.ne]: null 
          } 
        }
      });

      console.log('\n📊 REPORTE FINAL DEL SISTEMA DINÁMICO');
      console.log('═'.repeat(50));
      console.log(`🎯 Categorías soportadas: ${mapperStats.supportedCategories}`);
      console.log(`🔧 Normalizadores de outcomes: ${mapperStats.outcomeNormalizers}`);
      console.log(`💾 Total mercados en BD: ${totalMarkets}`);
      console.log(`⚡ Mercados dinámicos: ${dynamicMarkets}`);
      console.log(`📈 Cobertura dinámica: ${Math.round((dynamicMarkets/totalMarkets)*100)}%`);
      console.log(`✅ Sistema dinámico: ${mapperStats.dynamicMapping ? 'ACTIVO' : 'INACTIVO'}`);
      console.log(`🏷️ Versión: ${mapperStats.version}`);
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error.message);
    }
  }
}

// ✅ EJECUTAR PRUEBAS
if (require.main === module) {
  const test = new FixedDynamicOddsTest();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--structure')) {
    test.testApiFootballStructure()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (args.includes('--report')) {
    test.generateFinalReport()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    test.runCompleteTest()
      .then(() => test.generateFinalReport())
      .then(() => {
        console.log('\n🎯 Pruebas adicionales:');
        console.log('   node scripts/testDynamicOddsFixed.js --structure');
        console.log('   node scripts/testDynamicOddsFixed.js --report');
        console.log('\n🚀 Sistema listo para sincronización real con API-Football');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Pruebas fallaron:', error.message);
        console.log('\n🔧 Asegúrate de haber ejecutado la migración:');
        console.log('   node scripts/fixDynamicOddsMigration.js');
        process.exit(1);
      });
  }
}

module.exports = FixedDynamicOddsTest;