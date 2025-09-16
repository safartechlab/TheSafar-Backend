const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    usertype: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    contactno: {
      type: Number,
    },
    address: {
      houseno: { type: Number },
      society: { type: String },
      landmark: { type: String },
      area: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: Number },
    },
    isVerified: { type: Boolean, default: false },
    resetPasswordOTP: { type: String },
    resetPasswordExpires: { type: Date },
    // resetPasswordToken: { type: String },
    // resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
