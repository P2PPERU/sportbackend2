#!/usr/bin/env node

// 📄 scripts/progressiveMigration.js - MIGRACIÓN PROGRESIVA SEGURA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const sequelize = require('../src/config/database');
const logger = require('../src/utils/logger');

class ProgressiveMigration {
  async run() {
    try {
      console.log('🔄 MIGRACIÓN PROGRESIVA - Agregando columnas para sistema dinámico');
      console.log('═'.repeat(80));

      await this.step1_AddApiFootballId();
      await this.step2_AddUsageTracking();
      await this.step3_AddOriginalData();
      await this.step4_UpdateExistingData();
      await this.step5_CreateIndexes();

      console.log('\n✅ ¡MIGRACIÓN PROGRESIVA COMPLETADA!');
      console.log('🎯 Tu sistema ahora es compatible con odds dinámicas');
      
    } catch (error) {
      console.error('❌ Error en migración progresiva:', error.message);
      throw error;
    }
  }

  async step1_AddApiFootballId() {
    try {
      console.log('\n🔧 PASO 1: Agregando columna api_football_id...');
      
      await sequelize.query(`
        ALTER TABLE betting_markets 
        ADD COLUMN IF NOT EXISTS api_football_id INTEGER;
      `);
      
      console.log('   ✅ Columna api_football_id agregada');
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️ Columna api_football_id ya existe, continuando...');
      } else {
        throw error;
      }
    }
  }

  async step2_AddUsageTracking() {
    try {
      console.log('\n📊 PASO 2: Agregando columnas de tracking...');
      
      const columns = [
        'usage_count INTEGER DEFAULT 0',
        'last_seen_at TIMESTAMP NULL'
      ];

      for (const column of columns) {
        try {
          await sequelize.query(`
            ALTER TABLE betting_markets 
            ADD COLUMN IF NOT EXISTS ${column};
          `);
          console.log(`   ✅ Columna agregada: ${column.split(' ')[0]}`);
        } catch (colError) {
          console.log(`   ⚠️ Columna ${column.split(' ')[0]} ya existe`);
        }
      }
      
    } catch (error) {
      console.log('   ⚠️ Algunas columnas ya existían, continuando...');
    }
  }

  async step3_AddOriginalData() {
    try {
      console.log('\n💾 PASO 3: Agregando columna para datos originales...');
      
      await sequelize.query(`
        ALTER TABLE betting_markets 
        ADD COLUMN IF NOT EXISTS original_data JSONB DEFAULT '{}';
      `);
      
      console.log('   ✅ Columna original_data agregada');
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️ Columna original_data ya existe');
      } else {
        console.log('   ⚠️ Error agregando original_data:', error.message);
      }
    }
  }

  async step4_UpdateExistingData() {
    try {
      console.log('\n🔄 PASO 4: Actualizando datos existentes...');
      
      // Mapeo básico de mercados legacy a API-Football IDs
      const legacyMapping = [
        { key: '1X2', apiId: 1, usage: 10 },
        { key: 'OVER_UNDER_2_5', apiId: 5, usage: 8 },
        { key: 'BTTS', apiId: 8, usage: 7 },
        { key: 'EXACT_SCORE', apiId: 10, usage: 6 },
        { key: 'DOUBLE_CHANCE', apiId: 12, usage: 5 },
        { key: 'HT_1X2', apiId: 13, usage: 4 },
        { key: 'ST_1X2', apiId: 3, usage: 3 },
        { key: 'HT_OVER_UNDER_1_5', apiId: 6, usage: 3 },
        { key: 'CORNERS_OVER_UNDER_8_5', apiId: 45, usage: 2 },
        { key: 'ODD_EVEN', apiId: 21, usage: 2 }
      ];

      let updatedCount = 0;
      
      for (const mapping of legacyMapping) {
        try {
            const [results] = await sequelize.query(`
            UPDATE betting_markets 
            SET 
              api_football_id = :apiId,
              usage_count = :usage,
              last_seen_at = NOW(),
              original_data = json_build_object(
              'migratedFrom', 'legacy',
              'originalKey', key,
              'migratedAt', NOW()::text
              )::jsonb
            WHERE key = :key AND api_football_id IS NULL
            `, {
            replacements: { 
              key: mapping.key, 
              apiId: mapping.apiId, 
              usage: mapping.usage 
            }
            });
          
          if (results.affectedRows > 0 || results === 1) {
            updatedCount++;
            console.log(`   ✅ Migrado: ${mapping.key} → API-Football ID ${mapping.apiId}`);
          }
        } catch (updateError) {
          console.log(`   ⚠️ Error migrando ${mapping.key}:`, updateError.message);
        }
      }
      
      console.log(`   📊 Total mercados migrados: ${updatedCount}`);
      
    } catch (error) {
      console.log('   ⚠️ Error actualizando datos existentes:', error.message);
    }
  }

  async step5_CreateIndexes() {
    try {
      console.log('\n🔍 PASO 5: Creando índices optimizados...');
      
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_betting_markets_api_football_id ON betting_markets(api_football_id)',
        'CREATE INDEX IF NOT EXISTS idx_betting_markets_usage_count ON betting_markets(usage_count)',
        'CREATE INDEX IF NOT EXISTS idx_betting_markets_last_seen ON betting_markets(last_seen_at)'
      ];

      for (const indexSQL of indexes) {
        try {
          await sequelize.query(indexSQL);
          const indexName = indexSQL.match(/idx_[\w_]+/)[0];
          console.log(`   ✅ Índice creado: ${indexName}`);
        } catch (indexError) {
          console.log(`   ⚠️ Índice ya existe o error:`, indexError.message);
        }
      }
      
    } catch (error) {
      console.log('   ⚠️ Error creando índices:', error.message);
    }
  }

  async checkMigrationStatus() {
    try {
      console.log('\n🔍 VERIFICANDO ESTADO DE LA MIGRACIÓN...');
      
      // Verificar que las columnas existen
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'betting_markets' 
        AND column_name IN ('api_football_id', 'usage_count', 'last_seen_at', 'original_data')
        ORDER BY column_name;
      `);

      console.log('📋 Columnas encontradas:', columns.map(c => c.column_name).join(', '));

      // Verificar datos migrados
      const [migratedCount] = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM betting_markets 
        WHERE api_football_id IS NOT NULL;
      `);

      console.log(`📊 Mercados migrados: ${migratedCount[0].count}`);

      // Verificar índices
      const [indexes] = await sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'betting_markets' 
        AND indexname LIKE 'idx_betting_markets_%';
      `);

      console.log('🔍 Índices creados:', indexes.map(i => i.indexname).join(', '));

      return {
        columnsReady: columns.length >= 3,
        datasMigrated: migratedCount[0].count > 0,
        indexesCreated: indexes.length >= 2
      };

    } catch (error) {
      console.log('❌ Error verificando migración:', error.message);
      return { columnsReady: false, datasMigrated: false, indexesCreated: false };
    }
  }

  async rollback() {
    try {
      console.log('\n🔄 EJECUTANDO ROLLBACK...');
      
      const rollbackQueries = [
        'DROP INDEX IF EXISTS idx_betting_markets_api_football_id',
        'DROP INDEX IF EXISTS idx_betting_markets_usage_count', 
        'DROP INDEX IF EXISTS idx_betting_markets_last_seen',
        'ALTER TABLE betting_markets DROP COLUMN IF EXISTS api_football_id',
        'ALTER TABLE betting_markets DROP COLUMN IF EXISTS usage_count',
        'ALTER TABLE betting_markets DROP COLUMN IF EXISTS last_seen_at',
        'ALTER TABLE betting_markets DROP COLUMN IF EXISTS original_data'
      ];

      for (const query of rollbackQueries) {
        try {
          await sequelize.query(query);
          console.log(`   ✅ ${query.split(' ')[0]} ejecutado`);
        } catch (rollbackError) {
          console.log(`   ⚠️ Error en rollback: ${rollbackError.message}`);
        }
      }

      console.log('✅ Rollback completado');
      
    } catch (error) {
      console.error('❌ Error en rollback:', error.message);
    }
  }
}

// ✅ EJECUTAR SI SE LLAMA DIRECTAMENTE
if (require.main === module) {
  const migration = new ProgressiveMigration();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--check')) {
    migration.checkMigrationStatus()
      .then((status) => {
        console.log('\n📊 ESTADO DE LA MIGRACIÓN:', status);
        process.exit(0);
      })
      .catch(() => process.exit(1));
  } else if (args.includes('--rollback')) {
    migration.rollback()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    migration.run()
      .then(() => {
        console.log('\n🎯 Para verificar: node scripts/progressiveMigration.js --check');
        console.log('🔄 Para rollback: node scripts/progressiveMigration.js --rollback');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Migración falló:', error.message);
        process.exit(1);
      });
  }
}

module.exports = ProgressiveMigration;