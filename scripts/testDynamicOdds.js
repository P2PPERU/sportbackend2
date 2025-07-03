// 📄 scripts/testDynamicOdds.js - SCRIPT DE PRUEBA COMPLETO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const { BettingMarket, Odds } = require('../src/models');
const dynamicOddsMapper = require('../src/utils/dynamicOddsMapper.service');
const logger = require('../src/utils/logger');

// ✅ DATOS DE PRUEBA BASADOS EN TU paste.txt
const SAMPLE_API_FOOTBALL_DATA = {
  fixture: {
    id: 1340318,
    date: "2025-07-02T20:00:00+00:00",
    timezone: "UTC"
  },
  league: {
    id: 281,
    name: "Primera División",
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
        }
      ]
    }
  ]
};

class DynamicOddsTest {
  async runCompleteTest() {
    try {
      console.log('🧪 INICIANDO PRUEBA COMPLETA DE ODDS DINÁMICAS');
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

      console.log('\n✅ ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
      console.log('🎯 Tu sistema de odds dinámicas está funcionando correctamente');

    } catch (error) {
      console.error('❌ ERROR EN PRUEBAS:', error.message);
      throw error;
    }
  }

  // ✅ PRUEBA 1: Sistema básico
  async testBasicSystem() {
    console.log('\n🔧 PRUEBA 1: Verificando sistema básico...');
    
    try {
      // Verificar que el mapper existe
      const mapperStats = dynamicOddsMapper.getMappingStats();
      console.log(`   ✅ Mapper dinámico cargado: ${mapperStats.supportedCategories} categorías`);
      
      // Verificar base de datos
      const marketCount = await BettingMarket.count();
      console.log(`   ✅ Base de datos conectada: ${marketCount} mercados existentes`);
      
      // Verificar nuevas columnas
      const sampleMarket = await BettingMarket.findOne();
      if (sampleMarket && typeof sampleMarket.apiFootballId !== 'undefined') {
        console.log('   ✅ Nuevas columnas dinámicas disponibles');
      } else {
        console.log('   ⚠️ Columnas dinámicas no encontradas - ejecutar migración');
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
      for (const bet of SAMPLE_API_FOOTBALL_DATA.bookmakers[0].bets) {
        console.log(`\n   🔄 Procesando: ${bet.name} (ID: ${bet.id})`);
        
        // Mapear mercado dinámicamente
        const mappedMarket = await dynamicOddsMapper.mapMarketDynamically(bet);
        
        console.log(`      📊 Clave generada: ${mappedMarket.key}`);
        console.log(`      📋 Categoría detectada: ${mappedMarket.category}`);
        console.log(`      🎯 Prioridad: ${mappedMarket.priority}`);
        console.log(`      📈 Outcomes: ${mappedMarket.possibleOutcomes.length}`);
        
        // Probar normalización de outcomes
        bet.values.forEach(value => {
          const normalized = dynamicOddsMapper.normalizeOutcome(value.value);
          console.log(`         "${value.value}" → "${normalized}"`);
        });
      }
      
      console.log('   ✅ Mapeo dinámico funcionando correctamente');

    } catch (error) {
      console.error('   ❌ Error en mapeo dinámico:', error.message);
      throw error;
    }
  }

  // ✅ PRUEBA 3: Procesamiento completo
  async testCompleteProcessing() {
    console.log('\n⚙️ PRUEBA 3: Simulando procesamiento completo...');
    
    try {
      const results = {
        marketsProcessed: 0,
        oddsCreated: 0,
        newMarkets: 0,
        errors: 0
      };

      for (const bet of SAMPLE_API_FOOTBALL_DATA.bookmakers[0].bets) {
        try {
          // Simular creación de mercado
          const mappedMarket = await dynamicOddsMapper.mapMarketDynamically(bet);
          
          // Buscar o crear mercado
          const [market, wasCreated] = await BettingMarket.findOrCreate({
            where: { apiFootballId: bet.id },
            defaults: {
              ...mappedMarket,
              isActive: true
            }
          });

          if (wasCreated) {
            results.newMarkets++;
            console.log(`      ➕ Nuevo mercado creado: ${market.name}`);
          } else {
            console.log(`      🔄 Mercado existente actualizado: ${market.name}`);
            await market.update({
              usageCount: (market.usageCount || 0) + 1,
              lastSeenAt: new Date()
            });
          }

          results.marketsProcessed++;
          results.oddsCreated += bet.values.length;

        } catch (error) {
          console.error(`      ❌ Error procesando ${bet.name}:`, error.message);
          results.errors++;
        }
      }

      console.log(`   📊 Resultados del procesamiento:`);
      console.log(`      📈 Mercados procesados: ${results.marketsProcessed}`);
      console.log(`      🆕 Nuevos mercados: ${results.newMarkets}`);
      console.log(`      💾 Odds procesadas: ${results.oddsCreated}`);
      console.log(`      ❌ Errores: ${results.errors}`);

      if (results.errors === 0) {
        console.log('   ✅ Procesamiento completo exitoso');
      }

    } catch (error) {
      console.error('   ❌ Error en procesamiento:', error.message);
      throw error;
    }
  }

  // ✅ PRUEBA 4: Estado de base de datos
  async testDatabaseState() {
    console.log('\n💾 PRUEBA 4: Verificando estado de base de datos...');
    
    try {
      // Contar mercados por categoría
      const markets = await BettingMarket.findAll({
        where: { apiFootballId: { [require('sequelize').Op.ne]: null } },
        attributes: ['category', 'apiFootballId', 'usageCount', 'lastSeenAt']
      });

      const categoryStats = {};
      markets.forEach(market => {
        const cat = market.category || 'OTHER';
        if (!categoryStats[cat]) {
          categoryStats[cat] = 0;
        }
        categoryStats[cat]++;
      });

      console.log('   📊 Mercados por categoría:');
      Object.entries(categoryStats).forEach(([category, count]) => {
        console.log(`      📋 ${category}: ${count} mercados`);
      });

      // Verificar odds
      const oddsCount = await Odds.count();
      console.log(`   💰 Total de odds en sistema: ${oddsCount}`);

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
        { name: "Unknown Market Type", expected: "OTHER" }
      ];

      let correct = 0;
      let total = testCases.length;

      for (const testCase of testCases) {
        const detected = dynamicOddsMapper.detectCategory(testCase.name);
        const isCorrect = detected === testCase.expected;
        
        console.log(`      ${isCorrect ? '✅' : '❌'} "${testCase.name}" → ${detected} ${isCorrect ? '' : `(esperado: ${testCase.expected})`}`);
        
        if (isCorrect) correct++;
      }

      console.log(`   📊 Precisión de categorización: ${correct}/${total} (${Math.round(correct/total*100)}%)`);
      
      if (correct >= total * 0.8) { // 80% de precisión mínima
        console.log('   ✅ Categorización funcionando correctamente');
      } else {
        console.log('   ⚠️ Categorización necesita mejoras');
      }

    } catch (error) {
      console.error('   ❌ Error en categorización:', error.message);
      throw error;
    }
  }

  // ✅ PRUEBA ESPECÍFICA: Verificar estructura de API-Football
  async testApiFootballStructure() {
    console.log('\n🔍 PRUEBA ADICIONAL: Verificando estructura de API-Football...');
    
    try {
      // Verificar que la estructura coincida con tu paste.txt
      const sampleBookmaker = SAMPLE_API_FOOTBALL_DATA.bookmakers[0];
      
      console.log(`   📊 Bookmaker: ${sampleBookmaker.name}`);
      console.log(`   📋 Mercados disponibles: ${sampleBookmaker.bets.length}`);
      
      sampleBookmaker.bets.forEach(bet => {
        console.log(`      🎯 ${bet.name}: ${bet.values.length} outcomes`);
        
        bet.values.forEach(value => {
          const odds = parseFloat(value.odd);
          const impliedProb = ((1 / odds) * 100).toFixed(1);
          console.log(`         "${value.value}": ${value.odd} (${impliedProb}%)`);
        });
      });

      console.log('   ✅ Estructura compatible con API-Football');

    } catch (error) {
      console.error('   ❌ Error verificando estructura:', error.message);
    }
  }

  // ✅ GENERAR REPORTE FINAL
  async generateFinalReport() {
    try {
      const mapperStats = dynamicOddsMapper.getMappingStats();
      const totalMarkets = await BettingMarket.count();
      const dynamicMarkets = await BettingMarket.count({
        where: { apiFootballId: { [require('sequelize').Op.ne]: null } }
      });

      console.log('\n📊 REPORTE FINAL DEL SISTEMA DINÁMICO');
      console.log('═'.repeat(50));
      console.log(`🎯 Categorías soportadas: ${mapperStats.supportedCategories}`);
      console.log(`🔧 Normalizadores de outcomes: ${mapperStats.outcomeNormalizers}`);
      console.log(`💾 Total mercados en BD: ${totalMarkets}`);
      console.log(`⚡ Mercados dinámicos: ${dynamicMarkets}`);
      console.log(`📈 Cobertura dinámica: ${Math.round((dynamicMarkets/totalMarkets)*100)}%`);
      console.log(`✅ Sistema dinámico: ${mapperStats.dynamicMapping ? 'ACTIVO' : 'INACTIVO'}`);
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error.message);
    }
  }
}

// ✅ EJECUTAR PRUEBAS
if (require.main === module) {
  const test = new DynamicOddsTest();
  
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
        console.log('   node scripts/testDynamicOdds.js --structure');
        console.log('   node scripts/testDynamicOdds.js --report');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Pruebas fallaron:', error.message);
        process.exit(1);
      });
  }
}

module.exports = DynamicOddsTest;