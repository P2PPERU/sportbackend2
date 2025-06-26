// 📄 findRiverInter.js - BUSCAR RIVER VS INTER EN MUNDIAL DE CLUBES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const axios = require('axios');

async function findRiverInter() {
  console.log('🔍 BUSCANDO RIVER VS INTER EN EL MUNDIAL DE CLUBES');
  console.log('═'.repeat(60));
  
  const BASE_URL = 'http://localhost:3002';
  
  try {
    // 1. Buscar en fixtures de hoy con análisis detallado
    console.log('\n📅 1. Analizando TODOS los fixtures de hoy...');
    const todayResponse = await axios.get(`${BASE_URL}/api/fixtures/today`);
    
    console.log(`   📊 Total fixtures: ${todayResponse.data.data.count}`);
    
    // Buscar River y Inter por separado
    const riverFixtures = todayResponse.data.data.fixtures.filter(fixture => 
      fixture.homeTeam.name.toLowerCase().includes('river') || 
      fixture.awayTeam.name.toLowerCase().includes('river') ||
      fixture.homeTeam.name.toLowerCase().includes('plate') || 
      fixture.awayTeam.name.toLowerCase().includes('plate')
    );
    
    const interFixtures = todayResponse.data.data.fixtures.filter(fixture => 
      fixture.homeTeam.name.toLowerCase().includes('inter') ||
      fixture.awayTeam.name.toLowerCase().includes('inter')
    );
    
    console.log(`   🔵 Fixtures con "River": ${riverFixtures.length}`);
    console.log(`   ⚫ Fixtures con "Inter": ${interFixtures.length}`);
    
    // Mostrar todos los partidos de River
    if (riverFixtures.length > 0) {
      console.log('\n🔵 PARTIDOS DE RIVER ENCONTRADOS:');
      riverFixtures.forEach((fixture, index) => {
        console.log(`   ${index + 1}. ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
        console.log(`      🏆 Liga: ${fixture.league.name}`);
        console.log(`      📅 Fecha: ${new Date(fixture.date).toLocaleString()}`);
        console.log(`      📊 Estado: ${fixture.status}`);
        console.log(`      📋 UUID: ${fixture.id}`);
        console.log('');
      });
    }
    
    // Mostrar todos los partidos de Inter
    if (interFixtures.length > 0) {
      console.log('\n⚫ PARTIDOS DE INTER ENCONTRADOS:');
      interFixtures.forEach((fixture, index) => {
        console.log(`   ${index + 1}. ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
        console.log(`      🏆 Liga: ${fixture.league.name}`);
        console.log(`      📅 Fecha: ${new Date(fixture.date).toLocaleString()}`);
        console.log(`      📊 Estado: ${fixture.status}`);
        console.log(`      📋 UUID: ${fixture.id}`);
        console.log('');
      });
    }
    
    // Buscar el partido específico River vs Inter
    const riverVsInter = todayResponse.data.data.fixtures.find(fixture => 
      (fixture.homeTeam.name.toLowerCase().includes('river') && fixture.awayTeam.name.toLowerCase().includes('inter')) ||
      (fixture.homeTeam.name.toLowerCase().includes('inter') && fixture.awayTeam.name.toLowerCase().includes('river'))
    );
    
    if (riverVsInter) {
      console.log('\n🎯 ¡PARTIDO RIVER VS INTER ENCONTRADO!');
      console.log(`   ${riverVsInter.homeTeam.name} vs ${riverVsInter.awayTeam.name}`);
      console.log(`   🏆 Liga: ${riverVsInter.league.name}`);
      console.log(`   📅 Fecha: ${new Date(riverVsInter.date).toLocaleString()}`);
      console.log(`   📊 Estado: ${riverVsInter.status}`);
      console.log(`   📋 UUID: ${riverVsInter.id}`);
      
      // Probar odds de este partido
      console.log('\n📊 Obteniendo odds...');
      try {
        const oddsResponse = await axios.get(`${BASE_URL}/api/odds/fixture/${riverVsInter.id}`);
        if (oddsResponse.data.success) {
          console.log('   ✅ ¡Odds disponibles!');
          console.log(`   🏪 Bookmakers: ${oddsResponse.data.data.availableBookmakers.length}`);
        }
      } catch (oddsError) {
        console.log('   ⚠️ Sin odds aún disponibles');
      }
      
      return riverVsInter;
    }
    
    // 2. Si no se encuentra, buscar en búsquedas específicas
    console.log('\n🔍 2. Buscando con términos específicos...');
    
    const searchTerms = [
      'River Plate',
      'Club Atlético River Plate', 
      'Inter Miami',
      'Inter Milan',
      'FC Internazionale',
      'Internacional'
    ];
    
    for (const term of searchTerms) {
      const matches = todayResponse.data.data.fixtures.filter(fixture => 
        fixture.homeTeam.name.toLowerCase().includes(term.toLowerCase()) ||
        fixture.awayTeam.name.toLowerCase().includes(term.toLowerCase())
      );
      
      if (matches.length > 0) {
        console.log(`\n   🔍 Búsqueda "${term}": ${matches.length} resultados`);
        matches.forEach(match => {
          console.log(`      ${match.homeTeam.name} vs ${match.awayTeam.name} (${match.league.name})`);
        });
      }
    }
    
    // 3. Buscar en el rango de fechas extendido (hoy + mañana)
    console.log('\n📅 3. Buscando en rango extendido (hoy + mañana)...');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    try {
      const extendedResponse = await axios.get(`${BASE_URL}/api/fixtures/search?date=${today}&limit=500`);
      const tomorrowResponse = await axios.get(`${BASE_URL}/api/fixtures/search?date=${tomorrowStr}&limit=500`);
      
      const allFixtures = [
        ...extendedResponse.data.data.fixtures,
        ...tomorrowResponse.data.data.fixtures
      ];
      
      console.log(`   📊 Total fixtures en 2 días: ${allFixtures.length}`);
      
      const extendedRiverInter = allFixtures.find(fixture => 
        (fixture.homeTeam.name.toLowerCase().includes('river') && fixture.awayTeam.name.toLowerCase().includes('inter')) ||
        (fixture.homeTeam.name.toLowerCase().includes('inter') && fixture.awayTeam.name.toLowerCase().includes('river'))
      );
      
      if (extendedRiverInter) {
        console.log('\n🎯 ¡PARTIDO ENCONTRADO EN BÚSQUEDA EXTENDIDA!');
        console.log(`   ${extendedRiverInter.homeTeam.name} vs ${extendedRiverInter.awayTeam.name}`);
        console.log(`   📅 Fecha: ${new Date(extendedRiverInter.date).toLocaleString()}`);
        console.log(`   🏆 Liga: ${extendedRiverInter.league.name}`);
        
        return extendedRiverInter;
      }
      
    } catch (searchError) {
      console.log('   ❌ Error en búsqueda extendida:', searchError.message);
    }
    
    // 4. Verificar si necesita sincronización
    console.log('\n🔄 4. El partido podría no estar sincronizado aún...');
    console.log('   💡 Posibles razones:');
    console.log('   • El partido no está en la base de datos local');
    console.log('   • La fecha/hora está en zona horaria diferente');
    console.log('   • API-Football aún no tiene el fixture');
    console.log('   • El partido está programado para más tarde');
    
    // 5. Mostrar todos los partidos del Mundial de Clubes para referencia
    console.log('\n🏆 5. TODOS LOS PARTIDOS DEL MUNDIAL DE CLUBES DISPONIBLES:');
    const worldCupFixtures = todayResponse.data.data.fixtures.filter(fixture => 
      fixture.league.name.includes('FIFA Club World Cup') || 
      fixture.league.name.includes('Club World')
    );
    
    if (worldCupFixtures.length > 0) {
      worldCupFixtures.forEach((fixture, index) => {
        const localTime = new Date(fixture.date).toLocaleString('es-PE', {
          timeZone: 'America/Lima',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        console.log(`   ${index + 1}. ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
        console.log(`      📅 Fecha/Hora Perú: ${localTime}`);
        console.log(`      📊 Estado: ${fixture.status}`);
        console.log(`      📋 UUID: ${fixture.id}`);
        console.log('');
      });
    }
    
    console.log('\n❌ RIVER VS INTER NO ENCONTRADO en los datos actuales');
    console.log('\n💡 SOLUCIONES SUGERIDAS:');
    console.log('   1. Esperar a que se sincronice automáticamente');
    console.log('   2. Forzar sincronización si tienes permisos admin');
    console.log('   3. Verificar la fecha exacta del partido');
    console.log('   4. Buscar con nombres completos de equipos');
    
    return null;
    
  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
    return null;
  }
}

// Función para forzar sincronización (requiere permisos admin)
async function forceSyncTodayFixtures() {
  console.log('\n🔄 INTENTANDO FORZAR SINCRONIZACIÓN...');
  
  try {
    const response = await axios.post('http://localhost:3002/api/fixtures/sync', {}, {
      headers: {
        'Authorization': 'Bearer tu_token_admin_aqui' // Necesitarías un token admin real
      }
    });
    
    console.log('✅ Sincronización forzada exitosa');
    return response.data;
    
  } catch (error) {
    console.log('⚠️ No se pudo forzar sincronización (requiere permisos admin)');
    console.log('💡 Solución: Esperar sincronización automática (cada 5 min)');
    return null;
  }
}

// Ejecutar búsqueda
if (require.main === module) {
  findRiverInter()
    .then((result) => {
      if (!result) {
        console.log('\n🔄 Recomendación: Ejecuta este script en unos minutos');
        console.log('   Los datos se sincronizan automáticamente cada 5 minutos');
      }
      console.log('\n👋 Búsqueda finalizada');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

module.exports = { findRiverInter, forceSyncTodayFixtures };