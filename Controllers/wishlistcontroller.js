const Wishlist = require("../Models/wishlistmodel.js");
const mongoose = require("mongoose");

// Add a product to wishlist
const addToWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    const productObjectId = new mongoose.Types.ObjectId(productId);

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [productObjectId] });
    } else {
      // Remove any nulls to avoid errors
      wishlist.products = wishlist.products.filter((p) => p != null);

      // Check if product already exists
      const exists = wishlist.products.some((p) => p.equals(productObjectId));
      if (!exists) {
        wishlist.products.push(productObjectId);
      }
    }

    await wishlist.save();

    const populatedWishlist = await wishlist.populate("products");
    res.status(200).json({ success: true, wishlist: populatedWishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove a product from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user.id });
    wishlist.products = wishlist.products.filter(
      (p) => p.toString() !== req.params.id
    );
    await wishlist.save();

    res.status(200).json({ products: wishlist.products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get wishlist products for logged-in user
const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const wishlist = await Wishlist.findOne({ user: userId }).populate(
      "products"
    );
    res.status(200).json({ success: true, wishlist: wishlist?.products || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
};
