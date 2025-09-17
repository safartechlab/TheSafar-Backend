const express = require("express");
const router = express.Router();
const { Auth, adminMiddleware } = require("../middleware/requireauth");
const {
  placeOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} = require("../Controllers/ordercontroller");

// USER ROUTES
router.post("/placeorder", Auth, placeOrder);
router.get("/myorders", Auth, getUserOrders);
router.get("/getorder/:id", Auth, getOrderById);
router.put("/cancelorder/:id", Auth, cancelOrder);

// ADMIN ROUTES
router.get("/getallorders", Auth, adminMiddleware, getAllOrders);
router.put("/status/:id", Auth, adminMiddleware, updateOrderStatus);

module.exports = router;
