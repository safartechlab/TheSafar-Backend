const express = require("express");
const cors = require("cors");
const port = 5000;
const app = express();
const fs = require("fs");
const connectDB = require("./Utilities/connectdb");
const userrouter = require("./Routers/userroutes");
const catagoryrouter = require("./Routers/categoryroutes");
const subcategoryrouter = require("./Routers/subcategoryroutes");
const sizerouter = require("./Routers/sizeroutes");
const productrouter = require("./Routers/productroutes");
const cartrouter = require("./Routers/cartrouter");
const orderrouter = require("./Routers/orderroutes");
const bannerrouter = require("./Routers/bannerrouter");
const wishlistrouter = require("./Routers/wishlistrouter");
const messagerouter = require("./Routers/messagerouter");
app.use(cors());
app.use(express.json());

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
