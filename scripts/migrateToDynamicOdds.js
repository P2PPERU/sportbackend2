// 📄 scripts/migrateToDynamicOdds.js - MIGRACIÓN CORREGIDA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const sequelize = require('../src/config/database');
const { BettingMarket, Odds } = require('../src/models');
const { Op } = require('sequelize'); // ✅ AGREGAR ESTA LÍNEA - FALTABA!
const logger = require('../src/utils/logger');

class DynamicOddsMigration {
  async run() {
    try {
      logger.info('🔄 Iniciando migración a sistema de odds dinámicas...');

      // ✅ 1. RESPALDAR DATOS EXISTENTES
      await this.backupExistingData();

      // ✅ 2. ACTUALIZAR ESTRUCTURA DE BETTING_MARKETS
      await this.updateBettingMarketsTable();

      // ✅ 3. MIGRAR MERCADOS EXISTENTES
      await this.migrateExistingMarkets();

      // ✅ 4. LIMPIAR DATOS OBSOLETOS
      await this.cleanupOldData();

      // ✅ 5. VERIFICAR MIGRACIÓN
      await this.verifyMigration();

      logger.info('✅ Migración a odds dinámicas completada exitosamente');

    } catch (error) {
      logger.error('❌ Error en migración a odds dinámicas:', error);
      throw error;
    }
  }

  // ✅ RESPALDAR DATOS EXISTENTES
  async backupExistingData() {
    try {
      logger.info('📦 Respaldando datos existentes...');

      // Contar datos actuales
      const marketCount = await BettingMarket.count();
      const oddsCount = await Odds.count();

      logger.info(`📊 Datos a migrar: ${marketCount} mercados, ${oddsCount} odds`);

      // Crear tabla de respaldo si no existe
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS betting_markets_backup AS 
        SELECT * FROM betting_markets WHERE 1=0;
      `);

      // Respaldar mercados existentes
      if (marketCount > 0) {
        await sequelize.query(`
          INSERT INTO betting_markets_backup 
          SELECT * FROM betting_markets;
        `);
        logger.info('✅ Mercados respaldados');
      }

      return { marketCount, oddsCount };

    } catch (error) {
      logger.error('❌ Error respaldando datos:', error);
      throw error;
    }
  }

  // ✅ ACTUALIZAR ESTRUCTURA DE TABLA
  async updateBettingMarketsTable() {
    try {
      logger.info('🔧 Actualizando estructura de betting_markets...');

      // Agregar nuevas columnas si no existen
      const newColumns = [
        {
          name: 'api_football_id',
          type: 'INTEGER'
        },
        {
          name: 'usage_count',
          type: 'INTEGER DEFAULT 0'
        },
        {
          name: 'last_seen_at',
          type: 'TIMESTAMP'
        },
        {
          name: 'original_data',
          type: 'JSONB DEFAULT \'{}\''
        }
      ];

      for (const column of newColumns) {
        try {
          await sequelize.query(`
            ALTER TABLE betting_markets 
            ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};
          `);
          logger.info(`✅ Columna agregada: ${column.name}`);
        } catch (columnError) {
          if (!columnError.message.includes('already exists')) {
            logger.warn(`⚠️ Error agregando columna ${column.name}:`, columnError.message);
          }
        }
      }

      // Modificar columnas existentes
      try {
        await sequelize.query(`
          ALTER TABLE betting_markets 
          ALTER COLUMN key TYPE VARCHAR(100);
        `);
        logger.info('✅ Columna key expandida a 100 caracteres');
      } catch (modifyError) {
        logger.warn('⚠️ Error modificando columna key:', modifyError.message);
      }

      // Agregar índices nuevos
      const newIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_betting_markets_api_football_id ON betting_markets(api_football_id);',
        'CREATE INDEX IF NOT EXISTS idx_betting_markets_usage_count ON betting_markets(usage_count);',
        'CREATE INDEX IF NOT EXISTS idx_betting_markets_last_seen ON betting_markets(last_seen_at);'
      ];

      for (const indexQuery of newIndexes) {
        try {
          await sequelize.query(indexQuery);
        } catch (indexError) {
          logger.warn('⚠️ Error creando índice:', indexError.message);
        }
      }

      logger.info('✅ Estructura de tabla actualizada');

    } catch (error) {
      logger.error('❌ Error actualizando estructura:', error);
      throw error;
    }
  }

  // ✅ MIGRAR MERCADOS EXISTENTES AL NUEVO FORMATO
  async migrateExistingMarkets() {
    try {
      logger.info('🔄 Migrando mercados existentes al formato dinámico...');

      // Mapeo de mercados legacy a API-Football IDs (solo los más comunes)
      const legacyMapping = {
        '1X2': { apiFootballId: 1, name: 'Match Winner' },
        'OVER_UNDER_2_5': { apiFootballId: 5, name: 'Goals Over/Under' },
        'BTTS': { apiFootballId: 8, name: 'Both Teams Score' },
        'EXACT_SCORE': { apiFootballId: 10, name: 'Exact Score' },
        'DOUBLE_CHANCE': { apiFootballId: 12, name: 'Double Chance' },
        'HT_1X2': { apiFootballId: 13, name: 'First Half Winner' },
        'ST_1X2': { apiFootballId: 3, name: 'Second Half Winner' },
        'HT_OVER_UNDER_1_5': { apiFootballId: 6, name: 'Goals Over/Under First Half' },
        'CORNERS_OVER_UNDER_8_5': { apiFootballId: 45, name: 'Corners Over Under' },
        'ODD_EVEN': { apiFootballId: 21, name: 'Odd/Even' }
      };

      const existingMarkets = await BettingMarket.findAll();
      let migratedCount = 0;

      for (const market of existingMarkets) {
        try {
          const legacyInfo = legacyMapping[market.key];
          
          if (legacyInfo) {
            // Migrar mercado conocido
            await market.update({
              apiFootballId: legacyInfo.apiFootballId,
              name: legacyInfo.name,
              usageCount: 1,
              lastSeenAt: new Date(),
              originalData: {
                migratedFrom: 'legacy',
                originalKey: market.key,
                migratedAt: new Date().toISOString()
              }
            });
            migratedCount++;
          } else {
            // Mercado custom - mantener pero marcar como legacy
            const fakeApiId = 9000 + parseInt(market.id.slice(-3)); // ID temporal
            
            await market.update({
              apiFootballId: fakeApiId,
              usageCount: 0,
              lastSeenAt: new Date(),
              originalData: {
                isLegacy: true,
                originalKey: market.key,
                migratedAt: new Date().toISOString()
              }
            });
          }

        } catch (marketError) {
          logger.error(`❌ Error migrando mercado ${market.key}:`, marketError.message);
        }
      }

      logger.info(`✅ ${migratedCount}/${existingMarkets.length} mercados migrados`);

    } catch (error) {
      logger.error('❌ Error migrando mercados:', error);
      throw error;
    }
  }

  // ✅ LIMPIAR DATOS OBSOLETOS
  async cleanupOldData() {
    try {
      logger.info('🧹 Limpiando datos obsoletos...');

      // Eliminar odds huérfanas (sin mercado válido)
      const deleteResult = await sequelize.query(`
        DELETE FROM odds 
        WHERE market_id NOT IN (
          SELECT id FROM betting_markets WHERE api_football_id IS NOT NULL
        );
      `, { type: sequelize.QueryTypes.DELETE });

      logger.info(`🗑️ ${deleteResult[1] || 0} odds huérfanas eliminadas`);

      // Marcar mercados inactivos que no se han visto recientemente
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const [inactiveCount] = await BettingMarket.update(
        { isActive: false },
        { 
          where: { 
            [Op.or]: [
              { lastSeenAt: null },
              { lastSeenAt: { [Op.lt]: thirtyDaysAgo } }
            ]
          }
        }
      );

      logger.info(`📊 ${inactiveCount} mercados marcados como inactivos`);

    } catch (error) {
      logger.error('❌ Error limpiando datos:', error);
      // No lanzar error, continuar con verificación
    }
  }

  // ✅ VERIFICAR MIGRACIÓN
  async verifyMigration() {
    try {
      logger.info('🔍 Verificando migración...');

      const stats = await Promise.all([
        BettingMarket.count(),
        BettingMarket.count({ where: { apiFootballId: { [Op.ne]: null } } }),
        Odds.count(),
        sequelize.query(`
          SELECT category, COUNT(*) as count 
          FROM betting_markets 
          WHERE api_football_id IS NOT NULL 
          GROUP BY category;
        `, { type: sequelize.QueryTypes.SELECT })
      ]);

      const [totalMarkets, validMarkets, totalOdds, categoryStats] = stats;

      const verification = {
        totalMarkets,
        validMarkets,
        totalOdds,
        migrationSuccess: validMarkets > 0,
        categoriesDetected: categoryStats.length,
        categoryBreakdown: categoryStats
      };

      logger.info('📊 VERIFICACIÓN DE MIGRACIÓN:', verification);

      if (verification.migrationSuccess) {
        logger.info('✅ Migración verificada exitosamente');
      } else {
        throw new Error('❌ Verificación falló: No se encontraron mercados válidos');
      }

      return verification;

    } catch (error) {
      logger.error('❌ Error en verificación:', error);
      throw error;
    }
  }

  // ✅ ROLLBACK EN CASO DE ERROR
  async rollback() {
    try {
      logger.warn('🔄 Ejecutando rollback de migración...');

      // Restaurar desde backup
      await sequelize.query(`
        TRUNCATE TABLE betting_markets CASCADE;
        INSERT INTO betting_markets SELECT * FROM betting_markets_backup;
      `);

      logger.info('✅ Rollback completado');

    } catch (error) {
      logger.error('❌ Error en rollback:', error);
      throw error;
    }
  }
}

// ✅ EJECUTAR MIGRACIÓN SI SE LLAMA DIRECTAMENTE
if (require.main === module) {
  const migration = new DynamicOddsMigration();
  
  migration.run()
    .then(() => {
      logger.info('🎉 ¡Migración a odds dinámicas completada!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Migración falló:', error);
      
      // Preguntar si hacer rollback
      if (process.env.AUTO_ROLLBACK === 'true') {
        migration.rollback()
          .then(() => process.exit(1))
          .catch(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });
}

module.exports = DynamicOddsMigration;