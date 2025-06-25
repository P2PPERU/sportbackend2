const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Odds = sequelize.define('Odds', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fixtureId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'fixture_id',
    references: {
      model: 'fixtures',
      key: 'id'
    }
  },
  marketId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'market_id',
    references: {
      model: 'betting_markets',
      key: 'id'
    }
  },
  bookmaker: {
    type: DataTypes.STRING(100),
    defaultValue: 'Average',
    comment: 'Casa de apuestas o promedio'
  },
  outcome: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Resultado específico (HOME, DRAW, AWAY, OVER, UNDER, etc.)'
  },
  value: {
    type: DataTypes.STRING(50),
    comment: 'Valor del outcome si aplica (ej: "2.5" para Over/Under)'
  },
  odds: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 1.01,
      max: 1000.00
    },
    comment: 'Cuota decimal'
  },
  impliedProbability: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'implied_probability',
    comment: 'Probabilidad implícita calculada de la cuota'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Si la cuota está activa'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_updated',
    comment: 'Última actualización de la cuota'
  }
}, {
  tableName: 'odds',
  indexes: [
    { fields: ['fixture_id'] },
    { fields: ['market_id'] },
    { fields: ['bookmaker'] },
    { fields: ['outcome'] },
    { fields: ['is_active'] },
    { fields: ['last_updated'] },
    { unique: true, fields: ['fixture_id', 'market_id', 'outcome', 'bookmaker'] }
  ]
});

module.exports = Odds;