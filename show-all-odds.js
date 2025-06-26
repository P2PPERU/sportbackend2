// 🔍 MOSTRAR TODAS LAS ODDS SIN FILTROS - RAW DATA
// Ejecutar: node show-all-odds.js

const axios = require('axios');
const BASE_URL = 'http://localhost:3002';

// Colores
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// IDs de los partidos del Mundial de Clubes
const worldCupFixtures = [
  {
    id: 'a45e00a7-1776-445a-a854-83d47db9c97f',
    name: 'Mamelodi Sundowns vs Fluminense'
  },
  {
    id: '767058ef-45c6-4751-afb3-472ec58d3faa', 
    name: 'Borussia Dortmund vs Ulsan Hyundai FC'
  }
];

async function showAllOddsRaw(fixtureId, fixtureName) {
  console.log(`${colors.bright}🏆 ${fixtureName}${colors.reset}`);
  console.log(`🆔 ${fixtureId}`);
  console.log('='.repeat(80));
  
  try {
    // 1. Probar endpoint /best 
    console.log(`${colors.yellow}📊 1. ENDPOINT /best (mejores odds):${colors.reset}\n`);
    
    const bestResponse = await axios.get(`${BASE_URL}/api/odds/fixture/${fixtureId}/best`);
    
    console.log('📋 Estructura completa de respuesta:');
    console.log('Status:', bestResponse.status);
    console.log('Success:', bestResponse.data.success);
    console.log('Message:', bestResponse.data.message);
    
    if (bestResponse.data.data) {
      console.log('\n📊 Data keys:', Object.keys(bestResponse.data.data));
      
      if (bestResponse.data.data.bestOdds) {
        const markets = bestResponse.data.data.bestOdds;
        const marketKeys = Object.keys(markets);
        
        console.log(`\n🎯 TOTAL MERCADOS ENCONTRADOS: ${marketKeys.length}`);
        console.log(`📋 Mercados: ${marketKeys.join(', ')}\n`);
        
        // Mostrar TODOS los mercados sin filtrar
        Object.entries(markets).forEach(([marketKey, marketData], index) => {
          console.log(`${colors.green}${index + 1}. ${marketKey}${colors.reset}`);
          console.log(`   Nombre: ${marketData.market?.name || 'N/A'}`);
          console.log(`   Categoría: ${marketData.market?.category || 'N/A'}`);
          
          if (marketData.bestOdds) {
            console.log('   Outcomes:');
            Object.entries(marketData.bestOdds).forEach(([outcome, data]) => {
              console.log(`     ${outcome}: ${data.odds} (${data.bookmaker})`);
            });
          }
          console.log('');
        });
        
      } else {
        console.log('❌ No bestOdds found');
      }
    }
    
    console.log('\n' + '-'.repeat(80));
    
    // 2. Probar endpoint sin /best (odds normales)
    console.log(`${colors.yellow}📊 2. ENDPOINT NORMAL (sin /best):${colors.reset}\n`);
    
    const normalResponse = await axios.get(`${BASE_URL}/api/odds/fixture/${fixtureId}`);
    
    console.log('📋 Estructura de respuesta normal:');
    console.log('Status:', normalResponse.status);
    console.log('Success:', normalResponse.data.success);
    
    if (normalResponse.data.data) {
      console.log('Data keys:', Object.keys(normalResponse.data.data));
      console.log('Bookmaker:', normalResponse.data.data.bookmaker);
      
      if (normalResponse.data.data.markets) {
        const markets = normalResponse.data.data.markets;
        const marketKeys = Object.keys(markets);
        
        console.log(`\n🎯 MERCADOS EN ENDPOINT NORMAL: ${marketKeys.length}`);
        console.log(`📋 Mercados: ${marketKeys.join(', ')}\n`);
        
        // Mostrar algunos mercados del endpoint normal
        Object.entries(markets).slice(0, 5).forEach(([marketKey, marketData], index) => {
          console.log(`${colors.cyan}${index + 1}. ${marketKey}${colors.reset}`);
          console.log(`   Nombre: ${marketData.market?.name || 'N/A'}`);
          
          if (marketData.odds) {
            console.log('   Odds:');
            Object.entries(marketData.odds).forEach(([outcome, data]) => {
              console.log(`     ${outcome}: ${data.odds}`);
            });
          }
          console.log('');
        });
        
        if (marketKeys.length > 5) {
          console.log(`... y ${marketKeys.length - 5} mercados más\n`);
        }
        
      } else {
        console.log('❌ No markets found en endpoint normal');
        console.log('Data completa:', JSON.stringify(normalResponse.data.data, null, 2));
      }
    }
    
    console.log('\n' + '-'.repeat(80));
    
    // 3. Probar con diferentes bookmakers
    console.log(`${colors.yellow}📊 3. PROBANDO BOOKMAKERS ESPECÍFICOS:${colors.reset}\n`);
    
    const bookmakers = ['Bet365', 'Average', '1xBet', 'Unibet', 'Betway'];
    
    for (const bookmaker of bookmakers) {
      try {
        console.log(`🏪 Probando ${bookmaker}...`);
        const bmResponse = await axios.get(`${BASE_URL}/api/odds/fixture/${fixtureId}?bookmaker=${bookmaker}`);
        
        if (bmResponse.data.data?.markets) {
          const marketsCount = Object.keys(bmResponse.data.data.markets).length;
          console.log(`   ✅ ${marketsCount} mercados disponibles`);
          
          if (marketsCount > 0) {
            const firstMarket = Object.keys(bmResponse.data.data.markets)[0];
            const firstMarketData = bmResponse.data.data.markets[firstMarket];
            console.log(`   📊 Ejemplo: ${firstMarket} - ${Object.keys(firstMarketData.odds || {}).length} outcomes`);
          }
        } else {
          console.log(`   ❌ Sin mercados`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.response?.status || error.message}`);
      }
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Error general: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

async function showAllWorldCupOdds() {
  console.log(`${colors.bright}🔍 ANÁLISIS COMPLETO - FIFA CLUB WORLD CUP${colors.reset}`);
  console.log(`${colors.cyan}Mostrando TODAS las odds sin filtros${colors.reset}`);
  console.log('='.repeat(80) + '\n');
  
  for (const fixture of worldCupFixtures) {
    await showAllOddsRaw(fixture.id, fixture.name);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa
  }
  
  console.log(`${colors.bright}💡 CONCLUSIONES:${colors.reset}`);
  console.log('1. Si Postman muestra muchas odds, entonces están disponibles');
  console.log('2. El problema puede estar en cómo se procesan los datos');
  console.log('3. Verificar estructura exacta de respuesta');
  console.log('4. Comprobar si hay filtros que limiten los resultados');
  
  console.log(`\n${colors.cyan}🔗 PRUEBA MANUAL CON CURL:${colors.reset}`);
  worldCupFixtures.forEach(fixture => {
    console.log(`curl "${BASE_URL}/api/odds/fixture/${fixture.id}/best" | jq .`);
    console.log(`curl "${BASE_URL}/api/odds/fixture/${fixture.id}" | jq .`);
  });
}

// Función para probar un fixture específico
async function testSpecificFixture(fixtureId) {
  console.log(`${colors.bright}🎯 ANÁLISIS DETALLADO DEL FIXTURE: ${fixtureId}${colors.reset}\n`);
  
  try {
    // Probar todos los endpoints posibles
    const endpoints = [
      '/best',
      '',
      '?bookmaker=Average',
      '?bookmaker=Bet365',
      '?bookmaker=1xBet'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`${colors.yellow}🔍 Probando: /api/odds/fixture/${fixtureId}${endpoint}${colors.reset}`);
      
      try {
        const response = await axios.get(`${BASE_URL}/api/odds/fixture/${fixtureId}${endpoint}`);
        
        console.log(`✅ Status: ${response.status}`);
        console.log(`✅ Success: ${response.data.success}`);
        
        // Analizar estructura de datos
        if (response.data.data) {
          if (response.data.data.bestOdds) {
            console.log(`📊 bestOdds: ${Object.keys(response.data.data.bestOdds).length} mercados`);
          }
          if (response.data.data.markets) {
            console.log(`📊 markets: ${Object.keys(response.data.data.markets).length} mercados`);
          }
          if (response.data.data.odds) {
            console.log(`📊 odds: ${Object.keys(response.data.data.odds).length} items`);
          }
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.response?.status || error.message}`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Verificar argumentos
const arg = process.argv[2];

if (arg && arg.length > 10) {
  // Probar fixture específico
  testSpecificFixture(arg);
} else {
  // Mostrar todos los del Mundial de Clubes
  showAllWorldCupOdds();
}

// Ejemplos de uso:
// node show-all-odds.js                                    // Mundial de Clubes completo
// node show-all-odds.js a45e00a7-1776-445a-a854-83d47db9c97f    // Fixture específico