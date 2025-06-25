const { Fixture, League, Team } = require('../models');

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
      const league = await League.findOne({
        where: { apiFootballId: fixtureData.league.id }
      });

      if (!league) {
        throw new Error(`Liga ${fixtureData.league.id} no encontrada`);
      }

      // Buscar equipos
      const homeTeam = await Team.findOne({
        where: { apiFootballId: fixtureData.teams.home.id }
      });

      const awayTeam = await Team.findOne({
        where: { apiFootballId: fixtureData.teams.away.id }
      });

      if (!homeTeam || !awayTeam) {
        throw new Error(`Equipos no encontrados: ${fixtureData.teams.home.id} o ${fixtureData.teams.away.id}`);
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
}

module.exports = new FixtureSyncService();