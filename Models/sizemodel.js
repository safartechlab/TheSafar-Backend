const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);  

module.exports = mongoose.model("Size", sizeSchema);
