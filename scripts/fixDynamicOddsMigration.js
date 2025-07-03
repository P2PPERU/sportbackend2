#!/usr/bin/env node

// 📄 scripts/fixDynamicOddsMigration.js - MIGRACIÓN CORREGIDA CON MAPPING SEQUELIZE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const sequelize = require('../src/config/database');
const { BettingMarket, Odds } = require('../src/models');
const { Op } = require('sequelize');
const logger = require('../src/utils/logger');

class FixedDynamicOddsMigration {
  async run() {
    try {
      console.log('🔄 MIGRACIÓN CORREGIDA - Agregando columnas para odds dinámicas');
      console.log('═'.repeat(80));

      await this.step1_VerifyCurrentSchema();
      await this.step2_AddNewColumnsCorrectly();
      await this.step3_UpdateExistingData();
      await this.step4_CreateIndexes();
      await this.step5_VerifyMigration();

      console.log('\n✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
      console.log('🎯 Ahora puedes ejecutar las pruebas de odds dinámicas');
      
    } catch (error) {
      console.error('❌ Error en migración:', error.message);
      throw error;
    }
  }

  async step1_VerifyCurrentSchema() {
    try {
      console.log('\n🔍 PASO 1: Verificando esquema actual...');
      
      // Verificar columnas existentes
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'betting_markets' 
        ORDER BY ordinal_position;
      `);

      console.log('📋 Columnas actuales en betting_markets:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });

      // Verificar si ya existen las columnas nuevas
      const hasApiFootballId = columns.some(col => col.column_name === 'api_football_id');
      const hasUsageCount = columns.some(col => col.column_name === 'usage_count');
      const hasLastSeenAt = columns.some(col => col.column_name === 'last_seen_at');
      const hasOriginalData = columns.some(col => col.column_name === 'original_data');

      console.log('\n📊 Estado de columnas nuevas:');
      console.log(`   api_football_id: ${hasApiFootballId ? '✅ Existe' : '❌ Falta'}`);
      console.log(`   usage_count: ${hasUsageCount ? '✅ Existe' : '❌ Falta'}`);
      console.log(`   last_seen_at: ${hasLastSeenAt ? '✅ Existe' : '❌ Falta'}`);
      console.log(`   original_data: ${hasOriginalData ? '✅ Existe' : '❌ Falta'}`);

      return {
        hasApiFootballId,
        hasUsageCount,
        hasLastSeenAt,
        hasOriginalData
      };

    } catch (error) {
      console.error('❌ Error verificando esquema:', error.message);
      throw error;
    }
  }

  async step2_AddNewColumnsCorrectly() {
    try {
      console.log('\n🔧 PASO 2: Agregando columnas nuevas...');

      // ✅ AGREGAR COLUMNAS UNA POR UNA CON VERIFICACIÓN
      const columnsToAdd = [
        {
          name: 'api_football_id',
          definition: 'INTEGER NULL',
          description: 'ID del mercado en API-Football'
        },
        {
          name: 'usage_count',
          definition: 'INTEGER DEFAULT 0',
          description: 'Contador de uso del mercado'
        },
        {
          name: 'last_seen_at',
          definition: 'TIMESTAMP NULL',
          description: 'Última vez que se vio el mercado'
        },
        {
          name: 'original_data',
          definition: 'JSONB DEFAULT \'{}\'',
          description: 'Datos originales de la API'
        }
      ];

      for (const column of columnsToAdd) {
        try {
          console.log(`   🔄 Agregando ${column.name}...`);

          // Verificar si la columna ya existe
          const [exists] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'betting_markets' 
            AND column_name = '${column.name}';
          `);

          if (exists.length > 0) {
            console.log(`   ⚠️ Columna ${column.name} ya existe, saltando...`);
            continue;
          }

          // Agregar la columna
          await sequelize.query(`
            ALTER TABLE betting_markets 
            ADD COLUMN ${column.name} ${column.definition};
          `);

          // Agregar comentario
          await sequelize.query(`
            COMMENT ON COLUMN betting_markets.${column.name} 
            IS '${column.description}';
          `);

          console.log(`   ✅ Columna ${column.name} agregada exitosamente`);

        } catch (columnError) {
          if (columnError.message.includes('already exists')) {
            console.log(`   ⚠️ Columna ${column.name} ya existía`);
          } else {
            console.error(`   ❌ Error agregando ${column.name}:`, columnError.message);
            // No lanzar error, continuar con las demás columnas
          }
        }
      }

      // ✅ EXPANDIR COLUMNA KEY SI ES NECESARIO
      try {
        console.log('   🔄 Expandiendo columna key a VARCHAR(100)...');
        await sequelize.query(`
          ALTER TABLE betting_markets 
          ALTER COLUMN key TYPE VARCHAR(100);
        `);
        console.log('   ✅ Columna key expandida');
      } catch (keyError) {
        console.log('   ⚠️ Error expandiendo columna key:', keyError.message);
      }

    } catch (error) {
      console.error('❌ Error agregando columnas:', error.message);
      throw error;
    }
  }

  async step3_UpdateExistingData() {
    try {
      console.log('\n🔄 PASO 3: Actualizando datos existentes...');

      // Mapeo de mercados legacy a API-Football IDs
      const legacyMapping = [
        { key: '1X2', apiId: 1, usage: 10, name: 'Match Winner' },
        { key: 'OVER_UNDER_2_5', apiId: 5, usage: 8, name: 'Goals Over/Under' },
        { key: 'BTTS', apiId: 8, usage: 7, name: 'Both Teams Score' },
        { key: 'EXACT_SCORE', apiId: 10, usage: 6, name: 'Exact Score' },
        { key: 'DOUBLE_CHANCE', apiId: 12, usage: 5, name: 'Double Chance' },
        { key: 'HT_1X2', apiId: 13, usage: 4, name: 'First Half Winner' },
        { key: 'SECOND_HALF_WINNER', apiId: 3, usage: 3, name: 'Second Half Winner' },
        { key: 'HT_OVER_UNDER_1_5', apiId: 6, usage: 3, name: 'Goals Over/Under First Half' },
        { key: 'CORNERS_OVER_UNDER_8_5', apiId: 45, usage: 2, name: 'Corners Over Under' },
        { key: 'ODD_EVEN', apiId: 21, usage: 2, name: 'Odd/Even' }
      ];

      let updatedCount = 0;

      for (const mapping of legacyMapping) {
        try {
          // ✅ USAR SEQUELIZE PARA ACTUALIZAR DATOS
          const [updatedRows] = await BettingMarket.update({
            // ✅ MAPEO CORRECTO DE COLUMNAS
            apiFootballId: mapping.apiId,
            usageCount: mapping.usage,
            lastSeenAt: new Date(),
            originalData: {
              migratedFrom: 'legacy',
              originalKey: mapping.key,
              migratedAt: new Date().toISOString(),
              mappedName: mapping.name
            }
          }, {
            where: {
              key: mapping.key,
              // Solo actualizar si no tiene apiFootballId
              apiFootballId: null
            }
          });

          if (updatedRows > 0) {
            updatedCount++;
            console.log(`   ✅ Migrado: ${mapping.key} → API-Football ID ${mapping.apiId}`);
          } else {
            console.log(`   ⚠️ Ya migrado: ${mapping.key}`);
          }

        } catch (updateError) {
          console.log(`   ❌ Error migrando ${mapping.key}:`, updateError.message);
        }
      }

      console.log(`   📊 Total mercados migrados: ${updatedCount}`);

      // ✅ ACTUALIZAR MERCADOS RESTANTES CON VALORES POR DEFECTO
      try {
        const [defaultUpdated] = await BettingMarket.update({
          usageCount: 0,
          lastSeenAt: new Date(),
          originalData: {
            migratedFrom: 'default',
            migratedAt: new Date().toISOString()
          }
        }, {
          where: {
            [Op.or]: [
              { usageCount: null },
              { lastSeenAt: null }
            ]
          }
        });

        if (defaultUpdated > 0) {
          console.log(`   📝 ${defaultUpdated} mercados actualizados con valores por defecto`);
        }

      } catch (defaultError) {
        console.log('   ⚠️ Error actualizando valores por defecto:', defaultError.message);
      }

    } catch (error) {
      console.error('❌ Error actualizando datos:', error.message);
      throw error;
    }
  }

  async step4_CreateIndexes() {
    try {
      console.log('\n🔍 PASO 4: Creando índices optimizados...');

      const indexes = [
        {
          name: 'idx_betting_markets_api_football_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_betting_markets_api_football_id ON betting_markets(api_football_id)'
        },
        {
          name: 'idx_betting_markets_usage_count',
          sql: 'CREATE INDEX IF NOT EXISTS idx_betting_markets_usage_count ON betting_markets(usage_count)'
        },
        {
          name: 'idx_betting_markets_last_seen',
          sql: 'CREATE INDEX IF NOT EXISTS idx_betting_markets_last_seen ON betting_markets(last_seen_at)'
        },
        {
          name: 'idx_betting_markets_api_id_active',
          sql: 'CREATE INDEX IF NOT EXISTS idx_betting_markets_api_id_active ON betting_markets(api_football_id, is_active) WHERE api_football_id IS NOT NULL'
        }
      ];

      for (const index of indexes) {
        try {
          await sequelize.query(index.sql);
          console.log(`   ✅ Índice creado: ${index.name}`);
        } catch (indexError) {
          console.log(`   ⚠️ Error/ya existe índice ${index.name}:`, indexError.message);
        }
      }

    } catch (error) {
      console.error('❌ Error creando índices:', error.message);
      throw error;
    }
  }

  async step5_VerifyMigration() {
    try {
      console.log('\n🔍 PASO 5: Verificando migración...');

      // ✅ VERIFICAR COLUMNAS NUEVAS
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'betting_markets' 
        AND column_name IN ('api_football_id', 'usage_count', 'last_seen_at', 'original_data')
        ORDER BY column_name;
      `);

      console.log('📋 Columnas nuevas verificadas:');
      columns.forEach(col => {
        console.log(`   ✅ ${col.column_name} (${col.data_type}) - Default: ${col.column_default || 'NULL'}`);
      });

      // ✅ VERIFICAR DATOS MIGRADOS USANDO SEQUELIZE
      const migratedCount = await BettingMarket.count({
        where: {
          apiFootballId: {
            [Op.ne]: null
          }
        }
      });

      const totalMarkets = await BettingMarket.count();

      console.log('\n📊 Estadísticas de migración:');
      console.log(`   📋 Total mercados: ${totalMarkets}`);
      console.log(`   🔄 Mercados migrados: ${migratedCount}`);
      console.log(`   📈 Cobertura: ${Math.round((migratedCount/totalMarkets)*100)}%`);

      // ✅ VERIFICAR ÍNDICES
      const [indexes] = await sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'betting_markets' 
        AND indexname LIKE 'idx_betting_markets_%'
        ORDER BY indexname;
      `);

      console.log('\n🔍 Índices creados:');
      indexes.forEach(idx => {
        console.log(`   ✅ ${idx.indexname}`);
      });

      // ✅ TEST RÁPIDO DE SEQUELIZE
      try {
        const testMarket = await BettingMarket.findOne({
          where: {
            apiFootballId: {
              [Op.ne]: null
            }
          }
        });

        if (testMarket) {
          console.log('\n🧪 Test de Sequelize:');
          console.log(`   ✅ Mercado test: ${testMarket.name} (API ID: ${testMarket.apiFootballId})`);
          console.log(`   ✅ Usage count: ${testMarket.usageCount}`);
          console.log(`   ✅ Last seen: ${testMarket.lastSeenAt}`);
          console.log(`   ✅ Sequelize mapping funcionando correctamente`);
        }

      } catch (testError) {
        console.error('   ❌ Error en test de Sequelize:', testError.message);
        throw testError;
      }

      return {
        columnsCreated: columns.length >= 4,
        datasMigrated: migratedCount > 0,
        indexesCreated: indexes.length >= 3,
        sequelizeWorking: true
      };

    } catch (error) {
      console.error('❌ Error verificando migración:', error.message);
      throw error;
    }
  }

  // ✅ ROLLBACK SI ES NECESARIO
  async rollback() {
    try {
      console.log('\n🔄 EJECUTANDO ROLLBACK...');
      
      const rollbackQueries = [
        'DROP INDEX IF EXISTS idx_betting_markets_api_football_id',
        'DROP INDEX IF EXISTS idx_betting_markets_usage_count', 
        'DROP INDEX IF EXISTS idx_betting_markets_last_seen',
        'DROP INDEX IF EXISTS idx_betting_markets_api_id_active',
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
  const migration = new FixedDynamicOddsMigration();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--rollback')) {
    migration.rollback()
      .then(() => {
        console.log('\n🎯 Para volver a migrar: node scripts/fixDynamicOddsMigration.js');
        process.exit(0);
      })
      .catch(() => process.exit(1));
  } else {
    migration.run()
      .then(() => {
        console.log('\n🎯 Siguiente paso: node scripts/testDynamicOdds.js');
        console.log('🔄 Para rollback: node scripts/fixDynamicOddsMigration.js --rollback');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Migración falló:', error.message);
        console.log('\n🔄 Para rollback: node scripts/fixDynamicOddsMigration.js --rollback');
        process.exit(1);
      });
  }
}

module.exports = FixedDynamicOddsMigration;