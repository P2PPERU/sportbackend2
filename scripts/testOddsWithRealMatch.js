#!/usr/bin/env node

// 📄 scripts/testOddsWithRealMatch.js - PRUEBA COMPLETA CON PARTIDO REAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const apiFootballService = require('../src/services/apiFootballService');
const oddsSync = require('../src/services/oddsSync.service');
const dynamicOddsMapper = require('../src/utils/dynamicOddsMapper.service');
const { Fixture, BettingMarket, Odds, League, Team } = require('../src/models');
const logger = require('../src/utils/logger');

class OddsTestSuite {
  constructor() {
    this.timezone = 'America/Lima';
    this.testResults = {
      step1: { name: 'Verificar API-Football', status: 'pending' },
      step2: { name: 'Obtener fixtures disponibles', status: 'pending' },
      step3: { name: 'Seleccionar fixture con odds', status: 'pending' },
      step4: { name: 'Obtener odds raw de API', status: 'pending' },
      step5: { name: 'Mapear dinámicamente', status: 'pending' },
      step6: { name: 'Guardar en base de datos', status: 'pending' },
      step7: { name: 'Verificar resultado final', status: 'pending' }
    };
  }

  async runCompleteTest() {
    console.log('🧪 INICIANDO PRUEBA COMPLETA DE ODDS DINÁMICAS');
    console.log('═'.repeat(80));
    
    try {
      await this.step1_VerifyApiFootball();
      await this.step2_GetAvailableFixtures();
      await this.step3_SelectFixtureWithOdds();
      await this.step4_GetRawOddsFromApi();
      await this.step5_MapDynamically();
      await this.step6_SaveToDatabase();
      await this.step7_VerifyFinalResult();
      
      this.showFinalReport();
      
    } catch (error) {
      console.error('❌ ERROR EN PRUEBA:', error.message);
      this.showFinalReport();
      throw error;
    }
  }

  // PASO 1: Verificar conexión a API-Football
  async step1_VerifyApiFootball() {
    console.log('\n🔧 PASO 1: Verificando conexión a API-Football...');
    
    try {
      const testResult = await apiFootballService.testConnection();
      
      if (testResult.success) {
        console.log('✅ API-Football conectada exitosamente');
        console.log(`   🕐 Timezone: ${testResult.currentTimezone}`);
        console.log(`   📊 Requests disponibles: ${testResult.rateLimitInfo.remainingRequests}`);
        
        this.testResults.step1.status = 'success';
        this.testResults.step1.data = testResult;
      } else {
        throw new Error(`API-Football no disponible: ${testResult.error}`);
      }
      
    } catch (error) {
      this.testResults.step1.status = 'error';
      this.testResults.step1.error = error.message;
      throw error;
    }
  }

  // PASO 2: Obtener fixtures disponibles
  async step2_GetAvailableFixtures() {
    console.log('\n📅 PASO 2: Obteniendo fixtures disponibles para prueba...');
    
    try {
      // Intentar obtener fixtures de hoy primero
      console.log('   📡 Buscando fixtures de hoy...');
      let fixturesResponse = await apiFootballService.getTodayFixtures(this.timezone);
      
      if (!fixturesResponse.response || fixturesResponse.response.length === 0) {
        console.log('   ⚠️ No hay fixtures hoy, buscando fixtures de mañana...');
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];
        
        fixturesResponse = await apiFootballService.getFixturesByDate(tomorrowDate, this.timezone);
      }
      
      if (!fixturesResponse.response || fixturesResponse.response.length === 0) {
        console.log('   ⚠️ No hay fixtures mañana, buscando en rango más amplio...');
        
        // Buscar en los próximos 7 días
        const today = new Date().toISOString().split('T')[0];
        const oneWeekLater = new Date();
        oneWeekLater.setDate(oneWeekLater.getDate() + 7);
        const endDate = oneWeekLater.toISOString().split('T')[0];
        
        fixturesResponse = await apiFootballService.getFixturesByDateRange(
          today, 
          endDate, 
          this.timezone,
          { status: 'NS' } // Solo partidos no comenzados
        );
      }
      
      if (!fixturesResponse.response || fixturesResponse.response.length === 0) {
        throw new Error('No se encontraron fixtures disponibles para prueba');
      }
      
      console.log(`✅ Encontrados ${fixturesResponse.response.length} fixtures disponibles`);
      
      // Mostrar primeros 5 fixtures
      console.log('   📋 Primeros fixtures encontrados:');
      fixturesResponse.response.slice(0, 5).forEach((fixture, index) => {
        console.log(`      ${index + 1}. ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
        console.log(`         🏆 ${fixture.league.name} (${fixture.league.country})`);
        console.log(`         📅 ${fixture.fixture.date}`);
        console.log(`         🆔 Fixture ID: ${fixture.fixture.id}`);
      });
      
      this.testResults.step2.status = 'success';
      this.testResults.step2.data = {
        totalFixtures: fixturesResponse.response.length,
        fixtures: fixturesResponse.response
      };
      
    } catch (error) {
      this.testResults.step2.status = 'error';
      this.testResults.step2.error = error.message;
      throw error;
    }
  }

  // PASO 3: Seleccionar fixture con odds
  async step3_SelectFixtureWithOdds() {
    console.log('\n🎯 PASO 3: Seleccionando fixture con odds disponibles...');
    
    try {
      const fixtures = this.testResults.step2.data.fixtures;
      let selectedFixture = null;
      let oddsCheckCount = 0;
      const maxChecks = 5; // Limitar verificaciones para no gastar requests
      
      console.log(`   🔍 Verificando odds disponibles (máximo ${maxChecks} fixtures)...`);
      
      for (const fixture of fixtures.slice(0, maxChecks)) {
        oddsCheckCount++;
        
        console.log(`      ${oddsCheckCount}/${maxChecks} Verificando: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
        
        try {
          // Verificar si tiene odds disponibles
          const oddsCheck = await apiFootballService.getFixtureOdds(fixture.fixture.id);
          
          if (oddsCheck.response && oddsCheck.response.length > 0) {
            const oddsData = oddsCheck.response[0];
            
            if (oddsData.bookmakers && oddsData.bookmakers.length > 0) {
              const totalBets = oddsData.bookmakers.reduce((sum, bm) => sum + bm.bets.length, 0);
              
              console.log(`         ✅ ENCONTRADO: ${oddsData.bookmakers.length} bookmakers, ${totalBets} mercados`);
              
              selectedFixture = {
                ...fixture,
                oddsPreview: {
                  bookmakers: oddsData.bookmakers.length,
                  totalMarkets: totalBets,
                  sampleBookmaker: oddsData.bookmakers[0].name,
                  sampleMarkets: oddsData.bookmakers[0].bets.slice(0, 3).map(bet => bet.name)
                }
              };
              break;
            } else {
              console.log(`         ❌ Sin odds`);
            }
          } else {
            console.log(`         ❌ Sin datos de odds`);
          }
          
          // Pausa para rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (oddsError) {
          console.log(`         ❌ Error verificando odds: ${oddsError.message}`);
        }
      }
      
      if (!selectedFixture) {
        throw new Error(`No se encontró fixture con odds en ${oddsCheckCount} verificaciones`);
      }
      
      console.log(`✅ Fixture seleccionado para prueba:`);
      console.log(`   🏠 Local: ${selectedFixture.teams.home.name}`);
      console.log(`   ✈️ Visitante: ${selectedFixture.teams.away.name}`);
      console.log(`   🏆 Liga: ${selectedFixture.league.name}`);
      console.log(`   📅 Fecha: ${selectedFixture.fixture.date}`);
      console.log(`   🎲 ${selectedFixture.oddsPreview.bookmakers} bookmakers disponibles`);
      console.log(`   📊 ${selectedFixture.oddsPreview.totalMarkets} mercados totales`);
      console.log(`   📋 Mercados ejemplo: ${selectedFixture.oddsPreview.sampleMarkets.join(', ')}`);
      
      this.testResults.step3.status = 'success';
      this.testResults.step3.data = selectedFixture;
      
    } catch (error) {
      this.testResults.step3.status = 'error';
      this.testResults.step3.error = error.message;
      throw error;
    }
  }

  // PASO 4: Obtener odds raw de la API
  async step4_GetRawOddsFromApi() {
    console.log('\n📡 PASO 4: Obteniendo datos RAW de odds desde API-Football...');
    
    try {
      const selectedFixture = this.testResults.step3.data;
      
      console.log(`   📡 Solicitando TODAS las odds para fixture ${selectedFixture.fixture.id}...`);
      
      const oddsResponse = await apiFootballService.getAllFixtureOdds(selectedFixture.fixture.id);
      
      if (!oddsResponse.response || oddsResponse.response.length === 0) {
        throw new Error('No se pudieron obtener odds de la API');
      }
      
      const oddsData = oddsResponse.response[0];
      
      console.log(`✅ Datos RAW obtenidos exitosamente:`);
      console.log(`   🎯 Fixture: ${oddsData.fixture.id} - ${oddsData.fixture.date}`);
      console.log(`   🏆 Liga: ${oddsData.league.name} (${oddsData.league.country})`);
      console.log(`   🎲 Total bookmakers: ${oddsData.bookmakers.length}`);
      
      // Analizar estructura detallada
      console.log('\n   📊 ANÁLISIS DETALLADO DE DATOS:');
      
      let totalMarkets = 0;
      let totalOdds = 0;
      const marketFrequency = {};
      const bookmakersAnalysis = [];
      
      oddsData.bookmakers.forEach(bookmaker => {
        console.log(`      🏪 ${bookmaker.name}: ${bookmaker.bets.length} mercados`);
        
        const bmAnalysis = {
          name: bookmaker.name,
          markets: bookmaker.bets.length,
          marketNames: bookmaker.bets.map(bet => bet.name)
        };
        
        bookmaker.bets.forEach(bet => {
          totalMarkets++;
          
          // Contar frecuencia de mercados
          if (!marketFrequency[bet.name]) {
            marketFrequency[bet.name] = 0;
          }
          marketFrequency[bet.name]++;
          
          console.log(`         📋 ${bet.name} (ID: ${bet.id}): ${bet.values.length} outcomes`);
          
          bet.values.forEach(value => {
            console.log(`            💰 "${value.value}": ${value.odd}`);
            totalOdds++;
          });
        });
        
        bookmakersAnalysis.push(bmAnalysis);
      });
      
      // Mercados más frecuentes
      const sortedMarkets = Object.entries(marketFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      console.log('\n   🔥 TOP 5 MERCADOS MÁS FRECUENTES:');
      sortedMarkets.forEach(([market, count], index) => {
        console.log(`      ${index + 1}. ${market}: ${count} bookmakers`);
      });
      
      console.log(`\n   📈 RESUMEN ESTADÍSTICO:`);
      console.log(`      📊 Total mercados procesados: ${totalMarkets}`);
      console.log(`      💰 Total odds individuales: ${totalOdds}`);
      console.log(`      🎲 Bookmakers únicos: ${oddsData.bookmakers.length}`);
      console.log(`      📋 Tipos de mercados únicos: ${Object.keys(marketFrequency).length}`);
      
      this.testResults.step4.status = 'success';
      this.testResults.step4.data = {
        rawOdds: oddsData,
        analysis: {
          totalMarkets,
          totalOdds,
          uniqueMarkets: Object.keys(marketFrequency).length,
          marketFrequency,
          bookmakersAnalysis
        }
      };
      
    } catch (error) {
      this.testResults.step4.status = 'error';
      this.testResults.step4.error = error.message;
      throw error;
    }
  }

  // PASO 5: Mapear dinámicamente
  async step5_MapDynamically() {
    console.log('\n🎯 PASO 5: Mapeando mercados dinámicamente...');
    
    try {
      const rawOdds = this.testResults.step4.data.rawOdds;
      const mappingResults = {
        mappedMarkets: [],
        categorization: {},
        normalization: {},
        errors: []
      };
      
      console.log('   🔄 Procesando mapeo dinámico de mercados...');
      
      // Procesar primer bookmaker como ejemplo
      const sampleBookmaker = rawOdds.bookmakers[0];
      console.log(`   📊 Mapeando mercados de: ${sampleBookmaker.name}`);
      
      for (const bet of sampleBookmaker.bets) {
        try {
          console.log(`\n      🔄 Procesando: ${bet.name} (ID: ${bet.id})`);
          
          // Mapear mercado dinámicamente
          const mappedMarket = await dynamicOddsMapper.mapMarketDynamically(bet);
          
          console.log(`         📊 Clave generada: ${mappedMarket.key}`);
          console.log(`         📋 Categoría detectada: ${mappedMarket.category}`);
          console.log(`         🎯 Prioridad calculada: ${mappedMarket.priority}`);
          console.log(`         📈 Outcomes detectados: ${mappedMarket.possibleOutcomes.length}`);
          
          // Mostrar outcomes normalizados
          console.log(`         🔧 Normalización de outcomes:`);
          bet.values.forEach(value => {
            const normalized = dynamicOddsMapper.normalizeOutcome(value.value);
            console.log(`            "${value.value}" → "${normalized}"`);
            
            if (!mappingResults.normalization[normalized]) {
              mappingResults.normalization[normalized] = [];
            }
            mappingResults.normalization[normalized].push(value.value);
          });
          
          // Categorización
          if (!mappingResults.categorization[mappedMarket.category]) {
            mappingResults.categorization[mappedMarket.category] = [];
          }
          mappingResults.categorization[mappedMarket.category].push(mappedMarket.name);
          
          mappingResults.mappedMarkets.push(mappedMarket);
          
        } catch (mappingError) {
          console.log(`         ❌ Error mapeando: ${mappingError.message}`);
          mappingResults.errors.push({
            market: bet.name,
            error: mappingError.message
          });
        }
      }
      
      console.log(`\n   ✅ MAPEO DINÁMICO COMPLETADO:`);
      console.log(`      📊 Mercados mapeados: ${mappingResults.mappedMarkets.length}`);
      console.log(`      📋 Categorías detectadas: ${Object.keys(mappingResults.categorization).length}`);
      console.log(`      ❌ Errores: ${mappingResults.errors.length}`);
      
      console.log(`\n   🏷️ CATEGORÍAS DETECTADAS:`);
      Object.entries(mappingResults.categorization).forEach(([category, markets]) => {
        console.log(`      📋 ${category}: ${markets.length} mercados`);
        markets.slice(0, 3).forEach(market => {
          console.log(`         - ${market}`);
        });
        if (markets.length > 3) {
          console.log(`         ... y ${markets.length - 3} más`);
        }
      });
      
      this.testResults.step5.status = 'success';
      this.testResults.step5.data = mappingResults;
      
    } catch (error) {
      this.testResults.step5.status = 'error';
      this.testResults.step5.error = error.message;
      throw error;
    }
  }

  // PASO 6: Guardar en base de datos
  async step6_SaveToDatabase() {
    console.log('\n💾 PASO 6: Guardando en base de datos...');
    
    try {
      const selectedFixture = this.testResults.step3.data;
      
      console.log('   🔄 Iniciando sincronización dinámica...');
      
      // Usar el servicio de sincronización dinámico
      const syncResult = await oddsSync.syncFixtureOdds(selectedFixture.fixture.id);
      
      console.log(`✅ Sincronización completada:`);
      console.log(`   📊 ${syncResult.markets} mercados procesados`);
      console.log(`   💾 ${syncResult.created + syncResult.updated} odds guardadas`);
      console.log(`   🆕 ${syncResult.newMarkets || 0} nuevos mercados creados`);
      console.log(`   🎲 ${syncResult.bookmakers} bookmakers procesados`);
      console.log(`   ❌ ${syncResult.errors} errores`);
      
      // Verificar qué se guardó en BD
      const savedMarkets = await BettingMarket.findAll({
        where: {
          apiFootballId: {
            [require('sequelize').Op.in]: 
              this.testResults.step5.data.mappedMarkets.map(m => m.apiFootballId)
          }
        }
      });
      
      console.log(`   📋 Mercados en BD: ${savedMarkets.length}`);
      
      this.testResults.step6.status = 'success';
      this.testResults.step6.data = {
        syncResult,
        savedMarketsCount: savedMarkets.length
      };
      
    } catch (error) {
      this.testResults.step6.status = 'error';
      this.testResults.step6.error = error.message;
      throw error;
    }
  }

  // PASO 7: Verificar resultado final
  async step7_VerifyFinalResult() {
    console.log('\n🔍 PASO 7: Verificando resultado final...');
    
    try {
      const selectedFixture = this.testResults.step3.data;
      
      // Obtener odds usando el endpoint de la API
      console.log('   📡 Probando endpoint GET /api/odds/fixture/:id...');
      
      // Simular llamada al controlador
      const fixtureOdds = await oddsSync.getFixtureOdds(selectedFixture.fixture.id, 'Average');
      
      console.log(`✅ Endpoint funcional:`);
      console.log(`   📊 ${fixtureOdds.totalMarkets} mercados disponibles`);
      console.log(`   📋 ${fixtureOdds.totalCategories} categorías`);
      console.log(`   🎯 Sistema dinámico: ${fixtureOdds.isDynamic ? 'ACTIVO' : 'INACTIVO'}`);
      
      // Mostrar estructura de datos final
      console.log('\n   📊 ESTRUCTURA DE DATOS FINAL:');
      Object.entries(fixtureOdds.categorizedMarkets).forEach(([category, markets]) => {
        console.log(`      📋 ${category}:`);
        Object.entries(markets).slice(0, 2).forEach(([marketKey, marketData]) => {
          console.log(`         🎯 ${marketData.market.name}:`);
          Object.entries(marketData.odds).slice(0, 3).forEach(([outcome, oddData]) => {
            console.log(`            💰 ${outcome}: ${oddData.odds} (${oddData.impliedProbability.toFixed(1)}%)`);
          });
        });
      });
      
      this.testResults.step7.status = 'success';
      this.testResults.step7.data = {
        endpointWorking: true,
        finalStructure: fixtureOdds
      };
      
    } catch (error) {
      this.testResults.step7.status = 'error';
      this.testResults.step7.error = error.message;
      throw error;
    }
  }

  // Mostrar reporte final
  showFinalReport() {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 REPORTE FINAL DE PRUEBA - ODDS DINÁMICAS');
    console.log('═'.repeat(80));
    
    Object.entries(this.testResults).forEach(([stepKey, step]) => {
      const statusIcon = step.status === 'success' ? '✅' : 
                        step.status === 'error' ? '❌' : '⏳';
      
      console.log(`${statusIcon} ${step.name}: ${step.status.toUpperCase()}`);
      
      if (step.error) {
        console.log(`   🔍 Error: ${step.error}`);
      }
    });
    
    const successSteps = Object.values(this.testResults).filter(s => s.status === 'success').length;
    const totalSteps = Object.keys(this.testResults).length;
    
    console.log(`\n📈 RESULTADO: ${successSteps}/${totalSteps} pasos completados exitosamente`);
    
    if (successSteps === totalSteps) {
      console.log('🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
      console.log('🚀 Tu sistema de odds dinámicas está funcionando correctamente');
    } else {
      console.log('⚠️ Algunas pruebas fallaron - revisar errores arriba');
    }
    
    console.log('═'.repeat(80));
  }
}

// ✅ EJECUTAR PRUEBA
if (require.main === module) {
  const test = new OddsTestSuite();
  
  test.runCompleteTest()
    .then(() => {
      console.log('\n🎯 PRÓXIMOS PASOS:');
      console.log('   1. Revisar los datos obtenidos arriba');
      console.log('   2. Probar otros fixtures: node scripts/testOddsWithRealMatch.js');
      console.log('   3. Usar endpoints API: GET /api/odds/fixture/:id');
      console.log('   4. Ver estadísticas: GET /api/odds/stats');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Prueba falló:', error.message);
      process.exit(1);
    });
}

module.exports = OddsTestSuite;