const express = require("express");
const cors = require("cors");
const port = 5000;
const app = express();
const fs = require("fs");
const connectDB = require("./Utilities/connectdb");
const userrouter = require("./routers/userroutes");
const catagoryrouter = require("./routers/categoryroutes");
const subcategoryrouter = require("./routers/subcategoryroutes");
const sizerouter = require("./routers/sizeroutes");
const productrouter = require("./routers/productroutes");
const cartrouter = require("./routers/cartrouter");
const orderrouter = require("./routers/orderroutes");
const bannerrouter = require("./routers/bannerrouter");
const wishlistrouter = require("./routers/wishlistrouter");
const messagerouter = require("./routers/messagerouter");
app.use(
  cors({
    origin: ["http://localhost:5173", "https://thesafar-frontend-etn6.onrender.com"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/user", userrouter);
app.use("/category", catagoryrouter);
app.use("/subcategory", subcategoryrouter);
app.use("/size", sizerouter);
app.use("/product", productrouter);
app.use("/cart", cartrouter);
app.use("/order", orderrouter);
app.use("/banner", bannerrouter);
app.use("/wishlist", wishlistrouter);
app.use("/message", messagerouter);

const startServer = async () => {
  try {
    const dbstatus = await connectDB();
    if (dbstatus) {
      app.listen(port, () => {
        const now = new Date();
        console.log(
          `Server is running on port ${port} at ${now.toLocaleString()}`
        );
      });
      process.on("uncaughtException", (error) => {
        console.error("❌ Uncaught Exception:", error.message);
        console.error(error.stack);
      });

      process.on("unhandledRejection", (reason) => {
        console.error("❌ Unhandled Rejection:", reason);
      });
    } else {
      console.error("Error in starting server");
    }
  } catch (error) {
    console.error("Error in starting server:", error);
  }
};

startServer();
