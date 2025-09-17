const Order = require("../Models/ordermodel");
const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");

const placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, paymentMethod } = req.body;

    // Get user's cart with product and size info
    const cart = await Cart.findOne({ user: userId })
      .populate("items.product", "name price stock")
      .populate("items.size", "name");

    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    // Validate cart items and stock
    for (const item of cart.items) {
      if (!item.size)
        return res.status(400).json({
          message: `Size is required for product ${item.product.name}`,
        });

      if (item.quantity < 1)
        return res.status(400).json({
          message: `Quantity must be at least 1 for product ${item.product.name}`,
        });

      if (item.quantity > item.product.stock)
        return res.status(400).json({
          message: `Only ${item.product.stock} units available for product ${item.product.name}`,
        });
    }

    // Prepare order items
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      size: item.size._id,
      quantity: item.quantity,
      price: item.product.price,
      name: item.product.name,
      sizeName: item.size.name,
    }));

    const totalPrice = orderItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    // Create and save the order
    const newOrder = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      totalPrice,
    });

    // Reduce stock for each product (ensure numeric)
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -Number(item.quantity) },
      });
    }

    // Clear user's cart
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });

    // Respond with minimal info
    res.status(201).json({
      message: "Order placed successfully",
      order: {
        id: newOrder._id,
        items: orderItems,
        totalPrice,
        shippingAddress,
        paymentMethod,
        createdAt: newOrder.createdAt,
      },
    });
  } catch (err) {
    console.error("Place Order Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ user: userId })
      .select("items totalPrice status createdAt")
      .populate({
        path: "items.product",
        select: "productName price",
      })
      .populate({
        path: "items.size",
        select: "size",
      })
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("Get User Orders Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .select("items totalPrice status createdAt shippingAddress paymentMethod")
      .populate({
        path: "items.product",
        select: "productName price",
      })
      .populate({
        path: "items.size",
        select: "size",
      })
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (err) {
    console.error("Get Order By ID Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .select(
        "items totalPrice status createdAt user shippingAddress paymentMethod"
      )
      .populate({
        path: "items.product",
        select: "productName price",
      })
      .populate({
        path: "items.size",
        select: "size",
      })
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("Get All Orders Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body; // Pending, Confirmed, Shipped, Delivered, Cancelled

    const order = await Order.findById(orderId)
      .select("items totalPrice status createdAt user")
     .populate({
        path: "items.product",
        select: "productName price",
      })
      .populate({
        path: "items.size",
        select: "size",
      })
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();

    res.json({ message: "Order status updated", order });
  } catch (err) {
    console.error("Update Order Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .select("items totalPrice status createdAt user")
      .populate({
        path: "items.product",
        select: "productName price",
      })
      .populate({
        path: "items.size",
        select: "size",
      })
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user._id.toString() !== userId)
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this order" });

    if (order.status === "Delivered")
      return res
        .status(400)
        .json({ message: "Delivered order cannot be cancelled" });

    order.status = "Cancelled";
    await order.save();

    res.json({ message: "Order cancelled successfully", order });
  } catch (err) {
    console.error("Cancel Order Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  placeOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
  cancelOrder,
};
