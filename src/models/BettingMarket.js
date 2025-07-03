const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const BettingMarket = sequelize.define('BettingMarket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  key: {
    type: DataTypes.STRING(100), // ✅ Expandido para claves dinámicas más largas
    unique: true,
    allowNull: false,
    comment: 'Clave única del mercado (ej: 1X2, OVER_UNDER_2_5, MARKET_123)'
  },
  name: {
    type: DataTypes.STRING(150),
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
      'SPECIALS',        // Mercados especiales (HT/FT, Win to Nil, Odd/Even)
      'PLAYER_PROPS',    // Props de jugadores (goles, asistencias, tarjetas)
      'COMBINED',        // Mercados combinados (FT Result + BTTS)
      'TIME_SPECIFIC',   // Mercados de tiempo específico (primeros X minutos)
      'OTHER'            // Otros mercados detectados automáticamente
    ),
    allowNull: false,
    comment: 'Categoría del mercado (detectada automáticamente)'
  },
  possibleOutcomes: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'possible_outcomes',
    comment: 'Array de posibles resultados (dinámicos)'
  },
  parameters: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Parámetros específicos (líneas, hándicaps, etc.) - detectados automáticamente'
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
    comment: 'Prioridad de visualización (calculada automáticamente)'
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
  },

  // ✅ NUEVAS COLUMNAS PARA SISTEMA DINÁMICO
  apiFootballId: {
    type: DataTypes.INTEGER,
    field: 'api_football_id', // ✅ Mapeo correcto snake_case → camelCase
    comment: 'ID del mercado en API-Football (para mapeo dinámico)',
    validate: {
      isInt: true,
      min: 1
    }
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'usage_count', // ✅ Mapeo correcto snake_case → camelCase
    comment: 'Número de veces que se ha usado este mercado',
    validate: {
      isInt: true,
      min: 0
    }
  },
  lastSeenAt: {
    type: DataTypes.DATE,
    field: 'last_seen_at', // ✅ Mapeo correcto snake_case → camelCase
    comment: 'Última vez que se vio este mercado en la API'
  },
  originalData: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'original_data', // ✅ Mapeo correcto snake_case → camelCase
    comment: 'Datos originales de la API-Football para referencia'
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
    { fields: ['category', 'display_order'] },
    
    // ✅ NUEVOS ÍNDICES PARA SISTEMA DINÁMICO
    { fields: ['api_football_id'] },
    { fields: ['usage_count'] },
    { fields: ['last_seen_at'] },
    { fields: ['api_football_id', 'is_active'], where: { api_football_id: { [Op.ne]: null } } },
    
    // ✅ ÍNDICES COMPUESTOS PARA CONSULTAS OPTIMIZADAS
    { fields: ['category', 'priority', 'is_active'] },
    { fields: ['is_popular', 'priority'] }
  ],
  
  // ✅ HOOKS PARA MANTENER DATOS CONSISTENTES
  hooks: {
    beforeCreate: (market, options) => {
      // Asegurar que la prioridad se calcule si no se proporciona
      if (!market.priority || market.priority === 0) {
        market.priority = calculateAutomaticPriority(market.name, market.category);
      }
      
      // Asegurar que lastSeenAt se establezca para mercados dinámicos
      if (market.apiFootballId && !market.lastSeenAt) {
        market.lastSeenAt = new Date();
      }
      
      // Validar possibleOutcomes
      if (!market.possibleOutcomes || market.possibleOutcomes.length === 0) {
        market.possibleOutcomes = ['UNKNOWN'];
      }
    },
    
    beforeUpdate: (market, options) => {
      // Actualizar lastSeenAt si es un mercado dinámico
      if (market.apiFootballId && market.changed('usageCount')) {
        market.lastSeenAt = new Date();
      }
    }
  },

  // ✅ MÉTODOS DE INSTANCIA
  instanceMethods: {
    // Marcar como visto recientemente
    markAsSeen() {
      return this.update({
        lastSeenAt: new Date(),
        usageCount: (this.usageCount || 0) + 1
      });
    },
    
    // Verificar si es un mercado dinámico
    isDynamic() {
      return this.apiFootballId !== null && this.apiFootballId !== undefined;
    },
    
    // Obtener edad del mercado (días desde última vez visto)
    getAgeInDays() {
      if (!this.lastSeenAt) return null;
      const now = new Date();
      const diffTime = Math.abs(now - this.lastSeenAt);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  },

  // ✅ MÉTODOS DE CLASE
  classMethods: {
    // Buscar mercados por API-Football ID
    async findByApiFootballId(apiFootballId) {
      return this.findOne({
        where: { apiFootballId }
      });
    },
    
    // Obtener mercados por categoría
    async getByCategory(category, activeOnly = true) {
      const where = { category };
      if (activeOnly) where.isActive = true;
      
      return this.findAll({
        where,
        order: [['priority', 'DESC'], ['displayOrder', 'ASC']]
      });
    },
    
    // Obtener mercados dinámicos obsoletos
    async getStaleMarkets(daysOld = 30) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      return this.findAll({
        where: {
          apiFootballId: { [DataTypes.Op.ne]: null },
          lastSeenAt: { [DataTypes.Op.lt]: cutoffDate }
        }
      });
    },
    
    // Obtener estadísticas de uso
    async getUsageStats() {
      const [stats] = await sequelize.query(`
        SELECT 
          category,
          COUNT(*) as total_markets,
          COUNT(api_football_id) as dynamic_markets,
          AVG(usage_count) as avg_usage,
          MAX(last_seen_at) as last_activity
        FROM betting_markets 
        WHERE is_active = true
        GROUP BY category 
        ORDER BY total_markets DESC
      `, { 
        type: sequelize.QueryTypes.SELECT 
      });
      
      return stats;
    }
  }
});

// ✅ FUNCIÓN AUXILIAR PARA CALCULAR PRIORIDAD AUTOMÁTICA
function calculateAutomaticPriority(marketName, category) {
  if (!marketName) return 10;
  
  const name = marketName.toLowerCase();
  
  // Mercados premium
  if (/match winner|1x2|result/i.test(name)) return 100;
  if (/over.*under.*2\.?5/i.test(name)) return 95;
  if (/both teams.*score|btts/i.test(name)) return 90;
  if (/double chance/i.test(name)) return 85;
  
  // Por categoría
  switch (category) {
    case 'MATCH_RESULT': return 90;
    case 'GOALS': return 80;
    case 'HALFTIME': return 70;
    case 'EXACT_SCORE': return 75;
    case 'CORNERS': return 60;
    case 'CARDS': return 55;
    case 'HANDICAP': return 65;
    case 'SPECIALS': return 50;
    case 'PLAYER_PROPS': return 45;
    case 'COMBINED': return 40;
    case 'TIME_SPECIFIC': return 35;
    default: return 30;
  }
}

// ✅ DEFINIR MÉTODOS ESTÁTICOS EN EL MODELO
BettingMarket.findByApiFootballId = async function(apiFootballId) {
  return this.findOne({
    where: { apiFootballId }
  });
};

BettingMarket.getByCategory = async function(category, activeOnly = true) {
  const where = { category };
  if (activeOnly) where.isActive = true;
  
  return this.findAll({
    where,
    order: [['priority', 'DESC'], ['displayOrder', 'ASC']]
  });
};

BettingMarket.getStaleMarkets = async function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.findAll({
    where: {
      apiFootballId: { [Op.ne]: null },
      lastSeenAt: { [Op.lt]: cutoffDate }
    }
  });
};

BettingMarket.getUsageStats = async function() {
  const [stats] = await sequelize.query(`
    SELECT 
      category,
      COUNT(*) as total_markets,
      COUNT(api_football_id) as dynamic_markets,
      AVG(usage_count) as avg_usage,
      MAX(last_seen_at) as last_activity
    FROM betting_markets 
    WHERE is_active = true
    GROUP BY category 
    ORDER BY total_markets DESC
  `, { 
    type: sequelize.QueryTypes.SELECT 
  });
  
  return stats;
};

// ✅ MÉTODOS DE INSTANCIA
BettingMarket.prototype.markAsSeen = function() {
  return this.update({
    lastSeenAt: new Date(),
    usageCount: (this.usageCount || 0) + 1
  });
};

BettingMarket.prototype.isDynamic = function() {
  return this.apiFootballId !== null && this.apiFootballId !== undefined;
};

BettingMarket.prototype.getAgeInDays = function() {
  if (!this.lastSeenAt) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.lastSeenAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = BettingMarket;