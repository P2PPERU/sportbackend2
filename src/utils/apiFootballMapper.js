class ApiFootballMapper {
  // Mapear liga desde API-Football a nuestro modelo
  mapLeague(apiData) {
    const league = apiData.league;
    const country = apiData.country;
    
    return {
      apiFootballId: league.id,
      name: league.name,
      shortName: league.name.length > 20 ? this.createShortName(league.name) : league.name,
      code: league.name.substring(0, 10).toUpperCase(),
      country: country.name,
      countryCode: country.code,
      logo: league.logo,
      flag: country.flag,
      season: apiData.seasons?.[0]?.year || 2024,
      type: league.type === 'Cup' ? 'Cup' : 'League',
      isActive: true,
      priority: this.getLeaguePriority(league.id),
      lastSyncAt: new Date()
    };
  }

  // Mapear equipo desde API-Football a nuestro modelo
  mapTeam(apiData) {
    const team = apiData.team;
    const venue = apiData.venue;
    
    return {
      apiFootballId: team.id,
      name: team.name,
      shortName: team.name.length > 20 ? this.createShortName(team.name) : team.name,
      code: team.code || team.name.substring(0, 3).toUpperCase(),
      country: team.country,
      logo: team.logo,
      founded: team.founded,
      venue: venue?.name,
      venueCapacity: venue?.capacity,
      isNational: team.national || false,
      isActive: true,
      lastSyncAt: new Date()
    };
  }

  // Mapear fixture desde API-Football a nuestro modelo
  mapFixture(apiData, leagueId, homeTeamId, awayTeamId) {
    const fixture = apiData.fixture;
    const league = apiData.league;
    const teams = apiData.teams;
    const goals = apiData.goals;
    const score = apiData.score;
    
    return {
      apiFootballId: fixture.id,
      leagueId,
      homeTeamId,
      awayTeamId,
      round: league.round,
      season: league.season,
      fixtureDate: new Date(fixture.date),
      venue: fixture.venue?.name,
      city: fixture.venue?.city,
      referee: fixture.referee,
      timezone: fixture.timezone,
      status: fixture.status.short,
      statusLong: fixture.status.long,
      elapsed: fixture.status.elapsed,
      
      // Resultados
      homeScore: goals.home,
      awayScore: goals.away,
      homeScoreHt: score.halftime?.home,
      awayScoreHt: score.halftime?.away,
      homeScoreEt: score.extratime?.home,
      awayScoreEt: score.extratime?.away,
      homeScorePen: score.penalty?.home,
      awayScorePen: score.penalty?.away,
      
      // Disponibilidad para torneos
      isAvailableForTournament: false, // Admin debe marcar manualmente
      lastSyncAt: new Date()
    };
  }

  // Crear nombre corto
  createShortName(fullName) {
    // Tomar las primeras letras de cada palabra importante
    const words = fullName.split(' ');
    const importantWords = words.filter(word => 
      !['FC', 'CF', 'AC', 'AS', 'SC', 'United', 'City', 'Town', 'Real', 'Club'].includes(word)
    );
    
    if (importantWords.length >= 2) {
      return importantWords.slice(0, 2).join(' ').substring(0, 20);
    }
    
    return fullName.substring(0, 20);
  }

  // Obtener prioridad de liga
  getLeaguePriority(leagueId) {
    const priorities = {
      39: 100,   // Premier League
      140: 95,   // La Liga
      135: 90,   // Serie A
      78: 85,    // Bundesliga
      61: 80,    // Ligue 1
      2: 100,    // Champions League
      3: 85,     // Europa League
      88: 70,    // Eredivisie
      94: 65,    // Primeira Liga
      144: 60    // Jupiler Pro League
    };
    
    return priorities[leagueId] || 10;
  }
}

module.exports = new ApiFootballMapper();