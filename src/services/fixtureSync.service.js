// 📄 src/services/fixtureSync.service.js - CON TIMEZONE PERÚ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { Fixture, League, Team } = require('../models');
const { Op } = require('sequelize');
const apiFootballService = require('./apiFootballService');
const apiFootballMapper = require('../utils/apiFootballMapper');
const logger = require('../utils/logger');

class FixtureSyncService {
  constructor() {
    // ✅ TIMEZONE PARA PERÚ
    this.defaultTimezone = process.env.TIMEZONE || 'America/Lima';
    
    logger.info(`🕐 FixtureSyncService initialized with timezone: ${this.defaultTimezone}`);
  }

  // ✅ CORREGIDO: Sincronizar fixtures de hoy CON TIMEZONE PERÚ
  async syncTodayFixtures() {
    try {
      logger.info(`🔄 Sincronizando fixtures de hoy con timezone ${this.defaultTimezone}...`);

      // ✅ USAR TIMEZONE PERÚ EXPLÍCITAMENTE
      const response = await apiFootballService.getTodayFixtures(this.defaultTimezone);

      if (!response.response || response.response.length === 0) {
        logger.info(`ℹ️ No hay fixtures para hoy en timezone ${this.defaultTimezone}`);
        return { created: 0, updated: 0, message: 'No fixtures found for today' };
      }

      logger.info(`📊 Encontrados ${response.response.length} fixtures para hoy en timezone ${this.defaultTimezone}`);

      const results = {
        created: 0,
        updated: 0,
        errors: 0,
        timezone: this.defaultTimezone,
        processedCount: 0
      };

      for (const fixtureData of response.response) {
        try {
          const processResult = await this.processFixture(fixtureData);
          
          if (processResult.created) {
            results.created++;
          } else if (processResult.updated) {
            results.updated++;
          }

          results.processedCount++;

          // Log progreso cada 10 fixtures
          if (results.processedCount % 10 === 0) {
            logger.info(`📈 Progreso: ${results.processedCount}/${response.response.length} fixtures procesados`);
          }

        } catch (error) {
          logger.error(`❌ Error procesando fixture ${fixtureData.fixture?.id}:`, error.message);
          results.errors++;
        }
      }

      const summaryMessage = `✅ Sincronización de fixtures de hoy completada (${this.defaultTimezone}):
        📊 Total procesados: ${results.processedCount}
        ➕ Creados: ${results.created}
        🔄 Actualizados: ${results.updated}
        ❌ Errores: ${results.errors}`;

      logger.info(summaryMessage);
      return results;

    } catch (error) {
      logger.error(`❌ Error sincronizando fixtures de hoy con timezone ${this.defaultTimezone}:`, error);
      throw error;
    }
  }

  // ✅ CORREGIDO: Sincronizar fixtures de una liga específica CON TIMEZONE
  async syncLeagueFixtures(leagueApiId, days = 7) {
    try {
      logger.info(`🔄 Sincronizando fixtures de liga ${leagueApiId} para próximos ${days} días con timezone ${this.defaultTimezone}...`);

      const from = new Date().toISOString().split('T')[0];
      const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // ✅ USAR TIMEZONE PERÚ EN LA SOLICITUD
      const response = await apiFootballService.getFixturesByLeague(
        leagueApiId, 
        2024, 
        from, 
        to, 
        this.defaultTimezone
      );

      if (!response.response || response.response.length === 0) {
        logger.info(`ℹ️ No hay fixtures para liga ${leagueApiId} en el rango de fechas especificado`);
        return { created: 0, updated: 0, errors: 0 };
      }

      logger.info(`📊 Encontrados ${response.response.length} fixtures para liga ${leagueApiId}`);

      const results = {
        created: 0,
        updated: 0,
        errors: 0,
        leagueApiId,
        timezone: this.defaultTimezone,
        dateRange: { from, to }
      };

      for (const fixtureData of response.response) {
        try {
          const processResult = await this.processFixture(fixtureData);
          
          if (processResult.created) {
            results.created++;
          } else if (processResult.updated) {
            results.updated++;
          }

        } catch (error) {
          logger.error(`❌ Error procesando fixture de liga ${leagueApiId}:`, error.message);
          results.errors++;
        }
      }

      logger.info(`✅ Sincronización de fixtures de liga ${leagueApiId} completada:`, results);
      return results;

    } catch (error) {
      logger.error(`❌ Error sincronizando fixtures de liga ${leagueApiId}:`, error);
      throw error;
    }
  }

  // ✅ MEJORADO: Procesar un fixture individual con mejor logging
  async processFixture(fixtureData) {
    try {
      // Log detallado del fixture recibido
      logger.debug(`🔄 Procesando fixture: ${fixtureData.teams?.home?.name} vs ${fixtureData.teams?.away?.name}`, {
        fixtureId: fixtureData.fixture?.id,
        date: fixtureData.fixture?.date,
        timezone: fixtureData.fixture?.timezone,
        league: fixtureData.league?.name
      });

      // Buscar liga
      let league = await League.findOne({
        where: { apiFootballId: fixtureData.league.id }
      });

      // Si no existe la liga, crearla
      if (!league) {
        logger.info(`🏆 Creando liga: ${fixtureData.league.name} (ID: ${fixtureData.league.id})`);
        const leagueData = {
          apiFootballId: fixtureData.league.id,
          name: fixtureData.league.name,
          shortName: fixtureData.league.name.substring(0, 20),
          country: fixtureData.league.country || 'Unknown',
          countryCode: fixtureData.league.flag ? 'XX' : 'XX',
          logo: fixtureData.league.logo,
          season: fixtureData.league.season || 2024,
          type: 'League',
          isActive: true,
          priority: 10,
          lastSyncAt: new Date()
        };
        league = await League.create(leagueData);
      }

      // Buscar o crear equipos
      let homeTeam = await Team.findOne({
        where: { apiFootballId: fixtureData.teams.home.id }
      });

      if (!homeTeam) {
        logger.info(`🏠 Creando equipo local: ${fixtureData.teams.home.name} (ID: ${fixtureData.teams.home.id})`);
        const homeTeamData = {
          apiFootballId: fixtureData.teams.home.id,
          name: fixtureData.teams.home.name,
          shortName: fixtureData.teams.home.name.substring(0, 20),
          logo: fixtureData.teams.home.logo,
          isActive: true,
          lastSyncAt: new Date()
        };
        homeTeam = await Team.create(homeTeamData);
      }

      let awayTeam = await Team.findOne({
        where: { apiFootballId: fixtureData.teams.away.id }
      });

      if (!awayTeam) {
        logger.info(`✈️ Creando equipo visitante: ${fixtureData.teams.away.name} (ID: ${fixtureData.teams.away.id})`);
        const awayTeamData = {
          apiFootballId: fixtureData.teams.away.id,
          name: fixtureData.teams.away.name,
          shortName: fixtureData.teams.away.name.substring(0, 20),
          logo: fixtureData.teams.away.logo,
          isActive: true,
          lastSyncAt: new Date()
        };
        awayTeam = await Team.create(awayTeamData);
      }

      // Mapear datos del fixture
      const mappedData = apiFootballMapper.mapFixture(fixtureData, league.id, homeTeam.id, awayTeam.id);

      // ✅ AGREGAR INFORMACIÓN DE TIMEZONE AL MAPEO
      mappedData.originalTimezone = fixtureData.fixture?.timezone || this.defaultTimezone;
      mappedData.lastSyncAt = new Date();

      // Crear o actualizar fixture
      const [fixture, created] = await Fixture.findOrCreate({
        where: { apiFootballId: mappedData.apiFootballId },
        defaults: mappedData
      });

      if (!created) {
        await fixture.update({
          ...mappedData,
          lastSyncAt: new Date()
        });
        
        logger.debug(`🔄 Fixture actualizado: ${homeTeam.name} vs ${awayTeam.name} (${fixture.id})`);
        return { updated: true, fixture };
      }

      logger.debug(`➕ Fixture creado: ${homeTeam.name} vs ${awayTeam.name} (${fixture.id})`);
      return { created: true, fixture };

    } catch (error) {
      logger.error('❌ Error procesando fixture:', error);
      throw error;
    }
  }

  // ✅ MEJORADO: Actualizar resultados de fixtures finalizados CON TIMEZONE
  async updateFinishedFixtures() {
    try {
      logger.info(`🔄 Actualizando resultados de fixtures finalizados (timezone: ${this.defaultTimezone})...`);

      // Buscar fixtures que están en juego o recién terminados (últimas 6 horas)
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      const fixtures = await Fixture.findAll({
        where: {
          fixtureDate: { [Op.gte]: sixHoursAgo },
          status: { [Op.in]: ['1H', 'HT', '2H', 'ET', 'FT'] }
        },
        include: [
          { model: Team, as: 'homeTeam', attributes: ['name'] },
          { model: Team, as: 'awayTeam', attributes: ['name'] }
        ],
        limit: 50 // Limitar para no gastar muchas requests
      });

      if (fixtures.length === 0) {
        logger.info('ℹ️ No hay fixtures que requieran actualización');
        return { updated: 0, errors: 0 };
      }

      logger.info(`📊 Encontrados ${fixtures.length} fixtures para actualizar resultados`);

      const results = {
        updated: 0,
        errors: 0,
        processed: 0,
        timezone: this.defaultTimezone
      };

      for (const fixture of fixtures) {
        try {
          // Pausa para rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

          logger.debug(`🔄 Actualizando fixture: ${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name} (API ID: ${fixture.apiFootballId})`);

          const response = await apiFootballService.makeRequest('/fixtures', {
            id: fixture.apiFootballId,
            timezone: this.defaultTimezone // ✅ USAR TIMEZONE PERÚ
          });

          if (response.response && response.response.length > 0) {
            const fixtureData = response.response[0];
            const mappedData = apiFootballMapper.mapFixture(
              fixtureData, 
              fixture.leagueId, 
              fixture.homeTeamId, 
              fixture.awayTeamId
            );

            // ✅ PRESERVAR TIMEZONE INFO
            mappedData.originalTimezone = fixtureData.fixture?.timezone || this.defaultTimezone;

            await fixture.update({
              ...mappedData,
              lastSyncAt: new Date()
            });

            results.updated++;
            logger.debug(`✅ Fixture actualizado: ${fixture.apiFootballId} - Status: ${mappedData.status}`);
          }

          results.processed++;

        } catch (error) {
          logger.error(`❌ Error actualizando fixture ${fixture.apiFootballId}:`, error.message);
          results.errors++;
          results.processed++;
        }
      }

      logger.info(`✅ Actualización de fixtures finalizada:`, results);
      return results;

    } catch (error) {
      logger.error(`❌ Error actualizando fixtures finalizados:`, error);
      throw error;
    }
  }

  // ✅ MEJORADO: Obtener fixtures de hoy desde base de datos CON FORMATEO DE TIMEZONE
  async getTodayFixtures() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      logger.info(`📅 Obteniendo fixtures de hoy desde BD (${startOfDay.toISOString().split('T')[0]})`);

      const fixtures = await Fixture.findAll({
        where: {
          fixtureDate: {
            [Op.between]: [startOfDay, endOfDay]
          }
        },
        include: [
          {
            model: League,
            as: 'league',
            attributes: ['id', 'name', 'shortName', 'logo', 'country', 'priority']
          },
          {
            model: Team,
            as: 'homeTeam',
            attributes: ['id', 'name', 'shortName', 'logo']
          },
          {
            model: Team,
            as: 'awayTeam',
            attributes: ['id', 'name', 'shortName', 'logo']
          }
        ],
        order: [
          ['league', 'priority', 'DESC'], // Ordenar por prioridad de liga
          ['fixtureDate', 'ASC']
        ]
      });

      logger.info(`📊 Encontrados ${fixtures.length} fixtures de hoy en BD`);

      // ✅ AGREGAR INFORMACIÓN DE TIMEZONE A CADA FIXTURE
      const enrichedFixtures = fixtures.map(fixture => {
        const fixtureObj = fixture.toJSON();
        
        // Agregar fecha formateada para Perú
        fixtureObj.dateLocal = this.formatDateForTimezone(fixture.fixtureDate, this.defaultTimezone);
        fixtureObj.timezone = this.defaultTimezone;
        
        return fixtureObj;
      });

      return enrichedFixtures;
    } catch (error) {
      logger.error('❌ Error obteniendo fixtures de hoy:', error);
      throw error;
    }
  }

  // ✅ MEJORADO: Buscar fixtures por criterio CON SOPORTE DE TIMEZONE
  async searchFixtures(criteria = {}) {
    try {
      logger.info('🔍 Buscando fixtures con criterios:', criteria);

      const where = {};
      const include = [
        {
          model: League,
          as: 'league',
          attributes: ['id', 'name', 'shortName', 'logo', 'country', 'priority']
        },
        {
          model: Team,
          as: 'homeTeam',
          attributes: ['id', 'name', 'shortName', 'logo']
        },
        {
          model: Team,
          as: 'awayTeam',
          attributes: ['id', 'name', 'shortName', 'logo']
        }
      ];

      // Filtro por fecha
      if (criteria.date) {
        const date = new Date(criteria.date);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        where.fixtureDate = { [Op.between]: [startOfDay, endOfDay] };
      }

      // Filtro por liga
      if (criteria.leagueId) {
        where.leagueId = criteria.leagueId;
      }

      // Filtro por estado
      if (criteria.status) {
        if (Array.isArray(criteria.status)) {
          where.status = { [Op.in]: criteria.status };
        } else {
          where.status = criteria.status;
        }
      }

      // Filtro por equipo
      if (criteria.teamId) {
        where[Op.or] = [
          { homeTeamId: criteria.teamId },
          { awayTeamId: criteria.teamId }
        ];
      }

      const fixtures = await Fixture.findAll({
        where,
        include,
        order: [
          ['league', 'priority', 'DESC'],
          ['fixtureDate', 'ASC']
        ],
        limit: criteria.limit || 50
      });

      logger.info(`📊 Encontrados ${fixtures.length} fixtures que coinciden con los criterios`);

      // ✅ ENRIQUECER CON INFORMACIÓN DE TIMEZONE
      const enrichedFixtures = fixtures.map(fixture => {
        const fixtureObj = fixture.toJSON();
        fixtureObj.dateLocal = this.formatDateForTimezone(fixture.fixtureDate, this.defaultTimezone);
        fixtureObj.timezone = this.defaultTimezone;
        return fixtureObj;
      });

      return enrichedFixtures;
    } catch (error) {
      logger.error('❌ Error buscando fixtures:', error);
      throw error;
    }
  }

  // ✅ NUEVO: Sincronizar fixtures por rango de fechas con timezone
  async syncFixturesByDateRange(from, to, timezone = null, additionalParams = {}) {
    try {
      const effectiveTimezone = timezone || this.defaultTimezone;
      
      logger.info(`🔄 Sincronizando fixtures del ${from} al ${to} con timezone ${effectiveTimezone}...`);

      const response = await apiFootballService.getFixturesByDateRange(
        from, 
        to, 
        effectiveTimezone, 
        additionalParams
      );

      if (!response.response || response.response.length === 0) {
        logger.info(`ℹ️ No hay fixtures en el rango ${from} - ${to}`);
        return { created: 0, updated: 0, errors: 0 };
      }

      const results = {
        created: 0,
        updated: 0,
        errors: 0,
        timezone: effectiveTimezone,
        dateRange: { from, to }
      };

      for (const fixtureData of response.response) {
        try {
          const processResult = await this.processFixture(fixtureData);
          
          if (processResult.created) results.created++;
          else if (processResult.updated) results.updated++;

        } catch (error) {
          logger.error(`❌ Error procesando fixture del rango de fechas:`, error.message);
          results.errors++;
        }
      }

      logger.info(`✅ Sincronización por rango de fechas completada:`, results);
      return results;

    } catch (error) {
      logger.error(`❌ Error sincronizando fixtures por rango de fechas:`, error);
      throw error;
    }
  }

  // ✅ NUEVO: Formatear fecha para timezone específico
  formatDateForTimezone(date, timezone = null) {
    try {
      const targetTimezone = timezone || this.defaultTimezone;
      
      return new Intl.DateTimeFormat('es-PE', {
        timeZone: targetTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(date));
    } catch (error) {
      logger.error(`❌ Error formateando fecha para timezone ${timezone}:`, error.message);
      return date; // Fallback a fecha original
    }
  }

  // ✅ NUEVO: Obtener estadísticas de sincronización
  async getSyncStats() {
    try {
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [todayFixtures, thisWeekFixtures, totalFixtures] = await Promise.all([
        Fixture.count({ where: { fixtureDate: { [Op.gte]: today } } }),
        Fixture.count({ where: { fixtureDate: { [Op.gte]: thisWeek } } }),
        Fixture.count()
      ]);

      const recentSync = await Fixture.findOne({
        attributes: ['lastSyncAt'],
        order: [['lastSyncAt', 'DESC']]
      });

      return {
        timezone: this.defaultTimezone,
        fixtures: {
          today: todayFixtures,
          thisWeek: thisWeekFixtures,
          total: totalFixtures
        },
        lastSync: recentSync?.lastSyncAt || null,
        stats: {
          serviceName: 'FixtureSyncService',
          timezone: this.defaultTimezone,
          isActive: true
        }
      };
    } catch (error) {
      logger.error('❌ Error obteniendo estadísticas de sincronización:', error);
      throw error;
    }
  }

  // ✅ NUEVO: Cambiar timezone del servicio
  setTimezone(timezone) {
    if (!this.isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    const previousTimezone = this.defaultTimezone;
    this.defaultTimezone = timezone;
    
    logger.info(`🕐 FixtureSyncService timezone changed from ${previousTimezone} to ${timezone}`);
    
    return {
      previous: previousTimezone,
      current: timezone,
      changed: true
    };
  }

  // ✅ NUEVO: Verificar si timezone es válido
  isValidTimezone(timezone) {
    try {
      Intl.DateTimeFormat('en', { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new FixtureSyncService();