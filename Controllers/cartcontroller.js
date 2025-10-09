const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1, sizeId = null } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Determine the correct price
    let selectedSize = null;
    let price = product.price;
    let discountedPrice = product.discountedPrice;
    let discountPercentage = product.discountPercentage;

    if (sizeId) {
      selectedSize = product.sizes.find(
        (s) => s.size.toString() === sizeId.toString()
      );
      if (selectedSize) {
        price = selectedSize.price;
        discountedPrice = selectedSize.discountedPrice;
        discountPercentage = selectedSize.discountPercentage;
      }
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        (!sizeId || item.size?.toString() === sizeId)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        size: sizeId,
        quantity,
        price,
        discountedPrice,
        discountPercentage,
        productName: product.productName,
        image: product.images?.[0]?.filepath || null,
      });
    }

    await cart.save();
    res.status(200).json({ message: "Item added to cart", cart });
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
    const userId = req.user._id;
    const productId = req.params.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();
    res.status(200).json({ message: "Item removed", cart });
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
