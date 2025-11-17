const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      default: function () {
        // deterministic-ish unique value: time + random
        return `ORD-${Date.now()}-${Math.floor(Math.random() * 90000 + 10000)}`;
      },
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        productName: String,
        image: String,
        price: Number,
        quantity: Number,
        size: String,
      },
    ],
    shippingAddress: {
      name: String,
      phone: String,
      houseno: String,
      street: String,
      landmark: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },
    subtotal: Number,
    totalPrice: Number,
    paymentId: String,
    razorpayOrderId: String,
    paymentMethod: String,
    paymentStatus: { type: String, default: "Pending" },
    status: { type: String, default: "Processing" },
    invoiceNumber: String,
    date: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
