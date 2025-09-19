const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema(
  {
    subcategory: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    sizes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Size" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subcategory", subcategorySchema);
