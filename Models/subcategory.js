const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema(
  {
    subcategory: {
      type: String,
      required: true,
      unique: true,
    },
    categoryID:{
        type : mongoose.Schema.Types.ObjectId,
        ref:"Category"
    }
  },
  { timestamps: true }
);  

module.exports = mongoose.model("Subcategory", subcategorySchema);
