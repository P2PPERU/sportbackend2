require('dotenv').config();
const { syncDatabase } = require('../src/models');

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');
    
    await syncDatabase();
    
    console.log('✅ Seed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;