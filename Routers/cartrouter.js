const express = require("express");
const router = express.Router();
const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../Controllers/cartcontoller");
const { Auth } = require("../middleware/requireauth");

router.post("/addtocart", Auth, addToCart);
router.get("/getcart", Auth, getCart);
router.put("/updatecart/:cartItemId", Auth, updateCartItem);
router.delete("/removecart/:id", Auth, removeCartItem);
router.delete("/clearcart", Auth, clearCart);

module.exports = router;
