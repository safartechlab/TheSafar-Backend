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
        sizeLabel: { type: String },
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
productSchema.pre("save", async function (next) {
  if (this.sizes && this.sizes.length > 0) {
    const Size = mongoose.model("Size");

    this.sizes = await Promise.all(
      this.sizes.map(async (s) => {
        const sizeDoc = await Size.findById(s.size);
        return {
          ...(s.toObject?.() || s),
          sizeLabel: sizeDoc?.size || null,
          discountedPrice: calculateDiscount(s.price, this.discount, this.discountType),
          discountPercentage: calculateDiscountPercentage(s.price, this.discount, this.discountType),
        };
      })
    );
  }

  next();
});


module.exports = mongoose.model("Product", productSchema);
