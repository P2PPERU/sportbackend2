const { Fixture, League, Team } = require('../models');
const { Op } = require('sequelize');
const apiFootballService = require('./apiFootballService');
const apiFootballMapper = require('../utils/apiFootballMapper');
const logger = require('../utils/logger');

class FixtureSyncService {
  // Sincronizar fixtures de hoy
  async syncTodayFixtures() {
    try {
      logger.info('🔄 Sincronizando fixtures de hoy...');

      const response = await apiFootballService.getTodayFixtures();

      if (!response.response || response.response.length === 0) {
        logger.info('No hay fixtures para hoy');
        return { created: 0, updated: 0 };
      }

      const results = {
        created: 0,
        updated: 0,
        errors: 0
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
          logger.error(`❌ Error procesando fixture ${fixtureData.fixture?.id}:`, error.message);
          results.errors++;
        }
      }

      logger.info('✅ Sincronización de fixtures de hoy completada:', results);
      return results;

    } catch (error) {
      logger.error('❌ Error sincronizando fixtures de hoy:', error);
      throw error;
    }
  }

  // Sincronizar fixtures de una liga específica
  async syncLeagueFixtures(leagueApiId, days = 7) {
    try {
      logger.info(`🔄 Sincronizando fixtures de liga ${leagueApiId} para próximos ${days} días...`);

      const from = new Date().toISOString().split('T')[0];
      const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await apiFootballService.getFixturesByLeague(leagueApiId, 2024, from, to);

      if (!response.response || response.response.length === 0) {
        logger.info(`No hay fixtures para liga ${leagueApiId}`);
        return { created: 0, updated: 0 };
      }

      const results = {
        created: 0,
        updated: 0,
        errors: 0
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
          logger.error(`❌ Error procesando fixture:`, error.message);
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

  // Procesar un fixture individual
  async processFixture(fixtureData) {
    try {
      // Buscar liga
      let league = await League.findOne({
        where: { apiFootballId: fixtureData.league.id }
      });

      // Si no existe la liga, crearla
      if (!league) {
        logger.info(`Creando liga: ${fixtureData.league.name} (${fixtureData.league.id})`);
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
        logger.info(`Creando equipo local: ${fixtureData.teams.home.name}`);
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
        logger.info(`Creando equipo visitante: ${fixtureData.teams.away.name}`);
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
        return { updated: true };
      }

      return { created: true };

    } catch (error) {
      logger.error('Error procesando fixture:', error);
      throw error;
    }
  }

  // Actualizar resultados de fixtures finalizados
  async updateFinishedFixtures() {
    try {
      logger.info('🔄 Actualizando resultados de fixtures finalizados...');

      // Buscar fixtures que están en juego o recién terminados (últimas 6 horas)
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      const fixtures = await Fixture.findAll({
        where: {
          fixtureDate: { [Op.gte]: sixHoursAgo },
          status: { [Op.in]: ['1H', 'HT', '2H', 'ET', 'FT'] }
        },
        limit: 50 // Limitar para no gastar muchas requests
      });

      const results = {
        updated: 0,
        errors: 0
      };

      for (const fixture of fixtures) {
        try {
          // Pausa para rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

          const response = await apiFootballService.makeRequest('/fixtures', {
            id: fixture.apiFootballId
          });

          if (response.response && response.response.length > 0) {
            const fixtureData = response.response[0];
            const mappedData = apiFootballMapper.mapFixture(fixtureData, fixture.leagueId, fixture.homeTeamId, fixture.awayTeamId);

            await fixture.update({
              ...mappedData,
              lastSyncAt: new Date()
            });

            results.updated++;
            logger.info(`✅ Fixture actualizado: ${fixture.apiFootballId}`);
          }

        } catch (error) {
          logger.error(`❌ Error actualizando fixture ${fixture.apiFootballId}:`, error.message);
          results.errors++;
        }
      }

      logger.info('✅ Actualización de fixtures finalizada:', results);
      return results;

    } catch (error) {
      logger.error('❌ Error actualizando fixtures finalizados:', error);
      throw error;
    }
  }

  // Obtener fixtures de hoy desde base de datos
  async getTodayFixtures() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

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
            attributes: ['id', 'name', 'shortName', 'logo', 'country']
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
        order: [['fixtureDate', 'ASC']]
      });

      return fixtures;
    } catch (error) {
      logger.error('❌ Error obteniendo fixtures de hoy:', error);
      throw error;
    }
  }

  // Buscar fixtures por criterio
  async searchFixtures(criteria = {}) {
    try {
      const where = {};
      const include = [
        {
          model: League,
          as: 'league',
          attributes: ['id', 'name', 'shortName', 'logo', 'country']
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
        where.status = criteria.status;
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
        order: [['fixtureDate', 'ASC']],
        limit: criteria.limit || 50
      });

      return fixtures;
    } catch (error) {
      logger.error('❌ Error buscando fixtures:', error);
      throw error;
    }
  }
}

module.exports = new FixtureSyncService();