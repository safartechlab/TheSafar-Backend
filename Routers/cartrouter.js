const express = require("express");
const router = express.Router();
const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../Controllers/cartcontroller");
const {Auth} = require("../middleware/requireauth");

router.post("/addtocart", Auth, addToCart);
router.get("/getcart", Auth, getCart);
router.put("/updatecart", Auth, updateCartItem);
router.delete("/removecart", Auth, removeCartItem);
router.delete("/clearcart", Auth, clearCart);

module.exports = router;
