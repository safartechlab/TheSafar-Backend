const express = require("express");
const router = express.Router();
const { Auth, adminMiddleware } = require("../middleware/requireauth");

const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  downloadInvoice,
  placeOrder
} = require("../Controllers/ordercontroller");


// ================= USER ROUTES =================

// 🛒 Create Razorpay order
router.post("/create-razorpay-order", Auth, createRazorpayOrder);

// 🧾 Verify Razorpay payment
router.post("/verify-payment", Auth, verifyRazorpayPayment);

// 👤 Get logged-in user's orders
router.get("/myorders", Auth, getUserOrders);


router.post("/placeorder", Auth, placeOrder);

// 📦 Get a single order by ID
router.get("/order/:id", Auth, getOrderById);

// ❌ Cancel order
router.put("/cancel/:id", Auth, cancelOrder);

// 🧾 Download invoice
router.get("/invoice/:id", Auth, downloadInvoice);


// ================= ADMIN ROUTES =================

// 🧾 Get all orders (Admin)
router.get("/all", Auth, adminMiddleware, getAllOrders);

// 🚚 Update order status (Admin)
router.put("/status/:id", Auth, adminMiddleware, updateOrderStatus);


module.exports = router;
