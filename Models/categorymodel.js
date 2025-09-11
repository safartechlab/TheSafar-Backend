const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    categoryname: {
      type: String,
      required: true,
      unique: true,
    },
    categoryimage: {
      filename : String,
      filepath : String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
