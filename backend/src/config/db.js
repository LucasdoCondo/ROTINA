require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente de banco de dados', err);
  process.exit(-1);
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado ao banco de dados PostgreSQL');
    client.release();
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    process.exit(1);
  }
};

const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Query executada em %dms: %s', duration, text);
  return result;
};

module.exports = {
  pool,
  connectDB,
  query,
};