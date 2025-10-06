const { required } = require("joi");
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
      enum: ["Male", "Female", "Unisex"],
    },
    sizes: [
      {
        size: { type: mongoose.Schema.Types.ObjectId, ref: "Size" },
        price: { type: Number, min: 0 },
        stock: { type: Number, default: 0 },
      },
    ],
    stock: {
      type: Number,
      default: null,
    },
    price: {
      type: Number,
      min: null,
    },
    discount: {
      type: Number,
      min: [0, "Discount cannot be negative"],
      default: 0,
    },
    discountType: {
      type: String,
      enum: ["Percentage", "Flat"],
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
