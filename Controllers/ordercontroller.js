const Order = require("../Models/ordermodel");
const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const moment = require("moment");

// ================== Generate Invoice ==================
const generateInvoice = async (order) => {
  const dir = path.join(__dirname, "../Invoices");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const invoiceNumber =
    order.invoiceNumber || Math.floor(10000 + Math.random() * 90000);
  const filePath = path.join(dir, `IN-${invoiceNumber}.pdf`);

  const html = `
  <html><head><style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { background:#1E3A8A; color:#fff; padding:15px; text-align:center; border-radius:8px; }
    .invoice { background:#fff; padding:20px; margin-top:15px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,.1); }
    table { width:100%; border-collapse:collapse; margin-top:10px; }
    th,td { padding:8px; border-bottom:1px solid #ddd; text-align:left; }
    th { background:#1E3A8A; color:#fff; font-size:13px; text-transform:uppercase; }
    .totals { text-align:right; margin-top:10px; }
  </style></head>
  <body>
    <div class="header"><h2>TheSafarStore</h2></div>
    <div class="invoice">
      <h3>Invoice No :   ${invoiceNumber}</h3>
      <p>Date: ${moment(order.createdAt).format("DD/MM/YYYY")}</p>
      <p>Payment: ${order.paymentMethod}</p>
      <h4>Shipping Address</h4>
      <p>${order.shippingAddress?.houseno || ""}, ${
    order.shippingAddress?.street || ""
  }, 
      ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${
    order.shippingAddress?.pincode
  }</p>
      <table>
        <tr><th>S.No</th><th>Product</th><th>Size</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        ${order.items
          .map(
            (it, i) =>
              `<tr><td>${i + 1}</td><td>${it.productName}</td><td>${
                it.sizeName || "N/A"
              }</td>
          <td>${it.quantity}</td><td>₹${it.price}</td><td>₹${
                it.price * it.quantity
              }</td></tr>`
          )
          .join("")}
      </table>
      <div class="totals">
        <p>Discount: ₹${order.discount || 0}</p>
        <p>Tax: ₹${order.tax || 0}</p>
        <h3>Total: ₹${order.totalPrice}</h3>
      </div>
    </div>
  </body></html>`;

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: filePath, format: "A4", printBackground: true });
  await browser.close();

  return { filePath, invoiceNumber };
};

// ================== Controllers ==================

// Place Order
const placeOrder = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
      "productName price stock sizes"
    );

    if (!cart || !cart.items.length)
      return res.status(400).json({ message: "Cart is empty" });

    // Build order items
    const items = [];
    for (const it of cart.items) {
      const product = it.product;

      let selectedSize = null;
      if (product.sizes && product.sizes.length > 0) {
        // Option 1: default to first available size
        selectedSize = product.sizes[0];
        if (it.quantity > selectedSize.stock) {
          return res.status(400).json({
            message: `Only ${selectedSize.stock} left for ${product.productName}`,
          });
        }
        // Deduct stock for this size
        await Product.updateOne(
          { _id: product._id, "sizes._id": selectedSize._id },
          { $inc: { "sizes.$.stock": -it.quantity } }
        );
      } else {
        if (it.quantity > product.stock) {
          return res.status(400).json({
            message: `Only ${product.stock} left for ${product.productName}`,
          });
        }
        // Deduct stock for product
        await Product.findByIdAndUpdate(product._id, {
          $inc: { stock: -it.quantity },
        });
      }

      items.push({
        product: product._id,
        size: selectedSize?._id || null,
        quantity: it.quantity,
        price: selectedSize?.price || product.price,
        productName: product.productName,
        sizeName: selectedSize?.size || null,
      });
    }

    const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
    const discount = req.body.discount || 0;
    const tax = req.body.tax || 0;
    const totalPrice = subtotal - discount + tax;

    const order = await Order.create({
      user: req.user.id,
      items,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod || "COD",
      subtotal,
      discount,
      tax,
      totalPrice,
    });

    // Clear cart
    cart.items = [];
    await cart.save();

    const { filePath, invoiceNumber } = await generateInvoice(order);

    res.json({
      message: "Order placed successfully",
      order,
      invoicePath: filePath,
      invoiceNumber,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Download Invoice
const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "username email")
      .populate("items.product", "productName price")
      .populate({ path: "items.size", strictPopulate: false }); // fix strict populate

    if (!order) return res.status(404).json({ message: "Order not found" });

    const { filePath } = await generateInvoice(order.toObject());
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get orders for logged-in user
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product")
      .populate({ path: "items.size", strictPopulate: false })
      .populate("user");

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all orders (Admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.product")
      .populate({ path: "items.size", strictPopulate: false })
      .populate("user")
      .sort({ createdAt: -1 });
    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update order status (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel order (User)
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.user.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    if (order.status === "Delivered")
      return res
        .status(400)
        .json({ message: "Delivered order cannot be cancelled" });

    order.status = "Cancelled";
    await order.save();

    // Restore stock
    for (const i of order.items) {
      if (i.size) {
        await Product.updateOne(
          { _id: i.product, "sizes._id": i.size },
          { $inc: { "sizes.$.stock": i.quantity } }
        );
      } else {
        await Product.findByIdAndUpdate(i.product, {
          $inc: { stock: i.quantity },
        });
      }
    }

    res.json({ message: "Order cancelled", order });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  placeOrder,
  downloadInvoice,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
};
