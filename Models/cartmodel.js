const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
          default: null,
        },
        sizeLabel: {
          type: String, // 🟢 store plain size (S, M, L)
          default: null,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        discountedPrice: {
          type: Number,
          default: null,
        },
        discountPercentage: {
          type: Number,
          default: 0,
        },
        productName: String,
        image: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
