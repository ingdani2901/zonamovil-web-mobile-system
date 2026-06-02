const { Pool } = require('pg');

const pool = new Pool({
host: 'localhost',
user: 'postgres',
password: 'daniela290104', 
database: 'zona_movil', port: 5432,
});

module.exports = pool;