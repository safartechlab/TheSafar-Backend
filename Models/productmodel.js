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
      enum: ["Male", "Female", "Unisex"],
    },
    sizes: [
      {
        size: { type: mongoose.Schema.Types.ObjectId, ref: "Size" },
        price: { type: Number, min: 0 },
        stock: { type: Number, default: 0 },
        discountedPrice: { type: Number, default: null },
        discountPercentage: { type: Number, default: 0 },
      },
    ],
    stock: {
      type: Number,
      default: null,
    },
    price: {
      type: Number,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      default: null,
    },
    discountPercentage: {
      type: Number,
      default: 0,
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

// Helper: calculate discount
function calculateDiscount(price, discount, discountType) {
  if (!price) return null;
  if (!discount || discount <= 0) return price;

  if (discountType === "Percentage") {
    return price - (price * discount) / 100;
  } else if (discountType === "Flat") {
    return price - discount;
  }
  return price;
}

// Helper: calculate discount percentage
function calculateDiscountPercentage(price, discount, discountType) {
  if (!price || !discount) return 0;

  if (discountType === "Percentage") {
    return discount;
  } else if (discountType === "Flat") {
    return ((discount / price) * 100).toFixed(2);
  }
  return 0;
}

// Pre-save hook: calculate discounted values before saving
productSchema.pre("save", function (next) {
  if (this.price) {
    this.discountedPrice = calculateDiscount(
      this.price,
      this.discount,
      this.discountType
    );
    this.discountPercentage = calculateDiscountPercentage(
      this.price,
      this.discount,
      this.discountType
    );
  }

  if (this.sizes && this.sizes.length > 0) {
    this.sizes = this.sizes.map((s) => {
      const discountedPrice = calculateDiscount(
        s.price,
        this.discount,
        this.discountType
      );
      const discountPercentage = calculateDiscountPercentage(
        s.price,
        this.discount,
        this.discountType
      );
      return {
        ...(s.toObject?.() || s),
        discountedPrice,
        discountPercentage,
      };
    });
  }

  next();
});

module.exports = mongoose.model("Product", productSchema);
