const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // Unique order number (easier than using _id in invoice)
    orderNumber: { type: String, unique: true },

    // User who placed the order
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Ordered items
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        size: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Size",
        },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }, // unit price
      },
    ],

    // Shipping details
    shippingAddress: {
      houseno: { type: String },
      street: { type: String },
      landmark: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: "India" },
      phone: { type: String }, // Added for better contact info
    },

    // Pricing
    subtotal: { type: Number, required: true, min: 0 }, // before tax & discount
    discount: { type: Number, default: 0 }, // % or flat value (decide in controller)
    tax: { type: Number, default: 0 }, // GST/VAT if needed
    totalPrice: { type: Number, required: true, min: 0 },

    // Payment info
    paymentMethod: {
      type: String,
      enum: ["COD", "Card", "UPI"],
      default: "COD",
    },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },

    // Status tracking
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    deliveredAt: { type: Date },

    // Auto timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ Pre-save hook to generate unique order number
orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
