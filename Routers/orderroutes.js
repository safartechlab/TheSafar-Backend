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
  downloadInvoice,
} = require("../Controllers/ordercontroller");

// ================= USER ROUTES =================
router.post("/placeorder", Auth, placeOrder);         // Place new order
router.get("/myorders", Auth, getUserOrders);         // Get logged-in user's orders
router.get("/getorder/:id", Auth, getOrderById);      // Get single order by ID
router.put("/cancelorder/:id", Auth, cancelOrder);    // Cancel order
router.get("/invoice/:id", Auth, downloadInvoice);    // Download invoice (secured)

// ================= ADMIN ROUTES =================
router.get("/getallorders", Auth, adminMiddleware, getAllOrders);    // All orders (admin)
router.put("/status/:id", Auth, adminMiddleware, updateOrderStatus); // Update status (admin)

module.exports = router;
