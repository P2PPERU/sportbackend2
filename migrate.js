// 📄 migrate.js - SCRIPT DE MIGRACIÓN MANUAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const { Sequelize } = require('sequelize');

async function runMigrations() {
  try {
    console.log('🔧 INICIANDO MIGRACIONES MANUALES');
    console.log('═'.repeat(50));
    
    const sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: console.log
      }
    );

    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    // 1. Agregar columnas faltantes a betting_markets
    console.log('\n📋 1. Agregando columnas a betting_markets...');
    try {
      await sequelize.query(`
        ALTER TABLE betting_markets 
        ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999,
        ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS icon_name VARCHAR(50),
        ADD COLUMN IF NOT EXISTS short_description VARCHAR(200);
      `);
      console.log('   ✅ Columnas agregadas exitosamente');
    } catch (error) {
      console.log('   ⚠️ ', error.message);
    }

    // 2. Agregar restricciones UNIQUE
    console.log('\n🔒 2. Agregando restricciones UNIQUE...');
    
    const constraints = [
      { table: 'leagues', column: 'api_football_id', name: 'leagues_api_football_id_unique' },
      { table: 'teams', column: 'api_football_id', name: 'teams_api_football_id_unique' },
      { table: 'fixtures', column: 'api_football_id', name: 'fixtures_api_football_id_unique' }
    ];

    for (const constraint of constraints) {
      try {
        await sequelize.query(`
          ALTER TABLE ${constraint.table} 
          ADD CONSTRAINT ${constraint.name} 
          UNIQUE (${constraint.column});
        `);
        console.log(`   ✅ ${constraint.table}.${constraint.column} UNIQUE agregado`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ℹ️ ${constraint.table}.${constraint.column} UNIQUE ya existe`);
        } else {
          console.log(`   ❌ Error en ${constraint.table}: ${error.message}`);
        }
      }
    }

    // 3. Crear índices
    console.log('\n📈 3. Creando índices...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS betting_markets_display_order ON betting_markets (display_order);',
      'CREATE INDEX IF NOT EXISTS betting_markets_is_popular ON betting_markets (is_popular);',
      'CREATE INDEX IF NOT EXISTS betting_markets_category_display_order ON betting_markets (category, display_order);'
    ];

    for (const indexQuery of indexes) {
      try {
        await sequelize.query(indexQuery);
        console.log(`   ✅ Índice creado`);
      } catch (error) {
        console.log(`   ⚠️ ${error.message}`);
      }
    }

    // 4. Verificar estructura
    console.log('\n🔍 4. Verificando estructura...');
    
    const tables = ['leagues', 'teams', 'fixtures', 'betting_markets'];
    
    for (const table of tables) {
      try {
        const [results] = await sequelize.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = '${table}' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `);
        
        console.log(`\n   📋 Tabla: ${table}`);
        results.forEach(col => {
          console.log(`      • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
      } catch (error) {
        console.log(`   ❌ Error verificando ${table}: ${error.message}`);
      }
    }

    await sequelize.close();
    console.log('\n🎉 ¡MIGRACIONES COMPLETADAS EXITOSAMENTE!');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Ejecuta: npm run dev');
    console.log('2. Si funciona, ejecuta: node updateBettingMarkets.js');
    
    process.exit(0);

  } catch (error) {
    console.error('\n💥 ERROR EN MIGRACIÓN:', error.message);
    process.exit(1);
  }
}

// Función para verificar estado actual
async function checkCurrentState() {
  try {
    console.log('🔍 VERIFICANDO ESTADO ACTUAL');
    console.log('═'.repeat(40));
    
    const sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false
      }
    );

    await sequelize.authenticate();
    
    // Verificar columnas de betting_markets
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'betting_markets' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Columnas en betting_markets:');
    columns.forEach(col => {
      console.log(`   • ${col.column_name}`);
    });
    
    // Verificar restricciones UNIQUE
    const [constraints] = await sequelize.query(`
      SELECT tc.table_name, tc.constraint_name, tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public'
      AND tc.table_name IN ('leagues', 'teams', 'fixtures')
      ORDER BY tc.table_name;
    `);
    
    console.log('\n🔒 Restricciones UNIQUE:');
    constraints.forEach(constraint => {
      console.log(`   • ${constraint.table_name}: ${constraint.constraint_name}`);
    });
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error verificando estado:', error.message);
  }
}

// Ejecutar según el argumento
const action = process.argv[2];

if (action === 'check') {
  checkCurrentState();
} else {
  runMigrations();
}