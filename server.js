const express = require('express');
const cors = require('cors');
const port = 5000;
const app = express();
const fs = require('fs');
const connectDB = require("./Utilities/connectdb");
const userrouter = require("./Routers/userroutes");
app.use(cors());
app.use(express.json());

app.use("/user",userrouter);



   const startServer = async () => {
    try {
        const dbstatus = await connectDB();
        if (dbstatus) {
            app.listen(port, () => {
                const now = new Date();
                console.log(`Server is running on port ${port} at ${now.toLocaleString()}`);
            });
        } else {
            console.error("Error in starting server");
        }
    } catch (error) {
        console.error("Error in starting server:", error);
    }
};


    startServer();



    