const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id; // assuming auth middleware

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // check if product already exists in cart
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity || 1;
    } else {
      cart.items.push({ product: productId, quantity: quantity || 1 });
    }

    await cart.save();
    res.status(200).json(cart);
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
        select: "productName images sizes gender", // only these fields
        populate: [
          { path: "images", select: "filepath" },  // only filepath
          { path: "sizes", select: "size price" }, // only size + price
        ],
      })
      .lean();

    if (!cart) {
      return res.status(200).json({ items: [], totalPrice: 0 });
    }

    // calculate total based on sizes price * quantity
    let totalPrice = 0;
    cart.items.forEach((item) => {
      if (item.product && item.product.sizes && item.product.sizes[0]) {
        totalPrice += item.product.sizes[0].price * item.quantity;
      }
    });

    res.status(200).json({
      user: cart.user,
      items: cart.items.map((item) => ({
        productName: item.product?.productName,
        gender: item.product?.gender,
        images: item.product?.images.map((img) => img.filepath),
        sizes: item.product?.sizes.map((s) => ({
          size: s.size,
          price: s.price,
        })),
        quantity: item.quantity,
      })),
      totalPrice,
    });
  } catch (err) {
    console.error("Get Cart Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Update item quantity
const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );
    if (!item) return res.status(404).json({ message: "Item not in cart" });

    item.quantity = quantity;
    await cart.save();

    res.status(200).json(cart);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Remove item
const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );
    await cart.save();

    res.status(200).json(cart);
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
