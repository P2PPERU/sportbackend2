// 📄 migrate-odds-update.js - SCRIPT DE MIGRACIÓN COMPLETA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const { syncDatabase } = require('./src/models');
const { updateBettingMarkets } = require('./updateBettingMarkets');

async function migrateOddsUpdate() {
  try {
    console.log('🚀 INICIANDO MIGRACIÓN COMPLETA DE ODDS SYSTEM');
    console.log('═'.repeat(60));
    
    // 1. Sincronizar modelos (crear nuevas columnas en BettingMarket)
    console.log('📊 1. Sincronizando modelos de base de datos...');
    await syncDatabase();
    console.log('   ✅ Modelos sincronizados exitosamente');
    
    // 2. Actualizar/crear mercados de apuestas
    console.log('\n📋 2. Actualizando mercados de apuestas...');
    await updateBettingMarkets();
    
    // 3. Verificar que todo esté correcto
    console.log('\n🔍 3. Verificando instalación...');
    const { BettingMarket } = require('./src/models');
    
    const totalMarkets = await BettingMarket.count();
    const categoriesCount = await BettingMarket.count({
      distinct: true,
      col: 'category'
    });
    
    console.log(`   📊 Total mercados: ${totalMarkets}`);
    console.log(`   📂 Categorías: ${categoriesCount}`);
    
    // 4. Mostrar mercados por categoría
    const marketsByCategory = await BettingMarket.findAll({
      attributes: [
        'category',
        [BettingMarket.sequelize.fn('COUNT', BettingMarket.sequelize.col('id')), 'count']
      ],
      group: ['category'],
      order: [['category', 'ASC']]
    });

    console.log('\n📈 DISTRIBUCIÓN DE MERCADOS:');
    marketsByCategory.forEach(item => {
      console.log(`   ${item.category}: ${item.dataValues.count} mercados`);
    });
    
    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('═'.repeat(60));
    console.log('✅ Base de datos actualizada');
    console.log('✅ Nuevos mercados creados/actualizados');
    console.log('✅ Sistema de odds expandido');
    
    console.log('\n🔥 PRÓXIMOS PASOS:');
    console.log('1. Reiniciar servidor: npm run dev');
    console.log('2. Sincronizar odds: POST /api/odds/sync');
    console.log('3. Probar endpoints: GET /api/odds/markets');
    
    console.log('\n🎯 NUEVAS FUNCIONALIDADES:');
    console.log('• 40+ mercados de apuestas');
    console.log('• Corners, Cards, Exact Score');
    console.log('• Primer tiempo y segundo tiempo');
    console.log('• Mercados especiales y combinados');
    console.log('• Sistema de prioridades mejorado');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 ERROR EN MIGRACIÓN:', error);
    console.error('\n🔧 POSIBLES SOLUCIONES:');
    console.error('1. Verificar conexión a base de datos');
    console.error('2. Verificar permisos de escritura');
    console.error('3. Revisar variables de entorno');
    console.error('4. Ejecutar: npm run db:setup');
    
    process.exit(1);
  }
}

// Función de rollback por si algo sale mal
async function rollbackMigration() {
  try {
    console.log('🔄 EJECUTANDO ROLLBACK...');
    
    const { BettingMarket } = require('./src/models');
    
    // Mantener solo los mercados básicos originales
    const basicMarkets = ['1X2', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE', 'OVER_UNDER_1_5', 'OVER_UNDER_3_5', 'HT_1X2'];
    
    const deletedCount = await BettingMarket.destroy({
      where: {
        key: {
          [require('sequelize').Op.notIn]: basicMarkets
        }
      }
    });
    
    console.log(`✅ Rollback completado: ${deletedCount} mercados eliminados`);
    console.log(`✅ Mantenidos mercados básicos: ${basicMarkets.length}`);
    
  } catch (error) {
    console.error('❌ Error en rollback:', error);
  }
}

// Ejecutar función según parámetro
const action = process.argv[2];

if (action === 'rollback') {
  rollbackMigration();
} else {
  migrateOddsUpdate();
}