const express = require("express");
const { Auth } = require("../middleware/requireauth");
const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} = require("../Controllers/wishlistcontroller");
const router = express.Router();

router.post("/wish", Auth, addToWishlist);
router.delete("/deletewish/:id", Auth, removeFromWishlist);
router.get("/getwish", Auth, getWishlist);

module.exports = router;
