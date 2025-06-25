const fixtureSync = require('../services/fixtureSync.service');
const logger = require('../utils/logger');

class SyncFixturesJob {
  // Sincronizar fixtures de hoy
  async syncTodayFixtures() {
    try {
      logger.info('📅 Job: Sincronizando fixtures de hoy...');
      const result = await fixtureSync.syncTodayFixtures();
      logger.info('✅ Job fixtures hoy completado:', result);
      return result;
    } catch (error) {
      logger.error('❌ Error en job fixtures hoy:', error);
      throw error;
    }
  }

  // Actualizar resultados
  async updateFinishedFixtures() {
    try {
      logger.info('📊 Job: Actualizando resultados...');
      const result = await fixtureSync.updateFinishedFixtures();
      logger.info('✅ Job resultados completado:', result);
      return result;
    } catch (error) {
      logger.error('❌ Error en job resultados:', error);
      throw error;
    }
  }
}

module.exports = new SyncFixturesJob();