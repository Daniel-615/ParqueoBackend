const dotenv = require('dotenv');
dotenv.config();
const { 
  PORT,HOST,USER,PASSWORD,DB,DB_PORT, EMAIL_PASSWORD, EMAIL_USER
}= process.env;

module.exports = {
  PORT,
  HOST,
  USER,
  PASSWORD,
  DB,
  DB_PORT,
  EMAIL_PASSWORD,
  EMAIL_USER
};