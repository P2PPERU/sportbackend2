// 🔥 juventus-city-all-bets.js - TODAS LAS APUESTAS DEL FIXTURE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ejecutar: node juventus-city-all-bets.js

const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Datos del partido
const FIXTURE_ID = "52ee8142-6c68-4f32-8508-7094cfdd8cd7";
const FIXTURE_INFO = {
  homeTeam: "Juventus",
  awayTeam: "Manchester City",
  competition: "FIFA Club World Cup",
  date: "26/06/2025, 14:00 (Perú)",
  venue: "Camping World Stadium, Orlando"
};

async function getAllFixtureBets() {
  console.log(`${colors.bright}🔥 TODAS LAS APUESTAS: JUVENTUS vs MANCHESTER CITY${colors.reset}\n`);
  
  console.log(`${colors.cyan}📋 INFORMACIÓN DEL PARTIDO:${colors.reset}`);
  console.log(`   🏠 ${FIXTURE_INFO.homeTeam} vs ${FIXTURE_INFO.awayTeam} ✈️`);
  console.log(`   🏆 ${FIXTURE_INFO.competition}`);
  console.log(`   📅 ${FIXTURE_INFO.date}`);
  console.log(`   🏟️ ${FIXTURE_INFO.venue}`);
  console.log(`   🔢 Fixture ID: ${FIXTURE_ID}\n`);

  const baseUrl = 'http://localhost:3002';

  // 1. Obtener todas las odds disponibles (todas las casas)
  try {
    console.log(`${colors.cyan}🎲 CONSULTANDO TODAS LAS APUESTAS DISPONIBLES...${colors.reset}`);
    
    const allOddsResponse = await axios.get(`${baseUrl}/api/odds/fixture/${FIXTURE_ID}`);
    
    if (allOddsResponse.data.success && allOddsResponse.data.data.odds) {
      const markets = allOddsResponse.data.data.odds;
      const bookmaker = allOddsResponse.data.data.bookmaker;
      const lastSync = allOddsResponse.data.data.lastSync;
      
      console.log(`${colors.green}✅ Apuestas encontradas!${colors.reset}`);
      console.log(`${colors.cyan}🏪 Casa de apuestas: ${bookmaker}${colors.reset}`);
      console.log(`${colors.cyan}🕐 Última actualización: ${new Date(lastSync).toLocaleString('es-PE')}${colors.reset}\n`);
      
      displayAllMarkets(markets);
      
    } else {
      console.log(`${colors.yellow}⚠️ No hay odds disponibles para este partido${colors.reset}`);
      console.log(`${colors.cyan}🔄 Intentando con diferentes casas de apuestas...${colors.reset}\n`);
      
      await tryDifferentBookmakers();
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Error obteniendo odds: ${error.message}${colors.reset}`);
    
    if (error.response?.status === 404) {
      console.log(`${colors.yellow}💡 Fixture no encontrado en sistema de odds${colors.reset}`);
    }
    
    await tryDifferentBookmakers();
  }

  // 2. Obtener mejores odds de todas las casas
  try {
    console.log(`\n${colors.cyan}🏆 CONSULTANDO MEJORES ODDS DE TODAS LAS CASAS...${colors.reset}`);
    
    const bestOddsResponse = await axios.get(`${baseUrl}/api/odds/fixture/${FIXTURE_ID}/best`);
    
    if (bestOddsResponse.data.success && bestOddsResponse.data.data.bestOdds) {
      console.log(`${colors.green}✅ Mejores odds encontradas de múltiples casas!${colors.reset}\n`);
      
      displayBestOddsDetailed(bestOddsResponse.data.data.bestOdds);
    }
    
  } catch (bestError) {
    console.log(`${colors.yellow}⚠️ Error obteniendo mejores odds: ${bestError.message}${colors.reset}`);
  }

  // 3. Resumen y recomendaciones
  displayBettingRecommendations();
  
  // 4. URLs para consulta manual
  displayManualUrls();
}

async function tryDifferentBookmakers() {
  const bookmakers = ['Average', 'Bet365', 'William Hill', 'Betfair', 'Unibet', 'Pinnacle', '1xBet'];
  
  console.log(`${colors.cyan}🔍 Probando diferentes casas de apuestas...${colors.reset}\n`);
  
  for (const bookmaker of bookmakers) {
    try {
      const response = await axios.get(`http://localhost:3002/api/odds/fixture/${FIXTURE_ID}?bookmaker=${bookmaker}`);
      
      if (response.data.success && response.data.data.odds) {
        console.log(`${colors.green}✅ ${bookmaker} - Odds encontradas!${colors.reset}`);
        
        const markets = response.data.data.odds;
        const marketCount = Object.keys(markets).length;
        
        console.log(`   📊 ${marketCount} mercados disponibles en ${bookmaker}\n`);
        
        // Mostrar solo mercados principales para no saturar
        displayMainMarkets(markets, bookmaker);
        
        return; // Terminar al encontrar la primera casa con datos
      } else {
        console.log(`   ${colors.yellow}⚠️ ${bookmaker} - Sin datos${colors.reset}`);
      }
      
    } catch (error) {
      console.log(`   ${colors.red}❌ ${bookmaker} - Error: ${error.message}${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.red}❌ No se encontraron odds en ninguna casa de apuestas${colors.reset}`);
  displayTroubleshooting();
}

function displayAllMarkets(markets) {
  console.log(`${colors.bright}📊 TODOS LOS MERCADOS DISPONIBLES:${colors.reset}\n`);
  
  let marketNumber = 1;
  
  Object.entries(markets).forEach(([marketKey, marketData]) => {
    console.log(`${colors.yellow}${marketNumber}. ${marketData.market.name}${colors.reset}`);
    console.log(`   🔑 Clave: ${colors.green}${marketKey}${colors.reset}`);
    console.log(`   📝 Categoría: ${marketData.market.category}`);
    
    // Mostrar todas las odds del mercado
    Object.entries(marketData.odds).forEach(([outcome, oddData]) => {
      const emoji = getOutcomeEmoji(outcome, marketKey);
      const description = getOutcomeDescription(outcome, marketKey);
      
      console.log(`      ${emoji} ${description}: ${colors.bright}${oddData.odds}${colors.reset} (${oddData.impliedProbability.toFixed(1)}% prob)`);
    });
    
    console.log();
    marketNumber++;
  });
  
  console.log(`${colors.cyan}📊 Total de mercados: ${Object.keys(markets).length}${colors.reset}\n`);
}

function displayMainMarkets(markets, bookmaker) {
  console.log(`${colors.bright}📊 MERCADOS PRINCIPALES - ${bookmaker}:${colors.reset}\n`);
  
  // Mercados principales en orden de importancia
  const mainMarkets = ['1X2', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE', 'HT_1X2', 'HT_FT'];
  
  mainMarkets.forEach((marketKey, index) => {
    if (markets[marketKey]) {
      const marketData = markets[marketKey];
      console.log(`${colors.yellow}${index + 1}. ${marketData.market.name}${colors.reset}`);
      
      Object.entries(marketData.odds).forEach(([outcome, oddData]) => {
        const emoji = getOutcomeEmoji(outcome, marketKey);
        const description = getOutcomeDescription(outcome, marketKey);
        
        console.log(`   ${emoji} ${description}: ${colors.bright}${oddData.odds}${colors.reset} (${oddData.impliedProbability.toFixed(1)}%)`);
      });
      
      console.log();
    }
  });
}

function displayBestOddsDetailed(bestOddsData) {
  console.log(`${colors.bright}🏆 MEJORES ODDS POR MERCADO (Comparando todas las casas):${colors.reset}\n`);
  
  let marketNumber = 1;
  
  Object.entries(bestOddsData).forEach(([marketKey, marketData]) => {
    console.log(`${colors.yellow}${marketNumber}. ${marketData.market.name}${colors.reset}`);
    console.log(`   📝 Categoría: ${marketData.market.category}`);
    
    Object.entries(marketData.bestOdds).forEach(([outcome, oddData]) => {
      const emoji = getOutcomeEmoji(outcome, marketKey);
      const description = getOutcomeDescription(outcome, marketKey);
      
      console.log(`   ${emoji} ${description}:`);
      console.log(`      💰 Mejor cuota: ${colors.bright}${oddData.odds}${colors.reset}`);
      console.log(`      🏪 Casa: ${colors.cyan}${oddData.bookmaker}${colors.reset}`);
      console.log(`      🕐 Actualizada: ${new Date(oddData.lastUpdated).toLocaleString('es-PE')}`);
    });
    
    console.log();
    marketNumber++;
  });
}

function displayBettingRecommendations() {
  console.log(`${colors.bright}💡 RECOMENDACIONES DE APUESTAS:${colors.reset}\n`);
  
  console.log(`${colors.green}🔰 PARA PRINCIPIANTES:${colors.reset}`);
  console.log(`   1. ${colors.yellow}Match Winner (1X2)${colors.reset} - Apuesta más simple`);
  console.log(`      🏠 Juventus gana, 🤝 Empate, ✈️ Manchester City gana`);
  console.log(`   2. ${colors.yellow}Both Teams Score${colors.reset} - Fácil de entender`);
  console.log(`      ✅ Ambos marcan gol, ❌ Al menos uno no marca`);
  
  console.log(`\n${colors.blue}⚡ APUESTAS INTERMEDIAS:${colors.reset}`);
  console.log(`   1. ${colors.yellow}Over/Under 2.5 Goals${colors.reset} - Basada en estadísticas`);
  console.log(`      📈 Más de 2 goles, 📉 2 goles o menos`);
  console.log(`   2. ${colors.yellow}Double Chance${colors.reset} - Más segura`);
  console.log(`      🛡️ Dos resultados en una apuesta`);
  
  console.log(`\n${colors.magenta}🚀 APUESTAS AVANZADAS:${colors.reset}`);
  console.log(`   1. ${colors.yellow}HT/FT (Halftime/Fulltime)${colors.reset} - Alta ganancia`);
  console.log(`      🎯 Resultado al descanso + resultado final`);
  console.log(`   2. ${colors.yellow}Exact Score${colors.reset} - Máximo riesgo/beneficio`);
  console.log(`      ⚽ Resultado exacto del partido`);
  
  console.log(`\n${colors.cyan}💰 ESTRATEGIAS COMBINADAS:${colors.reset}`);
  console.log(`   • ${colors.green}Conservadora${colors.reset}: City gana + Ambos marcan`);
  console.log(`   • ${colors.yellow}Equilibrada${colors.reset}: Over 2.5 + City gana`);
  console.log(`   • ${colors.red}Arriesgada${colors.reset}: Juventus gana + Over 2.5`);
}

function displayManualUrls() {
  console.log(`\n${colors.cyan}🔗 URLS PARA CONSULTA MANUAL:${colors.reset}\n`);
  
  const baseUrl = 'http://localhost:3002';
  
  console.log(`${colors.bright}📊 ODDS DEL PARTIDO:${colors.reset}`);
  console.log(`   💰 Todas las odds: ${baseUrl}/api/odds/fixture/${FIXTURE_ID}`);
  console.log(`   🏆 Mejores odds: ${baseUrl}/api/odds/fixture/${FIXTURE_ID}/best`);
  
  console.log(`\n${colors.bright}🏪 POR CASA DE APUESTAS:${colors.reset}`);
  console.log(`   📊 Promedio: ${baseUrl}/api/odds/fixture/${FIXTURE_ID}?bookmaker=Average`);
  console.log(`   🎯 Bet365: ${baseUrl}/api/odds/fixture/${FIXTURE_ID}?bookmaker=Bet365`);
  console.log(`   ⚡ 1xBet: ${baseUrl}/api/odds/fixture/${FIXTURE_ID}?bookmaker=1xBet`);
  console.log(`   🔥 Unibet: ${baseUrl}/api/odds/fixture/${FIXTURE_ID}?bookmaker=Unibet`);
  
  console.log(`\n${colors.bright}📋 INFORMACIÓN ADICIONAL:${colors.reset}`);
  console.log(`   ⚽ Info partido: ${baseUrl}/api/fixtures/${FIXTURE_ID}`);
  console.log(`   📊 Mercados disponibles: ${baseUrl}/api/odds/markets`);
  console.log(`   🏪 Todas las casas: ${baseUrl}/api/odds/bookmakers`);
}

function displayTroubleshooting() {
  console.log(`\n${colors.cyan}🔧 RESOLUCIÓN DE PROBLEMAS:${colors.reset}\n`);
  
  console.log(`${colors.yellow}💡 POSIBLES CAUSAS:${colors.reset}`);
  console.log(`   1. Odds aún no sincronizadas desde API-Football`);
  console.log(`   2. Competición muy nueva (Mundial Clubes 2025)`);
  console.log(`   3. Partido programado para el futuro`);
  console.log(`   4. API-Football no tiene odds para esta competición`);
  
  console.log(`\n${colors.green}✅ SOLUCIONES:${colors.reset}`);
  console.log(`   1. Esperar sincronización automática`);
  console.log(`   2. Forzar sincronización (admin)`);
  console.log(`   3. Verificar otros partidos con odds`);
  console.log(`   4. Consultar directamente API-Football`);
  
  console.log(`\n${colors.cyan}🔄 COMANDOS ÚTILES:${colors.reset}`);
  console.log(`   • Fixtures hoy: GET /api/fixtures/today`);
  console.log(`   • Odds hoy: GET /api/odds/today`);
  console.log(`   • Mercados: GET /api/odds/markets`);
}

// Funciones auxiliares
function getOutcomeEmoji(outcome, marketKey) {
  const emojiMap = {
    'HOME': '🏠',
    'AWAY': '✈️',
    'DRAW': '🤝',
    'OVER': '📈',
    'UNDER': '📉',
    'YES': '✅',
    'NO': '❌',
    '1X': '🛡️',
    'X2': '🔷',
    '12': '🔥',
    'ODD': '🔢',
    'EVEN': '⚪',
    'HOME_HOME': '🏠🏠',
    'HOME_DRAW': '🏠🤝',
    'HOME_AWAY': '🏠✈️',
    'DRAW_HOME': '🤝🏠',
    'DRAW_DRAW': '🤝🤝',
    'DRAW_AWAY': '🤝✈️',
    'AWAY_HOME': '✈️🏠',
    'AWAY_DRAW': '✈️🤝',
    'AWAY_AWAY': '✈️✈️'
  };
  
  return emojiMap[outcome] || '⚽';
}

function getOutcomeDescription(outcome, marketKey) {
  const descriptions = {
    'HOME': FIXTURE_INFO.homeTeam,
    'AWAY': FIXTURE_INFO.awayTeam,
    'DRAW': 'Empate',
    'OVER': 'Más',
    'UNDER': 'Menos',
    'YES': 'Sí',
    'NO': 'No',
    '1X': `${FIXTURE_INFO.homeTeam} o Empate`,
    'X2': `Empate o ${FIXTURE_INFO.awayTeam}`,
    '12': 'Local o Visitante',
    'ODD': 'Impar',
    'EVEN': 'Par',
    'HOME_HOME': `${FIXTURE_INFO.homeTeam} / ${FIXTURE_INFO.homeTeam}`,
    'HOME_DRAW': `${FIXTURE_INFO.homeTeam} / Empate`,
    'HOME_AWAY': `${FIXTURE_INFO.homeTeam} / ${FIXTURE_INFO.awayTeam}`,
    'DRAW_HOME': `Empate / ${FIXTURE_INFO.homeTeam}`,
    'DRAW_DRAW': 'Empate / Empate',
    'DRAW_AWAY': `Empate / ${FIXTURE_INFO.awayTeam}`,
    'AWAY_HOME': `${FIXTURE_INFO.awayTeam} / ${FIXTURE_INFO.homeTeam}`,
    'AWAY_DRAW': `${FIXTURE_INFO.awayTeam} / Empate`,
    'AWAY_AWAY': `${FIXTURE_INFO.awayTeam} / ${FIXTURE_INFO.awayTeam}`
  };
  
  return descriptions[outcome] || outcome;
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  getAllFixtureBets().catch(console.error);
}

module.exports = getAllFixtureBets;