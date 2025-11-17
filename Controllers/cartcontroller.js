const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");

// 🛒 Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1, sizeId = null, size = null } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ----- Base pricing -----
    let selectedSize = null;
    let price = product.price || 0;
    let discountedPrice = product.discountedPrice || price;
    let discountPercentage = product.discountPercentage || 0;

    // ----- Size Handling -----
    if (sizeId || size) {
      selectedSize = product.sizes.find((s) => {
        return (
          (sizeId && s._id.toString() === sizeId.toString()) ||
          (size && s.size?.toLowerCase() === size.toLowerCase())
        );
      });

      if (!selectedSize) {
        return res.status(400).json({
          message: `Invalid size selected for ${product.productName}`,
        });
      }

      price = selectedSize.price || price;
      discountedPrice = selectedSize.discountedPrice || discountedPrice;
      discountPercentage =
        selectedSize.discountPercentage || discountPercentage;
    }

    // ----- Find or create Cart -----
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // ----- Check if same product + size already exists -----
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        ((selectedSize &&
          item.size?.toString() === selectedSize._id.toString()) ||
          (!selectedSize && !item.size))
    );

    if (existingItem) {
      existingItem.quantity = Math.max(1, existingItem.quantity + quantity);
      existingItem.price = price;
      existingItem.discountedPrice = discountedPrice;
      existingItem.discountPercentage = discountPercentage;
    } else {
      cart.items.push({
        product: productId,
        size: selectedSize ? selectedSize._id : null,
        quantity,
        price,
        discountedPrice,
        discountPercentage,
        productName: product.productName,
        image: product.images?.[0]?.filepath || null,
      });
    }

    await cart.save();

    // ----- Populate -----
    const populated = await cart.populate([
      { path: "items.product", select: "productName images" },
      { path: "items.size", select: "size" },
    ]);

    // ----- Simplify Response -----
    const items = populated.items.map((item) => ({
      _id: item._id,
      productId: item.product._id,
      productName: item.productName || item.product.productName,
      image: item.image || item.product.images?.[0]?.filepath,
      size: item.size ? item.size.size : null,
      sizeId: item.size ? item.size._id : null,
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
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🧾 Get user cart
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
      quantity: item.quantity,
      price: item.price,
      discountedPrice: item.discountedPrice,
      discountPercentage: item.discountPercentage,
      size: item.size ? item.size.size : null,
      sizeId: item.size ? item.size._id : null,
    }));

    const totalPrice = items.reduce(
      (sum, item) =>
        sum + (item.discountedPrice || item.price) * item.quantity,
      0
    );

    res.status(200).json({ items, totalPrice });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🔄 Update quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!cartItemId || quantity == null)
      return res.status(400).json({
        message: "Cart item ID and quantity required",
      });

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.id(cartItemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.quantity = Math.max(1, quantity);
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

    res.status(200).json({ message: "Cart updated", items });
  } catch (err) {
    console.error("Update cart item error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ❌ Remove item
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

    res.status(200).json({ message: "Item removed", items });
  } catch (error) {
    console.error("Remove cart item error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🧹 Clear cart
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
