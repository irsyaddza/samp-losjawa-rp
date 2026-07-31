import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'samp',
  password: process.env.DB_PASSWORD || 'samppassword',
  database: process.env.DB_DATABASE || 'jawa',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
