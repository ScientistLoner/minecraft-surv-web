require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'minecraft_db',
    user: process.env.DB_USER || 'mc_admin',
    password: process.env.DB_PASSWORD || 'mc_secret_2024'
  },
  minecraft: {
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT || '25565', 10)
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'insecure_dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  contactEmail: process.env.CONTACT_EMAIL || 'admin@example.com',
  devMode: process.env.DEV_MODE === 'true'
};
