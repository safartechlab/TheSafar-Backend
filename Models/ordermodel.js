const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        size: { type: mongoose.Schema.Types.ObjectId, ref: "Size" }, // Reference for stock mgmt
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },

        // ✅ Store names directly for invoice/history
        productName: { type: String, required: true },
        sizeName: { type: String }, // human-readable size string
      },
    ],

    shippingAddress: {
      houseno: { type: String },
      street: { type: String },
      landmark: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: "India" },
      phone: { type: String },
    },

    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true, min: 0 },

    paymentMethod: {
      type: String,
      enum: ["COD", "Card", "UPI"],
      default: "COD",
    },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },

    status: {
      type: String,
      enum: ["Received", "Confirmed","Rejected", "Shipped", "Delivered", "Cancelled"],
      default: "Received",
    },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
