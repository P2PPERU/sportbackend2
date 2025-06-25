// 🏆 CONFIGURACIÓN DE LIGAS TOP MUNDIALES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TOP_LEAGUES = {
  // 🌍 COMPETICIONES INTERNACIONALES
  INTERNATIONAL: {
    WORLD_CUP: { id: 1, name: 'FIFA World Cup', priority: 100, continent: 'WORLD' },
    COPA_AMERICA: { id: 9, name: 'Copa America', priority: 95, continent: 'SOUTH_AMERICA' },
    EUROS: { id: 4, name: 'UEFA European Championship', priority: 95, continent: 'EUROPE' },
    NATIONS_LEAGUE: { id: 5, name: 'UEFA Nations League', priority: 85, continent: 'EUROPE' },
    CONFEDERATIONS_CUP: { id: 15, name: 'FIFA Confederations Cup', priority: 80, continent: 'WORLD' }
  },

  // 🏆 COMPETICIONES DE CLUBES MUNDIALES
  CLUB_INTERNATIONAL: {
    CHAMPIONS_LEAGUE: { id: 2, name: 'UEFA Champions League', priority: 100, continent: 'EUROPE' },
    EUROPA_LEAGUE: { id: 3, name: 'UEFA Europa League', priority: 90, continent: 'EUROPE' },
    CONFERENCE_LEAGUE: { id: 848, name: 'UEFA Conference League', priority: 75, continent: 'EUROPE' },
    COPA_LIBERTADORES: { id: 13, name: 'Copa Libertadores', priority: 95, continent: 'SOUTH_AMERICA' },
    COPA_SUDAMERICANA: { id: 11, name: 'Copa Sudamericana', priority: 85, continent: 'SOUTH_AMERICA' },
    CLUB_WORLD_CUP: { id: 15, name: 'FIFA Club World Cup', priority: 90, continent: 'WORLD' },
    CONCACAF_CHAMPIONS: { id: 26, name: 'CONCACAF Champions League', priority: 70, continent: 'NORTH_AMERICA' }
  },

  // 🇪🇺 LIGAS EUROPEAS TOP
  EUROPE_TOP: {
    PREMIER_LEAGUE: { id: 39, name: 'Premier League', priority: 100, continent: 'EUROPE', country: 'England' },
    LA_LIGA: { id: 140, name: 'La Liga', priority: 98, continent: 'EUROPE', country: 'Spain' },
    SERIE_A: { id: 135, name: 'Serie A', priority: 96, continent: 'EUROPE', country: 'Italy' },
    BUNDESLIGA: { id: 78, name: 'Bundesliga', priority: 94, continent: 'EUROPE', country: 'Germany' },
    LIGUE_1: { id: 61, name: 'Ligue 1', priority: 92, continent: 'EUROPE', country: 'France' },
    EREDIVISIE: { id: 88, name: 'Eredivisie', priority: 85, continent: 'EUROPE', country: 'Netherlands' },
    PRIMEIRA_LIGA: { id: 94, name: 'Primeira Liga', priority: 82, continent: 'EUROPE', country: 'Portugal' },
    SCOTTISH_PREMIER: { id: 179, name: 'Scottish Premiership', priority: 75, continent: 'EUROPE', country: 'Scotland' }
  },

  // 🌎 LIGAS SUDAMERICANAS
  SOUTH_AMERICA: {
    BRASILEIRAO: { id: 71, name: 'Brasileirão Serie A', priority: 90, continent: 'SOUTH_AMERICA', country: 'Brazil' },
    ARGENTINA_PRIMERA: { id: 128, name: 'Primera División', priority: 88, continent: 'SOUTH_AMERICA', country: 'Argentina' },
    COLOMBIA_PRIMERA: { id: 239, name: 'Primera A', priority: 75, continent: 'SOUTH_AMERICA', country: 'Colombia' },
    CHILE_PRIMERA: { id: 265, name: 'Primera División', priority: 72, continent: 'SOUTH_AMERICA', country: 'Chile' },
    ECUADOR_PRIMERA: { id: 242, name: 'Serie A', priority: 70, continent: 'SOUTH_AMERICA', country: 'Ecuador' },
    URUGUAY_PRIMERA: { id: 274, name: 'Primera División', priority: 68, continent: 'SOUTH_AMERICA', country: 'Uruguay' },
    PERU_PRIMERA: { id: 281, name: 'Liga 1', priority: 65, continent: 'SOUTH_AMERICA', country: 'Peru' }
  },

  // 🇺🇸 LIGAS NORTEAMERICANAS
  NORTH_AMERICA: {
    MLS: { id: 253, name: 'Major League Soccer', priority: 80, continent: 'NORTH_AMERICA', country: 'USA' },
    LIGA_MX: { id: 262, name: 'Liga MX', priority: 85, continent: 'NORTH_AMERICA', country: 'Mexico' },
    CANADIAN_PREMIER: { id: 285, name: 'Canadian Premier League', priority: 60, continent: 'NORTH_AMERICA', country: 'Canada' }
  },

  // 🌏 LIGAS DESTACADAS OTROS CONTINENTES
  OTHER_CONTINENTS: {
    J_LEAGUE: { id: 98, name: 'J1 League', priority: 75, continent: 'ASIA', country: 'Japan' },
    K_LEAGUE: { id: 292, name: 'K League 1', priority: 70, continent: 'ASIA', country: 'South Korea' },
    CHINESE_SUPER: { id: 169, name: 'Chinese Super League', priority: 68, continent: 'ASIA', country: 'China' },
    A_LEAGUE: { id: 188, name: 'A-League', priority: 72, continent: 'OCEANIA', country: 'Australia' },
    SOUTH_AFRICAN: { id: 288, name: 'Premier Division', priority: 65, continent: 'AFRICA', country: 'South Africa' }
  }
};

// 🎯 FUNCIONES UTILITARIAS
class TopLeaguesConfig {
  // Obtener todas las ligas top
  getAllTopLeagues() {
    const allLeagues = [];
    
    Object.values(TOP_LEAGUES).forEach(category => {
      Object.values(category).forEach(league => {
        allLeagues.push(league);
      });
    });
    
    return allLeagues.sort((a, b) => b.priority - a.priority);
  }

  // Obtener IDs de ligas top
  getTopLeagueIds() {
    return this.getAllTopLeagues().map(league => league.id);
  }

  // Obtener ligas por continente
  getLeaguesByContinent(continent) {
    return this.getAllTopLeagues().filter(league => 
      league.continent === continent.toUpperCase()
    );
  }

  // Obtener ligas premium (prioridad > 80)
  getPremiumLeagues() {
    return this.getAllTopLeagues().filter(league => league.priority >= 80);
  }

  // Obtener ligas sudamericanas destacadas
  getSouthAmericanLeagues() {
    return [
      ...Object.values(TOP_LEAGUES.SOUTH_AMERICA),
      TOP_LEAGUES.CLUB_INTERNATIONAL.COPA_LIBERTADORES,
      TOP_LEAGUES.CLUB_INTERNATIONAL.COPA_SUDAMERICANA,
      TOP_LEAGUES.INTERNATIONAL.COPA_AMERICA
    ].sort((a, b) => b.priority - a.priority);
  }

  // Obtener ligas europeas top
  getEuropeanTopLeagues() {
    return [
      ...Object.values(TOP_LEAGUES.EUROPE_TOP),
      TOP_LEAGUES.CLUB_INTERNATIONAL.CHAMPIONS_LEAGUE,
      TOP_LEAGUES.CLUB_INTERNATIONAL.EUROPA_LEAGUE,
      TOP_LEAGUES.CLUB_INTERNATIONAL.CONFERENCE_LEAGUE
    ].sort((a, b) => b.priority - a.priority);
  }

  // Verificar si una liga es top
  isTopLeague(leagueId) {
    return this.getTopLeagueIds().includes(parseInt(leagueId));
  }

  // Obtener información de una liga
  getLeagueInfo(leagueId) {
    const allLeagues = this.getAllTopLeagues();
    return allLeagues.find(league => league.id === parseInt(leagueId));
  }

  // Obtener ligas por prioridad mínima
  getLeaguesByMinPriority(minPriority = 80) {
    return this.getAllTopLeagues().filter(league => league.priority >= minPriority);
  }

  // Obtener configuración para sincronización
  getSyncConfig() {
    return {
      // Ligas más importantes (sync cada 2 minutos)
      high_priority: this.getAllTopLeagues()
        .filter(l => l.priority >= 90)
        .map(l => l.id),
      
      // Ligas importantes (sync cada 5 minutos)  
      medium_priority: this.getAllTopLeagues()
        .filter(l => l.priority >= 75 && l.priority < 90)
        .map(l => l.id),
        
      // Ligas estándar (sync cada 15 minutos)
      standard_priority: this.getAllTopLeagues()
        .filter(l => l.priority < 75)
        .map(l => l.id)
    };
  }
}

module.exports = {
  TOP_LEAGUES,
  topLeaguesConfig: new TopLeaguesConfig()
};