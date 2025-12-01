const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      default: function () {
        return `ORD-${Date.now()}-${Math.floor(Math.random() * 90000 + 10000)}`;
      },
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        productName: String,
        image: String,

        sizeId: { type: mongoose.Schema.Types.ObjectId, ref: "Size", default: null },
        sizeName: String,

        price: Number, // original price
        discountedPrice: Number, // paid price
        discountPercentage: Number,
        quantity: Number,
        total: Number, // total for this item (discountedPrice * quantity)
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

    subtotal: Number, // sum of original prices * qty
    discount: Number, // subtotal - totalPrice
    totalPrice: Number, // sum of discountedPrice * qty

    paymentId: String,
    razorpayOrderId: String,
    paymentMethod: String,
    paymentStatus: { type: String, default: "Pending" },
    status: { type: String, default: "Order Placed" },
    invoiceNumber: String,
    date: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
