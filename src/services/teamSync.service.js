const { Team, League } = require('../models');

class TeamSyncService {
  // Sincronizar equipos de una liga
  async syncTeamsByLeague(leagueApiId, season = 2024) {
    try {
      logger.info(`🔄 Sincronizando equipos de liga ${leagueApiId}...`);

      const response = await apiFootballService.makeRequest('/teams', {
        league: leagueApiId,
        season
      });

      if (!response.response || response.response.length === 0) {
        logger.warn(`No se encontraron equipos para liga ${leagueApiId}`);
        return { created: 0, updated: 0 };
      }

      const results = {
        created: 0,
        updated: 0,
        errors: 0
      };

      // Buscar la liga en nuestra BD
      const league = await League.findOne({
        where: { apiFootballId: leagueApiId }
      });

      if (!league) {
        throw new Error(`Liga con API ID ${leagueApiId} no encontrada en BD`);
      }

      for (const teamData of response.response) {
        try {
          const mappedData = apiFootballMapper.mapTeam(teamData);
          
          const [team, created] = await Team.findOrCreate({
            where: { apiFootballId: mappedData.apiFootballId },
            defaults: mappedData
          });

          if (!created) {
            await team.update({
              ...mappedData,
              lastSyncAt: new Date()
            });
            results.updated++;
          } else {
            results.created++;
          }

          // Asociar equipo con liga si no está asociado
          const hasAssociation = await league.hasTeam(team);
          if (!hasAssociation) {
            await league.addTeam(team);
          }

          logger.info(`✅ Equipo sincronizado: ${team.name}`);

        } catch (error) {
          logger.error(`❌ Error sincronizando equipo:`, error.message);
          results.errors++;
        }
      }

      logger.info(`✅ Sincronización de equipos completada para liga ${leagueApiId}:`, results);
      return results;

    } catch (error) {
      logger.error(`❌ Error sincronizando equipos de liga ${leagueApiId}:`, error);
      throw error;
    }
  }

  // Sincronizar equipos de todas las ligas activas
  async syncAllTeams() {
    try {
      logger.info('🔄 Sincronizando equipos de todas las ligas activas...');

      const activeLeagues = await League.findAll({
        where: { isActive: true }
      });

      const totalResults = {
        created: 0,
        updated: 0,
        errors: 0,
        leagues: 0
      };

      for (const league of activeLeagues) {
        try {
          // Pausa entre ligas para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const results = await this.syncTeamsByLeague(league.apiFootballId);
          
          totalResults.created += results.created;
          totalResults.updated += results.updated;
          totalResults.errors += results.errors;
          totalResults.leagues++;

        } catch (error) {
          logger.error(`❌ Error sincronizando equipos de ${league.name}:`, error.message);
          totalResults.errors++;
        }
      }

      logger.info('✅ Sincronización completa de equipos finalizada:', totalResults);
      return totalResults;

    } catch (error) {
      logger.error('❌ Error en sincronización completa de equipos:', error);
      throw error;
    }
  }

  // Buscar equipo por ID de API-Football
  async getTeamByApiId(apiFootballId) {
    return await Team.findOne({
      where: { apiFootballId }
    });
  }
}

module.exports = new TeamSyncService();
