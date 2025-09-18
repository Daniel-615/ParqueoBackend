const dotenv = require('dotenv');
dotenv.config();
const { 
 HOST,USER,PASSWORD,DB,DB_PORT, EMAIL_PASSWORD, EMAIL_USER
}= process.env;

module.exports = {
  HOST,
  USER,
  PASSWORD,
  DB,
  DB_PORT,
  EMAIL_PASSWORD,
  EMAIL_USER
};