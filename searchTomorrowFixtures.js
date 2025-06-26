// 📄 searchTomorrowFixtures.js - BUSCAR PARTIDOS DE MAÑANA Y DIFERENTES FECHAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const axios = require('axios');

async function searchMultipleDays() {
  console.log('📅 BUSCANDO RIVER VS INTER EN MÚLTIPLES FECHAS');
  console.log('═'.repeat(60));
  
  const BASE_URL = 'http://localhost:3002';
  
  // Generar fechas: ayer, hoy, mañana, pasado mañana
  const dates = [];
  for (let i = -1; i <= 3; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push({
      date: date.toISOString().split('T')[0],
      label: i === -1 ? 'Ayer' : i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : i === 2 ? 'Pasado mañana' : `+${i} días`
    });
  }
  
  console.log(`🔍 Buscando en: ${dates.map(d => `${d.label} (${d.date})`).join(', ')}`);
  
  let allFixtures = [];
  let riverInterMatch = null;
  
  try {
    // Buscar en cada fecha
    for (const dateInfo of dates) {
      console.log(`\n📅 Buscando fixtures del ${dateInfo.label} (${dateInfo.date})...`);
      
      try {
        const response = await axios.get(`${BASE_URL}/api/fixtures/search?date=${dateInfo.date}&limit=500`);
        const fixtures = response.data.data.fixtures;
        
        console.log(`   📊 Total fixtures: ${fixtures.length}`);
        
        // Buscar River vs Inter
        const riverInter = fixtures.find(fixture => 
          (fixture.homeTeam.name.toLowerCase().includes('river') && fixture.awayTeam.name.toLowerCase().includes('inter')) ||
          (fixture.homeTeam.name.toLowerCase().includes('inter') && fixture.awayTeam.name.toLowerCase().includes('river')) ||
          (fixture.homeTeam.name.toLowerCase().includes('plate') && fixture.awayTeam.name.toLowerCase().includes('inter')) ||
          (fixture.homeTeam.name.toLowerCase().includes('inter') && fixture.awayTeam.name.toLowerCase().includes('plate'))
        );
        
        if (riverInter) {
          console.log(`   🎯 ¡RIVER VS INTER ENCONTRADO EN ${dateInfo.label.toUpperCase()}!`);
          console.log(`      ${riverInter.homeTeam.name} vs ${riverInter.awayTeam.name}`);
          console.log(`      🏆 Liga: ${riverInter.league.name}`);
          console.log(`      📅 Fecha UTC: ${riverInter.date}`);
          console.log(`      📅 Fecha Local Perú: ${new Date(riverInter.date).toLocaleString('es-PE', { timeZone: 'America/Lima' })}`);
          console.log(`      📊 Estado: ${riverInter.status}`);
          console.log(`      📋 UUID: ${riverInter.id}`);
          
          riverInterMatch = riverInter;
        }
        
        // Buscar Mundial de Clubes en esta fecha
        const worldCupMatches = fixtures.filter(fixture => 
          fixture.league.name.includes('FIFA Club World Cup') || 
          fixture.league.name.includes('Club World')
        );
        
        if (worldCupMatches.length > 0) {
          console.log(`   🏆 Mundial de Clubes en ${dateInfo.label}: ${worldCupMatches.length} partidos`);
          worldCupMatches.forEach((match, index) => {
            const localTime = new Date(match.date).toLocaleString('es-PE', {
              timeZone: 'America/Lima',
              hour: '2-digit',
              minute: '2-digit'
            });
            console.log(`      ${index + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name} (${localTime})`);
          });
        }
        
        // Buscar cualquier partido con River
        const riverMatches = fixtures.filter(fixture => 
          fixture.homeTeam.name.toLowerCase().includes('river') || 
          fixture.awayTeam.name.toLowerCase().includes('river') ||
          fixture.homeTeam.name.toLowerCase().includes('plate') || 
          fixture.awayTeam.name.toLowerCase().includes('plate')
        );
        
        if (riverMatches.length > 0) {
          console.log(`   🔵 Partidos de River en ${dateInfo.label}: ${riverMatches.length}`);
          riverMatches.forEach((match, index) => {
            const localTime = new Date(match.date).toLocaleString('es-PE', {
              timeZone: 'America/Lima',
              hour: '2-digit',
              minute: '2-digit'
            });
            console.log(`      ${index + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name} (${localTime}) - ${match.league.name}`);
          });
        }
        
        // Buscar cualquier partido con Inter
        const interMatches = fixtures.filter(fixture => 
          fixture.homeTeam.name.toLowerCase().includes('inter')
        );
        
        if (interMatches.length > 0) {
          console.log(`   ⚫ Partidos de Inter en ${dateInfo.label}: ${interMatches.length}`);
          interMatches.forEach((match, index) => {
            const localTime = new Date(match.date).toLocaleString('es-PE', {
              timeZone: 'America/Lima',
              hour: '2-digit',
              minute: '2-digit'
            });
            console.log(`      ${index + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name} (${localTime}) - ${match.league.name}`);
          });
        }
        
        allFixtures = allFixtures.concat(fixtures);
        
      } catch (error) {
        console.log(`   ❌ Error buscando en ${dateInfo.label}: ${error.message}`);
      }
      
      // Pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Resumen final
    console.log('\n📋 RESUMEN DE BÚSQUEDA:');
    console.log(`   📊 Total fixtures encontrados: ${allFixtures.length}`);
    
    if (riverInterMatch) {
      console.log(`   🎯 River vs Inter: ✅ ENCONTRADO`);
      console.log(`      Fecha: ${new Date(riverInterMatch.date).toLocaleString('es-PE', { timeZone: 'America/Lima' })}`);
      console.log(`      Liga: ${riverInterMatch.league.name}`);
      console.log(`      UUID: ${riverInterMatch.id}`);
      
      // Intentar obtener odds
      console.log('\n📊 Probando odds del partido encontrado...');
      try {
        const oddsResponse = await axios.get(`${BASE_URL}/api/odds/fixture/${riverInterMatch.id}`);
        if (oddsResponse.data.success) {
          console.log('   ✅ ¡Odds disponibles!');
          console.log(`   🏪 Bookmakers: ${oddsResponse.data.data.availableBookmakers.length}`);
          console.log(`   📊 Mercados: ${Object.keys(oddsResponse.data.data.odds).length}`);
          
          // Mostrar odds principales
          const odds = oddsResponse.data.data.odds;
          if (odds['1X2']) {
            console.log('\n   📈 Match Winner (1X2):');
            const market = odds['1X2'].odds;
            if (market.HOME) console.log(`      ${riverInterMatch.homeTeam.name}: ${market.HOME.odds}`);
            if (market.DRAW) console.log(`      Empate: ${market.DRAW.odds}`);
            if (market.AWAY) console.log(`      ${riverInterMatch.awayTeam.name}: ${market.AWAY.odds}`);
          }
        } else {
          console.log('   ⚠️ Sin odds disponibles aún');
        }
      } catch (oddsError) {
        console.log('   ⚠️ Error obteniendo odds:', oddsError.response?.data?.message || oddsError.message);
      }
      
    } else {
      console.log(`   ❌ River vs Inter: NO ENCONTRADO en ninguna fecha`);
      
      console.log('\n💡 POSIBLES RAZONES:');
      console.log('   • El partido no está programado para estas fechas');
      console.log('   • Los nombres de equipos son diferentes en API-Football');
      console.log('   • El partido aún no está publicado en la API');
      console.log('   • Podría estar en otra liga/competición');
      
      console.log('\n🔍 BUSQUEDAS ALTERNATIVAS:');
      console.log('   1. Buscar "River Plate" completo');
      console.log('   2. Buscar "Inter Miami" vs "Inter Milan"');
      console.log('   3. Verificar en API-Football directamente');
      console.log('   4. Revisar calendario oficial del Mundial de Clubes');
    }
    
    return riverInterMatch;
    
  } catch (error) {
    console.error('\n💥 ERROR GENERAL:', error.message);
    return null;
  }
}

// Función específica para buscar solo mañana
async function searchTomorrow() {
  console.log('📅 BÚSQUEDA ESPECÍFICA DE MAÑANA');
  console.log('═'.repeat(40));
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  console.log(`📅 Fecha: ${tomorrowStr}`);
  console.log(`📅 Fecha legible: ${tomorrow.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`);
  
  try {
    const response = await axios.get(`http://localhost:3002/api/fixtures/search?date=${tomorrowStr}&limit=500`);
    const fixtures = response.data.data.fixtures;
    
    console.log(`\n📊 Total fixtures de mañana: ${fixtures.length}`);
    
    // Mundial de Clubes
    const worldCupFixtures = fixtures.filter(fixture => 
      fixture.league.name.includes('FIFA Club World Cup') || 
      fixture.league.name.includes('Club World')
    );
    
    if (worldCupFixtures.length > 0) {
      console.log(`\n🏆 MUNDIAL DE CLUBES DE MAÑANA: ${worldCupFixtures.length} partidos`);
      worldCupFixtures.forEach((fixture, index) => {
        const localTime = new Date(fixture.date).toLocaleString('es-PE', {
          timeZone: 'America/Lima',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        console.log(`\n   ${index + 1}. ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
        console.log(`      📅 Hora Perú: ${localTime}`);
        console.log(`      📊 Estado: ${fixture.status}`);
        console.log(`      🏟️ Estadio: ${fixture.venue || 'N/A'}`);
        console.log(`      📋 UUID: ${fixture.id}`);
      });
    }
    
    // Buscar River vs Inter específicamente
    const riverInter = fixtures.find(fixture => 
      (fixture.homeTeam.name.toLowerCase().includes('river') && fixture.awayTeam.name.toLowerCase().includes('inter')) ||
      (fixture.homeTeam.name.toLowerCase().includes('inter') && fixture.awayTeam.name.toLowerCase().includes('river'))
    );
    
    if (riverInter) {
      console.log('\n🎯 ¡RIVER VS INTER ENCONTRADO DE MAÑANA!');
      console.log(`   ${riverInter.homeTeam.name} vs ${riverInter.awayTeam.name}`);
      console.log(`   📅 Hora Perú: ${new Date(riverInter.date).toLocaleString('es-PE', { timeZone: 'America/Lima' })}`);
      console.log(`   📋 UUID: ${riverInter.id}`);
      return riverInter;
    }
    
    return worldCupFixtures;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Función para diferentes zonas horarias
async function searchWithTimezones() {
  console.log('🌍 BÚSQUEDA CON DIFERENTES ZONAS HORARIAS');
  console.log('═'.repeat(50));
  
  const now = new Date();
  
  // Fechas en diferentes zonas horarias
  const timezones = [
    { name: 'Perú (Lima)', tz: 'America/Lima' },
    { name: 'UTC', tz: 'UTC' },
    { name: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires' },
    { name: 'New York', tz: 'America/New_York' },
    { name: 'London', tz: 'Europe/London' }
  ];
  
  console.log('\n🕐 FECHAS ACTUALES POR ZONA HORARIA:');
  timezones.forEach(tz => {
    const localDate = now.toLocaleDateString('es-ES', { timeZone: tz.tz });
    const localTime = now.toLocaleTimeString('es-ES', { timeZone: tz.tz });
    console.log(`   ${tz.name}: ${localDate} ${localTime}`);
  });
  
  // Buscar en las próximas 48 horas considerando zona horaria
  const dates = [];
  for (let i = 0; i <= 2; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  console.log(`\n📅 Buscando en fechas: ${dates.join(', ')}`);
  
  for (const date of dates) {
    try {
      const response = await axios.get(`http://localhost:3002/api/fixtures/search?date=${date}&limit=200`);
      const fixtures = response.data.data.fixtures;
      
      const worldCup = fixtures.filter(f => f.league.name.includes('FIFA Club World Cup'));
      if (worldCup.length > 0) {
        console.log(`\n📅 ${date} - Mundial de Clubes: ${worldCup.length} partidos`);
        worldCup.forEach(f => {
          console.log(`   ${f.homeTeam.name} vs ${f.awayTeam.name} - ${new Date(f.date).toLocaleString('es-PE', { timeZone: 'America/Lima' })}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error en ${date}: ${error.message}`);
    }
  }
}

// Función principal que ejecuta todo
async function runAllSearches() {
  console.log('🚀 EJECUTANDO BÚSQUEDA COMPLETA DE RIVER VS INTER');
  console.log('═'.repeat(60));
  
  // 1. Búsqueda en múltiples días
  await searchMultipleDays();
  
  console.log('\n' + '─'.repeat(60));
  
  // 2. Búsqueda específica de mañana
  await searchTomorrow();
  
  console.log('\n' + '─'.repeat(60));
  
  // 3. Búsqueda con zonas horarias
  await searchWithTimezones();
  
  console.log('\n🎉 BÚSQUEDA COMPLETA FINALIZADA');
}

// Ejecutar según el parámetro
if (require.main === module) {
  const searchType = process.argv[2];
  
  if (searchType === 'tomorrow') {
    searchTomorrow().then(() => process.exit(0));
  } else if (searchType === 'timezone') {
    searchWithTimezones().then(() => process.exit(0));
  } else if (searchType === 'multiple') {
    searchMultipleDays().then(() => process.exit(0));
  } else {
    runAllSearches().then(() => process.exit(0));
  }
}

module.exports = { 
  searchMultipleDays, 
  searchTomorrow, 
  searchWithTimezones,
  runAllSearches 
};