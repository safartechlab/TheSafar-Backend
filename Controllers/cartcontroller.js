const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { productId, sizeId, quantity = 1 } = req.body;
    const userId = req.user._id;

    if (!productId) return res.status(400).json({ message: "Product is required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // if product has sizes, sizeId must be provided
    if (product.sizes && product.sizes.length > 0 && !sizeId) {
      return res.status(400).json({ message: "Size is required for this product" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    // Check if item exists in cart
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        ((sizeId && item.size?.toString() === sizeId) || (!sizeId && !item.size))
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        size: sizeId || null,
        quantity,
      });
    }

    await cart.save();

    // Populate items for response
    const populatedCart = await cart
      .populate({
        path: "items.product",
        select: "productName images sizes gender",
        populate: [
          { path: "images", select: "filepath" },
          { path: "sizes", select: "size price" },
        ],
      })
      .execPopulate();

    const cartResponse = populatedCart.items.map((item) => ({
      productId: item.product._id,
      productName: item.product.productName,
      gender: item.product.gender,
      images: item.product.images.map((img) => img.filepath),
      size: item.size
        ? item.product.sizes.find((s) => s._id.toString() === item.size.toString())
        : item.product.sizes[0],
      quantity: item.quantity,
    }));

    const totalPrice = cartResponse.reduce(
      (sum, item) => sum + (item.size?.price || 0) * item.quantity,
      0
    );

    res.status(200).json({ cart: cartResponse, totalPrice });
  } catch (err) {
    console.error("Add to Cart Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user cart
const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.product",
        select: "productName images sizes gender",
        populate: [
          { path: "images", select: "filepath" },
          { path: "sizes", select: "size price" },
        ],
      })
      .lean();

    if (!cart) return res.status(200).json({ items: [], totalPrice: 0 });

    const items = cart.items.map((item) => ({
      productId: item.product._id,
      productName: item.product.productName,
      gender: item.product.gender,
      images: item.product.images.map((img) => img.filepath),
      size: item.size
        ? item.product.sizes.find((s) => s._id.toString() === item.size.toString())
        : item.product.sizes[0],
      quantity: item.quantity,
    }));

    const totalPrice = items.reduce(
      (sum, item) => sum + (item.size?.price || 0) * item.quantity,
      0
    );

    res.status(200).json({ items, totalPrice });
  } catch (err) {
    console.error("Get Cart Error:", err);
    res.status(500).json({ message: "Server error" });
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

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({ message: "Cart updated", cart });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Remove item
const removeCartItem = async (req, res) => {
  try {
    const { productId, sizeId } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) =>
        !(item.product.toString() === productId && ((sizeId && item.size?.toString() === sizeId) || (!sizeId && !item.size)))
    );

    await cart.save();
    res.status(200).json({ message: "Item removed", cart });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    res.status(200).json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
