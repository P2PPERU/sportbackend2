const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Fixture = sequelize.define('Fixture', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  apiFootballId: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false,
    field: 'api_football_id',
    comment: 'ID del partido en API-Football'
  },
  leagueId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'league_id',
    references: {
      model: 'leagues',
      key: 'id'
    }
  },
  homeTeamId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'home_team_id',
    references: {
      model: 'teams',
      key: 'id'
    }
  },
  awayTeamId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'away_team_id',
    references: {
      model: 'teams',
      key: 'id'
    }
  },
  round: {
    type: DataTypes.STRING(100),
    comment: 'Jornada/Ronda del partido'
  },
  season: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2024,
    comment: 'Temporada del partido'
  },
  fixtureDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'fixture_date',
    comment: 'Fecha y hora del partido (UTC)'
  },
  venue: {
    type: DataTypes.STRING(255),
    comment: 'Estadio donde se juega'
  },
  city: {
    type: DataTypes.STRING(100),
    comment: 'Ciudad del partido'
  },
  referee: {
    type: DataTypes.STRING(255),
    comment: 'Árbitro principal'
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC',
    comment: 'Zona horaria del partido'
  },
  status: {
    type: DataTypes.ENUM(
      'TBD',      // To Be Defined
      'NS',       // Not Started  
      '1H',       // First Half
      'HT',       // Half Time
      '2H',       // Second Half
      'ET',       // Extra Time
      'FT',       // Full Time
      'AET',      // After Extra Time
      'PEN',      // Penalty In Progress
      'PST',      // Postponed
      'CANC',     // Cancelled
      'ABD',      // Abandoned
      'AWD',      // Technical Loss
      'WO'        // WalkOver
    ),
    defaultValue: 'NS',
    comment: 'Estado del partido según API-Football'
  },
  statusLong: {
    type: DataTypes.STRING(100),
    field: 'status_long',
    comment: 'Descripción larga del estado'
  },
  elapsed: {
    type: DataTypes.INTEGER,
    comment: 'Minutos transcurridos'
  },
  // Resultados
  homeScore: {
    type: DataTypes.INTEGER,
    field: 'home_score',
    comment: 'Goles del equipo local'
  },
  awayScore: {
    type: DataTypes.INTEGER,
    field: 'away_score',
    comment: 'Goles del equipo visitante'
  },
  homeScoreHt: {
    type: DataTypes.INTEGER,
    field: 'home_score_ht',
    comment: 'Goles local primer tiempo'
  },
  awayScoreHt: {
    type: DataTypes.INTEGER,
    field: 'away_score_ht',
    comment: 'Goles visitante primer tiempo'
  },
  homeScoreEt: {
    type: DataTypes.INTEGER,
    field: 'home_score_et',
    comment: 'Goles local tiempo extra'
  },
  awayScoreEt: {
    type: DataTypes.INTEGER,
    field: 'away_score_et',
    comment: 'Goles visitante tiempo extra'
  },
  homeScorePen: {
    type: DataTypes.INTEGER,
    field: 'home_score_pen',
    comment: 'Goles local penales'
  },
  awayScorePen: {
    type: DataTypes.INTEGER,
    field: 'away_score_pen',
    comment: 'Goles visitante penales'
  },
  // Disponibilidad para torneos
  isAvailableForTournament: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_available_for_tournament',
    comment: 'Si está disponible para agregar a torneos'
  },
  addedToTournamentAt: {
    type: DataTypes.DATE,
    field: 'added_to_tournament_at',
    comment: 'Cuándo se agregó a torneos'
  },
  addedByAdminId: {
    type: DataTypes.UUID,
    field: 'added_by_admin_id',
    comment: 'ID del admin que lo agregó'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    field: 'last_sync_at',
    comment: 'Última sincronización con API'
  }
}, {
  tableName: 'fixtures',
  indexes: [
    { fields: ['api_football_id'] },
    { fields: ['league_id'] },
    { fields: ['home_team_id'] },
    { fields: ['away_team_id'] },
    { fields: ['fixture_date'] },
    { fields: ['status'] },
    { fields: ['is_available_for_tournament'] },
    { fields: ['season'] }
  ]
});

module.exports = Fixture;