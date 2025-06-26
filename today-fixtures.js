// 🏆 VISUALIZADOR DE PARTIDOS DE HOY - COMPLETO
// Ejecutar: node today-fixtures.js

const axios = require('axios');
const BASE_URL = 'http://localhost:3002';

// Colores para mejor visualización
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

// Estados de partidos con emojis
const statusEmojis = {
  'NS': '⏰',      // Not Started
  '1H': '▶️',      // First Half
  'HT': '⏸️',      // Half Time  
  '2H': '▶️',      // Second Half
  'FT': '✅',      // Full Time
  'PST': '⏳',     // Postponed
  'CANC': '❌',    // Cancelled
  'ET': '⏱️',      // Extra Time
  'PEN': '🥅',     // Penalties
  'AET': '⏱️'      // After Extra Time
};

// Función para formatear hora
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-PE', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/Lima'
  });
}

// Función para formatear fecha
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
}

// Función para obtener emoji del estado
function getStatusEmoji(status) {
  return statusEmojis[status] || '🔸';
}

// Función para obtener descripción del estado
function getStatusDescription(status, statusLong) {
  const descriptions = {
    'NS': 'Por comenzar',
    '1H': 'Primer tiempo',
    'HT': 'Descanso', 
    '2H': 'Segundo tiempo',
    'FT': 'Finalizado',
    'PST': 'Pospuesto',
    'CANC': 'Cancelado',
    'ET': 'Tiempo extra',
    'PEN': 'Penales',
    'AET': 'Después del tiempo extra'
  };
  
  return descriptions[status] || statusLong || status;
}

// Función principal
async function showTodayFixtures() {
  console.log(`${colors.bright}⚽ PARTIDOS DE HOY - ${new Date().toLocaleDateString('es-ES')}${colors.reset}`);
  console.log('='.repeat(80));
  
  try {
    // Obtener fixtures de hoy
    const response = await axios.get(`${BASE_URL}/api/fixtures/today`);
    
    if (!response.data.success) {
      console.log(`${colors.red}❌ Error obteniendo fixtures: ${response.data.message}${colors.reset}`);
      return;
    }
    
    const fixtures = response.data.data.fixtures;
    const totalFixtures = response.data.data.count;
    
    console.log(`${colors.cyan}📊 Total de partidos hoy: ${totalFixtures}${colors.reset}`);
    console.log(`${colors.cyan}📅 Fecha: ${formatDate(new Date())}${colors.reset}\n`);
    
    if (!fixtures || fixtures.length === 0) {
      console.log(`${colors.yellow}⚠️ No hay partidos programados para hoy${colors.reset}`);
      return;
    }
    
    // Agrupar por liga
    const fixturesByLeague = {};
    fixtures.forEach(fixture => {
      const leagueName = fixture.league?.name || 'Liga desconocida';
      if (!fixturesByLeague[leagueName]) {
        fixturesByLeague[leagueName] = [];
      }
      fixturesByLeague[leagueName].push(fixture);
    });
    
    // Agrupar por estado
    const fixturesByStatus = {};
    fixtures.forEach(fixture => {
      const status = fixture.status;
      if (!fixturesByStatus[status]) {
        fixturesByStatus[status] = [];
      }
      fixturesByStatus[status].push(fixture);
    });
    
    // Mostrar resumen por estado
    console.log(`${colors.bright}📈 RESUMEN POR ESTADO:${colors.reset}`);
    Object.entries(fixturesByStatus).forEach(([status, statusFixtures]) => {
      const emoji = getStatusEmoji(status);
      const description = getStatusDescription(status);
      console.log(`   ${emoji} ${description}: ${statusFixtures.length} partidos`);
    });
    
    console.log(`\n${colors.bright}🏆 RESUMEN POR LIGA:${colors.reset}`);
    Object.entries(fixturesByLeague).forEach(([league, leagueFixtures]) => {
      console.log(`   🏆 ${league}: ${leagueFixtures.length} partidos`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Mostrar partidos agrupados por liga
    console.log(`${colors.bright}⚽ PARTIDOS DETALLADOS POR LIGA:${colors.reset}\n`);
    
    // Ordenar ligas por número de partidos (mayor a menor)
    const sortedLeagues = Object.entries(fixturesByLeague)
      .sort(([,a], [,b]) => b.length - a.length);
    
    sortedLeagues.forEach(([leagueName, leagueFixtures], leagueIndex) => {
      console.log(`${colors.magenta}🏆 ${leagueName.toUpperCase()}${colors.reset}`);
      console.log(`${colors.cyan}   País: ${leagueFixtures[0].league?.country || 'N/A'}${colors.reset}`);
      console.log(`   📊 ${leagueFixtures.length} partidos\n`);
      
      // Ordenar partidos por hora
      const sortedFixtures = leagueFixtures.sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
      
      sortedFixtures.forEach((fixture, index) => {
        const statusEmoji = getStatusEmoji(fixture.status);
        const statusDesc = getStatusDescription(fixture.status, fixture.statusLong);
        const time = formatTime(fixture.date);
        
        // Información básica del partido
        console.log(`   ${index + 1}. ${statusEmoji} ${colors.bright}${fixture.homeTeam?.name || 'Equipo Local'}${colors.reset} vs ${colors.bright}${fixture.awayTeam?.name || 'Equipo Visitante'}${colors.reset}`);
        console.log(`      ⏰ ${time} | 📍 ${statusDesc}`);
        
        // Mostrar resultado si el partido ha comenzado o terminado
        if (fixture.status !== 'NS' && fixture.status !== 'PST' && fixture.status !== 'CANC') {
          const homeScore = fixture.score?.home ?? fixture.homeScore ?? '-';
          const awayScore = fixture.score?.away ?? fixture.awayScore ?? '-';
          console.log(`      📊 Resultado: ${homeScore} - ${awayScore}`);
          
          if (fixture.elapsed) {
            console.log(`      ⏱️ Minuto: ${fixture.elapsed}'`);
          }
        }
        
        // Información adicional
        if (fixture.venue) {
          console.log(`      🏟️ Estadio: ${fixture.venue}`);
        }
        
        if (fixture.city) {
          console.log(`      🌆 Ciudad: ${fixture.city}`);
        }
        
        if (fixture.round) {
          console.log(`      🎯 Jornada: ${fixture.round}`);
        }
        
        if (fixture.referee) {
          console.log(`      👨‍⚖️ Árbitro: ${fixture.referee}`);
        }
        
        // Indicar si está disponible para torneos
        if (fixture.isAvailableForTournament) {
          console.log(`      🎮 ${colors.green}Disponible para torneos${colors.reset}`);
        }
        
        console.log(`      🆔 ID: ${colors.cyan}${fixture.id}${colors.reset}`);
        console.log('');
      });
      
      console.log('-'.repeat(60) + '\n');
    });
    
    // Mostrar partidos en vivo si los hay
    const liveFixtures = fixtures.filter(f => 
      ['1H', '2H', 'HT', 'ET', 'PEN'].includes(f.status)
    );
    
    if (liveFixtures.length > 0) {
      console.log(`${colors.bright}🔴 PARTIDOS EN VIVO AHORA:${colors.reset}\n`);
      
      liveFixtures.forEach((fixture, index) => {
        const statusEmoji = getStatusEmoji(fixture.status);
        const statusDesc = getStatusDescription(fixture.status, fixture.statusLong);
        const homeScore = fixture.score?.home ?? fixture.homeScore ?? '0';
        const awayScore = fixture.score?.away ?? fixture.awayScore ?? '0';
        
        console.log(`${index + 1}. ${statusEmoji} ${colors.bright}${fixture.homeTeam?.name}${colors.reset} ${colors.yellow}${homeScore} - ${awayScore}${colors.reset} ${colors.bright}${fixture.awayTeam?.name}${colors.reset}`);
        console.log(`   📺 ${statusDesc} | ⏱️ ${fixture.elapsed ? fixture.elapsed + "'" : ''}`);
        console.log(`   🏆 ${fixture.league?.name}`);
        console.log('');
      });
    }
    
    // Próximos partidos (siguientes 3 horas)
    const now = new Date();
    const next3Hours = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    
    const upcomingFixtures = fixtures.filter(f => {
      const fixtureDate = new Date(f.date);
      return f.status === 'NS' && fixtureDate >= now && fixtureDate <= next3Hours;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (upcomingFixtures.length > 0) {
      console.log(`${colors.bright}⏰ PRÓXIMOS PARTIDOS (Siguientes 3 horas):${colors.reset}\n`);
      
      upcomingFixtures.slice(0, 10).forEach((fixture, index) => {
        const time = formatTime(fixture.date);
        console.log(`${index + 1}. ⏰ ${time} - ${colors.bright}${fixture.homeTeam?.name}${colors.reset} vs ${colors.bright}${fixture.awayTeam?.name}${colors.reset}`);
        console.log(`   🏆 ${fixture.league?.name} | 🌆 ${fixture.city || 'N/A'}`);
        console.log('');
      });
    }
    
    // Estadísticas finales
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bright}📊 ESTADÍSTICAS DEL DÍA:${colors.reset}`);
    console.log(`   ⚽ Total partidos: ${totalFixtures}`);
    console.log(`   🏆 Ligas diferentes: ${Object.keys(fixturesByLeague).length}`);
    console.log(`   🔴 Partidos en vivo: ${liveFixtures.length}`);
    console.log(`   ⏰ Próximos (3h): ${upcomingFixtures.length}`);
    console.log(`   ✅ Finalizados: ${fixturesByStatus['FT']?.length || 0}`);
    console.log(`   ⏰ Por comenzar: ${fixturesByStatus['NS']?.length || 0}`);
    
    console.log(`\n${colors.cyan}💡 Para ver odds de un partido específico, usa:${colors.reset}`);
    console.log(`   curl "http://localhost:3002/api/odds/fixture/FIXTURE_ID/best"`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Error obteniendo partidos de hoy:${colors.reset}`, error.message);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`URL: ${error.config?.url}`);
    }
  }
}

// Función para mostrar solo partidos de una liga específica
async function showLeagueFixtures(leagueName) {
  try {
    const response = await axios.get(`${BASE_URL}/api/fixtures/today`);
    const fixtures = response.data.data.fixtures;
    
    const leagueFixtures = fixtures.filter(f => 
      f.league?.name?.toLowerCase().includes(leagueName.toLowerCase())
    );
    
    console.log(`${colors.bright}🏆 PARTIDOS DE: ${leagueName.toUpperCase()}${colors.reset}\n`);
    
    if (leagueFixtures.length === 0) {
      console.log(`${colors.yellow}⚠️ No hay partidos de "${leagueName}" hoy${colors.reset}`);
      return;
    }
    
    leagueFixtures.forEach((fixture, index) => {
      const statusEmoji = getStatusEmoji(fixture.status);
      const time = formatTime(fixture.date);
      const statusDesc = getStatusDescription(fixture.status, fixture.statusLong);
      
      console.log(`${index + 1}. ${statusEmoji} ${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name}`);
      console.log(`   ⏰ ${time} | 📍 ${statusDesc}`);
      console.log(`   🆔 ${fixture.id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Ejecutar
if (process.argv[2]) {
  // Si se pasa un argumento, buscar esa liga específica
  showLeagueFixtures(process.argv[2]);
} else {
  // Mostrar todos los partidos
  showTodayFixtures();
}

// Ejemplos de uso:
// node today-fixtures.js                    // Todos los partidos
// node today-fixtures.js "Premier League"   // Solo Premier League
// node today-fixtures.js "La Liga"          // Solo La Liga