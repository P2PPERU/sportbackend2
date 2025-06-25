const apiFootballService = require('./apiFootballService');
const { League } = require('../models');
const apiFootballMapper = require('../utils/apiFootballMapper');

class LeagueSyncService {
  // Sincronizar ligas principales
  async syncMainLeagues() {
    try {
      logger.info('🔄 Iniciando sincronización de ligas principales...');

      // IDs de las ligas principales en API-Football
      const mainLeagues = [
        39,   // Premier League
        140,  // La Liga
        135,  // Serie A
        78,   // Bundesliga
        61,   // Ligue 1
        2,    // Champions League
        3,    // Europa League
        88,   // Eredivisie
        94,   // Primeira Liga
        144   // Jupiler Pro League
      ];

      const results = {
        created: 0,
        updated: 0,
        errors: 0
      };

      for (const leagueId of mainLeagues) {
        try {
          // Pequeña pausa para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const response = await apiFootballService.makeRequest('/leagues', { 
            id: leagueId,
            season: 2024
          });

          if (response.response && response.response.length > 0) {
            const leagueData = response.response[0];
            const mappedData = apiFootballMapper.mapLeague(leagueData);
            
            const [league, created] = await League.findOrCreate({
              where: { apiFootballId: mappedData.apiFootballId },
              defaults: mappedData
            });

            if (!created) {
              await league.update({
                ...mappedData,
                lastSyncAt: new Date()
              });
              results.updated++;
            } else {
              results.created++;
            }

            logger.info(`✅ Liga sincronizada: ${league.name}`);
          }

        } catch (error) {
          logger.error(`❌ Error sincronizando liga ${leagueId}:`, error.message);
          results.errors++;
        }
      }

      logger.info(`✅ Sincronización de ligas completada:`, results);
      return results;

    } catch (error) {
      logger.error('❌ Error en sincronización de ligas:', error);
      throw error;
    }
  }

  // Obtener liga por ID de API-Football
  async getLeagueByApiId(apiFootballId) {
    return await League.findOne({
      where: { apiFootballId }
    });
  }

  // Marcar liga como activa/inactiva
  async toggleLeagueStatus(leagueId, isActive) {
    const league = await League.findByPk(leagueId);
    if (league) {
      await league.update({ isActive });
      return league;
    }
    return null;
  }
}

module.exports = new LeagueSyncService();