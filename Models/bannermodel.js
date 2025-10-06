const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    bannerimage: [
      {
        filename: String,
        filepath: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
