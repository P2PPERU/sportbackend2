const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BettingMarket = sequelize.define('BettingMarket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  key: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    comment: 'Clave única del mercado (ej: 1X2, OVER_UNDER_2_5)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nombre del mercado'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Descripción detallada del mercado'
  },
  category: {
    type: DataTypes.ENUM(
      'MATCH_RESULT',    // Resultado del partido
      'GOALS',           // Relacionado a goles
      'HANDICAP',        // Hándicaps
      'HALFTIME',        // Primer tiempo
      'PLAYER_PROPS',    // Props de jugadores
      'SPECIALS'         // Mercados especiales
    ),
    allowNull: false,
    comment: 'Categoría del mercado'
  },
  possibleOutcomes: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'possible_outcomes',
    comment: 'Array de posibles resultados'
  },
  parameters: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Parámetros específicos (líneas, hándicaps, etc.)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Si el mercado está activo'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Prioridad de visualización'
  },
  minOdds: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 1.01,
    field: 'min_odds',
    comment: 'Cuota mínima permitida'
  },
  maxOdds: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 100.00,
    field: 'max_odds',
    comment: 'Cuota máxima permitida'
  }
}, {
  tableName: 'betting_markets',
  indexes: [
    { fields: ['key'] },
    { fields: ['category'] },
    { fields: ['is_active'] },
    { fields: ['priority'] }
  ]
});

module.exports = BettingMarket;
