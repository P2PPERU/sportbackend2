const sequelize = require('../config/database');

// Importar todos los modelos
const League = require('./League');
const Team = require('./Team');
const Fixture = require('./Fixture');
const BettingMarket = require('./BettingMarket');
const Odds = require('./Odds');
const TeamStatistics = require('./TeamStatistics');
const Standing = require('./Standing');
const FixtureResult = require('./FixtureResult');
const ApiCache = require('./ApiCache');

// ═══════════════════════════════════════════════════════════════════
// RELACIONES ENTRE MODELOS
// ═══════════════════════════════════════════════════════════════════

// League ↔ Team (muchos a muchos a través de participación en ligas)
League.belongsToMany(Team, { 
  through: 'LeagueTeams', 
  as: 'teams',
  foreignKey: 'league_id',
  otherKey: 'team_id'
});
Team.belongsToMany(League, { 
  through: 'LeagueTeams', 
  as: 'leagues',
  foreignKey: 'team_id',
  otherKey: 'league_id'
});

// Fixture ↔ League (muchos a uno)
Fixture.belongsTo(League, { foreignKey: 'league_id', as: 'league' });
League.hasMany(Fixture, { foreignKey: 'league_id', as: 'fixtures' });

// Fixture ↔ Team (muchos a uno para local y visitante)
Fixture.belongsTo(Team, { foreignKey: 'home_team_id', as: 'homeTeam' });
Fixture.belongsTo(Team, { foreignKey: 'away_team_id', as: 'awayTeam' });
Team.hasMany(Fixture, { foreignKey: 'home_team_id', as: 'homeFixtures' });
Team.hasMany(Fixture, { foreignKey: 'away_team_id', as: 'awayFixtures' });

// Odds ↔ Fixture (muchos a uno)
Odds.belongsTo(Fixture, { foreignKey: 'fixture_id', as: 'fixture' });
Fixture.hasMany(Odds, { foreignKey: 'fixture_id', as: 'odds' });

// Odds ↔ BettingMarket (muchos a uno)
Odds.belongsTo(BettingMarket, { foreignKey: 'market_id', as: 'market' });
BettingMarket.hasMany(Odds, { foreignKey: 'market_id', as: 'odds' });

// TeamStatistics ↔ Team (muchos a uno)
TeamStatistics.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });
Team.hasMany(TeamStatistics, { foreignKey: 'team_id', as: 'statistics' });

// TeamStatistics ↔ League (muchos a uno)
TeamStatistics.belongsTo(League, { foreignKey: 'league_id', as: 'league' });
League.hasMany(TeamStatistics, { foreignKey: 'league_id', as: 'teamStatistics' });

// Standing ↔ League (muchos a uno)
Standing.belongsTo(League, { foreignKey: 'league_id', as: 'league' });
League.hasMany(Standing, { foreignKey: 'league_id', as: 'standings' });

// Standing ↔ Team (muchos a uno)
Standing.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });
Team.hasMany(Standing, { foreignKey: 'team_id', as: 'standings' });

// FixtureResult ↔ Fixture (uno a uno)
FixtureResult.belongsTo(Fixture, { foreignKey: 'fixture_id', as: 'fixture' });
Fixture.hasOne(FixtureResult, { foreignKey: 'fixture_id', as: 'result' });

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN PARA CREAR DATOS INICIALES
// ═══════════════════════════════════════════════════════════════════
const createDefaultBettingMarkets = async () => {
  const { UPDATED_BETTING_MARKETS } = require('../scripts/updateBettingMarkets');
  
  try {
    let created = 0;
    
    for (const marketData of UPDATED_BETTING_MARKETS) {
      const [market, wasCreated] = await BettingMarket.findOrCreate({
        where: { key: marketData.key },
        defaults: marketData
      });

      if (wasCreated) {
        created++;
      }
    }

    if (created > 0) {
      console.log(`✅ ${created} mercados de apuestas creados`);
    } else {
      console.log('✅ Mercados de apuestas ya existían');
    }

    return true;
  } catch (error) {
    console.error('❌ Error creando mercados por defecto:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN DE SINCRONIZACIÓN
// ═══════════════════════════════════════════════════════════════════
const syncDatabase = async () => {
  try {
    // Sincronizar modelos
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Todos los modelos sincronizados');
    
    // Crear datos iniciales
    await createDefaultBettingMarkets();
    
    return true;
  } catch (error) {
    console.error('❌ Error sincronizando base de datos:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════
// EXPORTACIONES
// ═══════════════════════════════════════════════════════════════════
module.exports = {
  sequelize,
  
  // Modelos principales
  League,
  Team,
  Fixture,
  BettingMarket,
  Odds,
  TeamStatistics,
  Standing,
  FixtureResult,
  ApiCache,
  
  // Funciones
  createDefaultBettingMarkets,
  syncDatabase
};