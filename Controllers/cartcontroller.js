const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1, sizeId = null } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // 🔹 Determine the correct price
    let selectedSize = null;
    let price = product.price || 0; // 🔹 FIX: fallback to 0
    let discountedPrice = product.discountedPrice || 0; // 🔹 FIX: fallback to 0
    let discountPercentage = product.discountPercentage || 0;

    if (sizeId) {
      selectedSize = product.sizes.find(
        (s) => s.size.toString() === sizeId.toString()
      );
      if (selectedSize) {
        price = selectedSize.price || price; // 🔹 FIX: ensure price exists
        discountedPrice = selectedSize.discountedPrice || discountedPrice; // 🔹 FIX
        discountPercentage = selectedSize.discountPercentage || discountPercentage;
      }
    }

    // 🔹 Find or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    // 🔹 Check if item exists (with size handling)
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        ((sizeId && item.size?.toString() === sizeId) || (!sizeId && !item.size))
    );

    if (existingItem) {
      // 🔹 Update quantity safely
      existingItem.quantity = Math.max(1, existingItem.quantity + quantity); // 🔹 FIX
      existingItem.price = price; // 🔹 FIX: always update price
      existingItem.discountedPrice = discountedPrice;
      existingItem.discountPercentage = discountPercentage;
    } else {
      // 🔹 Add new item
      cart.items.push({
        product: productId,
        size: sizeId,
        quantity,
        price,             // 🔹 FIX: required by Mongoose
        discountedPrice,
        discountPercentage,
        productName: product.productName,
        image: product.images?.[0]?.filepath || null,
      });
    }

    await cart.save();

    // 🔹 Simplified cart response for frontend
    const items = cart.items.map((item) => ({
      _id: item._id,
      productId: item.product,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      discountedPrice: item.discountedPrice,
      discountPercentage: item.discountPercentage,
      productName: item.productName,
      image: item.image,
    }));

    res.status(200).json({ message: "Item added to cart", items });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user cart
const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const items = cart.items.map((item) => ({
      _id: item._id,
      productId: item.product._id,
      productName: item.productName || item.product.productName,
      image: item.image || item.product.images?.[0]?.filepath || null,
      quantity: item.quantity,
      price: item.price,
      discountedPrice: item.discountedPrice,
      discountPercentage: item.discountPercentage,
    }));

    const totalPrice = items.reduce(
      (sum, item) =>
        sum + (item.discountedPrice || item.price || 0) * (item.quantity || 1),
      0
    );

    res.status(200).json({ items, totalPrice });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update item quantity
const updateCartItem = async (req, res) => {
  try {
    const { productId, sizeId, quantity } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (i) =>
        i.product.toString() === productId &&
        ((sizeId && i.size?.toString() === sizeId) || (!sizeId && !i.size))
    );

    if (!item) return res.status(404).json({ message: "Item not in cart" });

    item.quantity = Math.max(1, quantity); // 🔹 FIX: prevent 0 or negative
    await cart.save();

    const items = cart.items.map((i) => ({
      _id: i._id,
      productId: i.product,
      size: i.size,
      quantity: i.quantity,
      price: i.price,
      discountedPrice: i.discountedPrice,
    }));

    res.status(200).json({ message: "Cart updated", items });
  } catch (err) {
    console.error("Update cart item error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove item
const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const cartItemId = req.params.id; // ✅ get cart item ID from URL

    if (!cartItemId) {
      return res.status(400).json({ message: "Cart item ID is required" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const initialLength = cart.items.length;

    // Remove item by _id
    cart.items = cart.items.filter((item) => item._id.toString() !== cartItemId);

    if (cart.items.length === initialLength) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    await cart.save();

    const items = cart.items.map((i) => ({
      _id: i._id,
      productId: i.product,
      size: i.size,
      quantity: i.quantity,
      price: i.price,
      discountedPrice: i.discountedPrice,
      productName: i.productName,
      image: i.image,
    }));

    res.status(200).json({ message: "Item removed successfully", items });
  } catch (error) {
    console.error("Remove cart item error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    res.status(200).json({ message: "Cart cleared" });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
