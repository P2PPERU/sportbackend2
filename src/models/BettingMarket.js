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
    type: DataTypes.STRING(150), // Aumentado para nombres más largos
    allowNull: false,
    comment: 'Nombre del mercado'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Descripción detallada del mercado'
  },
  category: {
    type: DataTypes.ENUM(
      'MATCH_RESULT',    // Resultado del partido (1X2, Double Chance)
      'GOALS',           // Relacionado a goles (Over/Under, BTTS)
      'HALFTIME',        // Primer tiempo (HT 1X2, HT Over/Under)
      'SECOND_HALF',     // Segundo tiempo (ST Winner, ST Over/Under)
      'CORNERS',         // Esquinas (Corners Over/Under, Corners 1X2)
      'CARDS',           // Tarjetas (Cards Over/Under, Red Card)
      'EXACT_SCORE',     // Resultado exacto (0-0, 1-1, etc.)
      'HANDICAP',        // Hándicaps asiáticos/europeos
      'SPECIALS',        // Mercados especiales (HT/FT, Win to Nil)
      'PLAYER_PROPS',    // Props de jugadores (goles, asistencias)
      'COMBINED'         // Mercados combinados (FT Result + BTTS)
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
    comment: 'Prioridad de visualización (mayor = más importante)'
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
  },
  // Nuevos campos para mejor funcionalidad
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 999,
    field: 'display_order',
    comment: 'Orden de visualización dentro de la categoría'
  },
  isPopular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_popular',
    comment: 'Si es un mercado popular para destacar'
  },
  iconName: {
    type: DataTypes.STRING(50),
    field: 'icon_name',
    comment: 'Nombre del icono para la UI'
  },
  shortDescription: {
    type: DataTypes.STRING(200),
    field: 'short_description',
    comment: 'Descripción corta para tooltips'
  }
}, {
  tableName: 'betting_markets',
  indexes: [
    { fields: ['key'] },
    { fields: ['category'] },
    { fields: ['is_active'] },
    { fields: ['priority'] },
    { fields: ['display_order'] },
    { fields: ['is_popular'] },
    { fields: ['category', 'display_order'] }
  ]
});

module.exports = BettingMarket;