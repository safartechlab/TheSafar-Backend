const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      unique: true,
    },
    subcategoryID:{
        type : mongoose.Schema.Types.ObjectId,
        ref:"Subcategory"
    }
  },
  { timestamps: true }
);  

module.exports = mongoose.model("Size", sizeSchema);
