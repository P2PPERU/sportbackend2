const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FixtureResult = sequelize.define('FixtureResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fixtureId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'fixture_id',
    references: {
      model: 'fixtures',
      key: 'id'
    }
  },
  // Resultados calculados para cada mercado
  marketResults: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'market_results',
    comment: 'Resultados calculados para todos los mercados'
  },
  // Eventos del partido
  events: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Eventos del partido (goles, tarjetas, etc.)'
  },
  // Estadísticas del partido
  statistics: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Estadísticas detalladas del partido'
  },
  // Verificación
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified',
    comment: 'Si el resultado ha sido verificado'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    field: 'verified_at'
  },
  verifiedByAdminId: {
    type: DataTypes.UUID,
    field: 'verified_by_admin_id',
    comment: 'ID del admin que verificó'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    field: 'last_sync_at'
  }
}, {
  tableName: 'fixture_results',
  indexes: [
    { fields: ['fixture_id'] },
    { fields: ['is_verified'] },
    { fields: ['verified_at'] }
  ]
});

module.exports = FixtureResult;
