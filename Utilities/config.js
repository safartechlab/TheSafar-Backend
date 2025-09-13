require('dotenv').config();

module.exports = {
    MONGODB_URL: process.env.MONGODB_URL ,
    JWT_SECRET: process.env.JWT_SECRET,
    EMAIL: process.env.EMAIL,
    PASSWORD: process.env.PASSWORD,
};