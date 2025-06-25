// 📄 updateEnumCategories.js - ACTUALIZAR ENUM DE CATEGORÍAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const { Sequelize } = require('sequelize');

async function updateEnumCategories() {
  try {
    console.log('🔧 ACTUALIZANDO ENUM DE CATEGORÍAS');
    console.log('═'.repeat(40));
    
    const sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false
      }
    );

    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    // 1. Ver categorías actuales
    console.log('\n📋 Categorías actuales:');
    const [currentEnums] = await sequelize.query(`
      SELECT unnest(enum_range(NULL::enum_betting_markets_category)) as category;
    `);
    
    currentEnums.forEach(item => {
      console.log(`   • ${item.category}`);
    });

    // 2. Agregar nuevas categorías al enum
    const newCategories = [
      'EXACT_SCORE',
      'SECOND_HALF', 
      'CORNERS',
      'CARDS',
      'COMBINED'
    ];

    console.log('\n🔄 Agregando nuevas categorías...');
    
    for (const category of newCategories) {
      try {
        await sequelize.query(`
          ALTER TYPE enum_betting_markets_category ADD VALUE IF NOT EXISTS '${category}';
        `);
        console.log(`   ✅ Agregado: ${category}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ℹ️ Ya existe: ${category}`);
        } else {
          console.log(`   ❌ Error con ${category}: ${error.message}`);
        }
      }
    }

    // 3. Verificar categorías finales
    console.log('\n📋 Categorías finales:');
    const [finalEnums] = await sequelize.query(`
      SELECT unnest(enum_range(NULL::enum_betting_markets_category)) as category;
    `);
    
    finalEnums.forEach(item => {
      console.log(`   • ${item.category}`);
    });

    await sequelize.close();
    console.log('\n🎉 ¡ENUM ACTUALIZADO EXITOSAMENTE!');
    console.log('\n📋 PRÓXIMO PASO:');
    console.log('Ejecuta: node quickMarketsUpdate.js');
    
    process.exit(0);

  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
    process.exit(1);
  }
}

updateEnumCategories();