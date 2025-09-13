const {MONGODB_URL} = require('./config');
const mongoose = require('mongoose');
const User = require("../Controllers/usercontroller");
    
const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URL)
        console.log("MongoDB Connection Success");
        User;
        return true;    

    } catch (error) {
        if(error.name === 'MongooseServerSelectionError'){
            console.error("Check Mongodb server is running or not");
            
        }else{
            console.error("MongoDB Connection Failed");
            
        }
        process.exit(1);
        return false; 
    }
    
}

module.exports = connectDB;

