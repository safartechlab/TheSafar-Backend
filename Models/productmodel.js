const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    images: [
      {
        filename: { type: String },
        filepath: { type: String },
      },
    ],
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["Male", "Female", "Unisex"], // optional: restrict values
    },
    sizes: [
      {
        size: { type: mongoose.Schema.Types.ObjectId, ref: "Size" },
        price: Number,
      },
    ],
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
    discount: {
      type: Number,
      min: [0, "Discount cannot be negative"],
      default: 0,
    },
    discountType: {
      type: String,
      enum: ["Percentage", "Flat"], // optional: restrict values
    },
    description: {
      type: String,
      trim: true,
    },
    review: {
      type: String,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
