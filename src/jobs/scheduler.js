const cron = require('node-cron');
const logger = require('../utils/logger');

class JobScheduler {
  constructor() {
    this.jobs = new Map();
  }

  // Inicializar todos los jobs
  start() {
    logger.info('🕐 Iniciando programador de trabajos...');

    // Sincronizar fixtures de hoy cada 5 minutos
    this.scheduleJob('sync-today-fixtures', '*/5 * * * *', async () => {
      const fixtureSync = require('./syncFixtures.job');
      await fixtureSync.syncTodayFixtures();
    });

    // Actualizar resultados cada 2 minutos durante horas activas
    this.scheduleJob('update-results', '*/2 * * * *', async () => {
      const fixtureSync = require('./syncFixtures.job');
      await fixtureSync.updateFinishedFixtures();
    });

    // Sincronizar ligas principales cada 6 horas
    this.scheduleJob('sync-leagues', '0 */6 * * *', async () => {
      const leagueSync = require('./syncLeagues.job');
      await leagueSync.syncMainLeagues();
    });

    // Sincronizar equipos una vez al día
    this.scheduleJob('sync-teams', '0 3 * * *', async () => {
      const teamSync = require('./syncTeams.job');
      await teamSync.syncAllTeams();
    });

    // Limpiar cache cada hora
    this.scheduleJob('cleanup-cache', '0 * * * *', async () => {
      const cleanupJob = require('./cleanupCache.job');
      await cleanupJob.cleanExpiredCache();
    });

    logger.info(`✅ ${this.jobs.size} trabajos programados iniciados`);
  }

  // Programar un trabajo
  scheduleJob(name, cronPattern, taskFunction) {
    const task = cron.schedule(cronPattern, async () => {
      try {
        logger.info(`🔄 Ejecutando job: ${name}`);
        await taskFunction();
        logger.info(`✅ Job completado: ${name}`);
      } catch (error) {
        logger.error(`❌ Error en job ${name}:`, error);
      }
    }, {
      scheduled: false,
      timezone: process.env.TZ || 'America/Lima'
    });

    this.jobs.set(name, task);
    task.start();
    
    logger.info(`📅 Job programado: ${name} - ${cronPattern}`);
  }

  // Detener todos los jobs
  stop() {
    logger.info('🛑 Deteniendo todos los trabajos programados...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`🛑 Job detenido: ${name}`);
    });
    
    this.jobs.clear();
  }

  // Obtener estado de los jobs
  getStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running || false,
        scheduled: true
      };
    });
    return status;
  }
}

const scheduler = new JobScheduler();

// Auto-iniciar si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  scheduler.start();
}

module.exports = scheduler;
