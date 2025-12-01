const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");

// 🛒 Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1, sizeId = null } = req.body;

    const product = await Product.findById(productId).populate("sizes.size");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let price = product.price || 0;
    let discountedPrice = product.discountedPrice || price;
    let discountPercentage = product.discountPercentage || 0;

    let selectedSize = null;
    let sizeLabel = null;

    // 🟢 Size Handling
    if (sizeId) {
      selectedSize = product.sizes.find(
        (s) => s._id.toString() === sizeId.toString()
      );

      if (!selectedSize) {
        return res.status(400).json({
          message: `Invalid size selected for ${product.productName}`,
        });
      }

      price = selectedSize.price;
      discountedPrice = selectedSize.discountedPrice;
      discountPercentage = selectedSize.discountPercentage;
      sizeLabel = selectedSize.sizeLabel || selectedSize.size?.size || null;
    }

    // 🛒 Find or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // 🟢 Check if item with same product+size exists
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        (item.size ? item.size.toString() : null) === (sizeId || null)
    );

    if (existingItem) {
      existingItem.quantity = Math.max(1, existingItem.quantity + quantity);
      existingItem.price = price;
      existingItem.discountedPrice = discountedPrice;
      existingItem.discountPercentage = discountPercentage;
      existingItem.sizeLabel = sizeLabel;
    } else {
      cart.items.push({
        product: productId,
        size: sizeId || null,
        sizeLabel,
        quantity,
        price,
        discountedPrice,
        discountPercentage,
        productName: product.productName,
        image: product.images?.[0]?.filepath || null,
      });
    }

    await cart.save();

    const populated = await cart.populate([
      { path: "items.product", select: "productName images" },
      { path: "items.size", select: "size" },
    ]);

    const items = populated.items.map((item) => ({
      _id: item._id,
      productId: item.product._id,
      productName: item.productName || item.product.productName,
      image: item.image || item.product.images?.[0]?.filepath,
      sizeId: item.size ? item.size._id : null,
      size: item.sizeLabel || (item.size ? item.size.size : null),
      quantity: item.quantity,
      price: item.price,
      discountedPrice: item.discountedPrice,
      discountPercentage: item.discountPercentage,
    }));

    res.status(200).json({
      message: "Item added to cart successfully",
      items,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🧾 Get Cart
const getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product", "productName images")
      .populate("items.size", "size");

    if (!cart) return res.status(200).json({ items: [], totalPrice: 0 });

    const items = cart.items.map((item) => ({
      _id: item._id,
      productId: item.product._id,
      productName: item.productName || item.product.productName,
      image: item.image || item.product.images?.[0]?.filepath || null,
      sizeId: item.size ? item.size._id : null,
      size: item.sizeLabel || (item.size ? item.size.size : null),
      quantity: item.quantity,
      price: item.price,
      discountedPrice: item.discountedPrice,
      discountPercentage: item.discountPercentage,
    }));

    const totalPrice = items.reduce(
      (sum, item) =>
        sum + (item.discountedPrice || item.price) * item.quantity,
      0
    );

    res.status(200).json({ items, totalPrice });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🔄 Update Item Quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.id(cartItemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.quantity = Math.max(1, quantity);
    await cart.save();

    res.status(200).json({ message: "Cart updated" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// ❌ Remove Item
const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.id(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.deleteOne();
    await cart.save();

    res.status(200).json({ message: "Item removed" });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🧹 Clear Cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    res.status(200).json({ message: "Cart cleared" });
  } catch {
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
