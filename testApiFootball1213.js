require('dotenv').config();
const axios = require('axios');

async function testApiFootballIntegration() {
  console.log('🚀 TESTING API-FOOTBALL INTEGRATION');
  console.log('═'.repeat(50));
  
  const BASE_URL = 'http://localhost:3002';
  
  try {
    // 1. Test Health Check
    console.log('\n1. 🏥 Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Database: ${healthResponse.data.database.status}`);
    console.log(`   Redis: ${healthResponse.data.cache.redis}`);
    console.log(`   API-Football: ${healthResponse.data.externalApi.apiFootball}`);
    
    // 2. Test API-Football Configuration
    console.log('\n2. 🔧 Checking API-Football Config...');
    if (!process.env.API_FOOTBALL_KEY) {
      throw new Error('❌ API_FOOTBALL_KEY no está configurada en .env');
    }
    console.log('   ✅ API_FOOTBALL_KEY configurada');
    
    // 3. Test Today Fixtures Endpoint
    console.log('\n3. 📅 Testing GET /api/fixtures/today...');
    try {
      const fixturesResponse = await axios.get(`${BASE_URL}/api/fixtures/today`);
      console.log(`   Status: ${fixturesResponse.status}`);
      console.log(`   Fixtures found: ${fixturesResponse.data.data.count}`);
      
      if (fixturesResponse.data.data.count > 0) {
        const firstFixture = fixturesResponse.data.data.fixtures[0];
        console.log(`   Example fixture: ${firstFixture.homeTeam.name} vs ${firstFixture.awayTeam.name}`);
        console.log(`   League: ${firstFixture.league.name}`);
        console.log(`   Status: ${firstFixture.status}`);
      }
    } catch (fixtureError) {
      console.log(`   ❌ Error: ${fixtureError.response?.status} - ${fixtureError.message}`);
      if (fixtureError.response?.data) {
        console.log(`   Details: ${JSON.stringify(fixtureError.response.data, null, 2)}`);
      }
    }
    
    // 4. Test Search Endpoint
    console.log('\n4. 🔍 Testing GET /api/fixtures/search...');
    try {
      const today = new Date().toISOString().split('T')[0];
      const searchResponse = await axios.get(`${BASE_URL}/api/fixtures/search?date=${today}&limit=5`);
      console.log(`   Status: ${searchResponse.status}`);
      console.log(`   Search results: ${searchResponse.data.data.count}`);
    } catch (searchError) {
      console.log(`   ❌ Error: ${searchError.response?.status} - ${searchError.message}`);
    }
    
    // 5. Test Live Fixtures
    console.log('\n5. 🔴 Testing GET /api/fixtures/live...');
    try {
      const liveResponse = await axios.get(`${BASE_URL}/api/fixtures/live`);
      console.log(`   Status: ${liveResponse.status}`);
      console.log(`   Live matches: ${liveResponse.data.data.count}`);
    } catch (liveError) {
      console.log(`   ❌ Error: ${liveError.response?.status} - ${liveError.message}`);
    }
    
    // 6. Test API Documentation
    console.log('\n6. 📚 Testing GET /api/fixtures (docs)...');
    try {
      const docsResponse = await axios.get(`${BASE_URL}/api/fixtures`);
      console.log(`   Status: ${docsResponse.status}`);
      console.log(`   Service: ${docsResponse.data.service}`);
      console.log(`   Public endpoints: ${Object.keys(docsResponse.data.endpoints.public).length}`);
    } catch (docsError) {
      console.log(`   ❌ Error: ${docsError.response?.status} - ${docsError.message}`);
    }
    
    console.log('\n🎉 INTEGRATION TEST COMPLETED!');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Si todo está ✅, tu API está funcionando');
    console.log('   2. Prueba en el navegador: http://localhost:3002/api/fixtures/today');
    console.log('   3. Revisa la documentación: http://localhost:3002/api/fixtures');
    console.log('   4. Los datos se sincronizan automáticamente cada 5 minutos');
    
  } catch (error) {
    console.error('\n💥 TEST FAILED:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 SOLUCIÓN:');
      console.log('   1. Asegúrate de que el servidor esté corriendo:');
      console.log('      npm run dev');
      console.log('   2. Verifica que esté en puerto 3002');
    } else if (error.message.includes('API_FOOTBALL_KEY')) {
      console.log('\n🔧 SOLUCIÓN:');
      console.log('   1. Agrega tu API_FOOTBALL_KEY al archivo .env');
      console.log('   2. Reinicia el servidor');
    }
  }
}

// Función para mostrar configuración requerida
function showRequiredConfig() {
  console.log('\n⚙️ CONFIGURACIÓN REQUERIDA EN .env:');
  console.log('═'.repeat(40));
  console.log('API_FOOTBALL_KEY=tu_api_key_aqui');
  console.log('API_FOOTBALL_HOST=v3.football.api-sports.io');
  console.log('API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io');
  console.log('API_FOOTBALL_RATE_LIMIT=100');
  console.log('\n💡 Obtén tu API key gratis en: https://rapidapi.com/api-sports/api/api-football');
}

// Ejecutar test
async function main() {
  try {
    await testApiFootballIntegration();
  } catch (error) {
    console.error('Error general:', error.message);
    showRequiredConfig();
  }
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { testApiFootballIntegration, showRequiredConfig };