// ================== Imports ==================
const Order = require("../Models/ordermodel");
const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const moment = require("moment");

// ================== Helpers ==================

// Generate invoice PDF
const generateInvoice = (order, orderItems, shippingAddress, totals) => {
  const invoiceDir = path.join(__dirname, "../invoices");
  if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir);

  const invoicePath = path.join(invoiceDir, `invoice-${order._id}.pdf`);
  const doc = new PDFDocument({ margin: 50 });

  doc.pipe(fs.createWriteStream(invoicePath));

  // -------- Company Branding --------
  const logoPath = path.join(__dirname, "../public/logo.png");
  if (fs.existsSync(logoPath)) doc.image(logoPath, 50, 45, { width: 60 });

  doc.fontSize(20).text("Safar Techlab Pvt. Ltd.", 120, 50);
  doc.fontSize(10).text("GSTIN: 27AAACS1234Z1Z1", 120, 75);
  doc.text("Email: support@safartechlab.com | Phone: +91-9876543210", 120, 90);
  doc.moveDown(2);

  // -------- Invoice Header --------
  doc.fontSize(18).text("INVOICE", { align: "center" }).moveDown();
  doc.fontSize(12).text(`Invoice No: ${order._id}`);
  doc.text(`Date: ${moment(order.createdAt).format("DD/MM/YYYY")}`);
  doc.text(`Payment Method: ${order.paymentMethod}`).moveDown();

  // -------- Shipping Details --------
  doc.fontSize(14).text("Shipping Address", { underline: true });
  doc
    .fontSize(12)
    .text(`${shippingAddress.houseno || ""}, ${shippingAddress.street || ""}`)
    .text(
      `${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pincode}`
    )
    .text(`${shippingAddress.country}`);
  if (shippingAddress.landmark)
    doc.text(`Landmark: ${shippingAddress.landmark}`);
  if (shippingAddress.phone) doc.text(`Phone: ${shippingAddress.phone}`);
  doc.moveDown(2);

  // -------- Order Items --------
  doc.fontSize(14).text("Order Details", { underline: true }).moveDown();

  // Table header
  doc
    .fontSize(12)
    .text("S.No", 50, doc.y, { width: 50 })
    .text("Product", 100, doc.y, { width: 200 })
    .text("Qty", 300, doc.y, { width: 50, align: "center" })
    .text("Price", 370, doc.y, { width: 80, align: "right" })
    .text("Total", 460, doc.y, { width: 80, align: "right" });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

  // Table rows
  orderItems.forEach((item, i) => {
    const total = item.price * item.quantity;
    doc
      .fontSize(12)
      .text(i + 1, 50, doc.y, { width: 50 })
      .text(`${item.productName} (${item.sizeName})`, 100, doc.y, {
        width: 200,
      })
      .text(item.quantity, 300, doc.y, { width: 50, align: "center" })
      .text(`₹${item.price}`, 370, doc.y, { width: 80, align: "right" })
      .text(`₹${total}`, 460, doc.y, { width: 80, align: "right" });
    doc.moveDown();
  });

  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

  // Totals
  doc
    .fontSize(12)
    .text(`Subtotal: ₹${totals.subtotal}`, { align: "right" })
    .text(`Discount: ₹${totals.discount}`, { align: "right" })
    .text(`Tax: ₹${totals.tax}`, { align: "right" })
    .fontSize(14)
    .text(`Grand Total: ₹${totals.total}`, { align: "right" });

  doc.moveDown(2);

  // -------- Footer --------
  doc
    .fontSize(12)
    .text("Thank you for shopping with Safar Techlab!", { align: "center" })
    .text("For any support, contact support@safartechlab.com", {
      align: "center",
    });

  doc.end();
  return invoicePath;
};

// ================== Controllers ==================

// Place an order
const placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, paymentMethod } = req.body;

    // Get cart
    const cart = await Cart.findOne({ user: userId })
      .populate("items.product", "productName price stock")
      .populate("items.size", "name");

    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    // Validate stock
    for (const item of cart.items) {
      if (!item.size)
        return res
          .status(400)
          .json({ message: `Size required for ${item.product.productName}` });
      if (item.quantity < 1)
        return res.status(400).json({
          message: `Invalid quantity for ${item.product.productName}`,
        });
      if (item.quantity > item.product.stock)
        return res.status(400).json({
          message: `Only ${item.product.stock} units left for ${item.product.productName}`,
        });
    }

    // Order items
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      size: item.size._id,
      quantity: item.quantity,
      price: item.product.price,
      productName: item.product.productName,
      sizeName: item.size.name,
    }));

    // Totals
    const subtotal = orderItems.reduce(
      (acc, i) => acc + i.price * i.quantity,
      0
    );
    const discount = 0;
    const tax = 0;
    const total = subtotal - discount + tax;

    // Save order
    const newOrder = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      subtotal,
      discount,
      tax,
      totalPrice: total,
    });

    // Update stock & clear cart
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
    }
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });

    // Generate invoice
    const invoicePath = generateInvoice(newOrder, orderItems, shippingAddress, {
      subtotal,
      discount,
      tax,
      total,
    });

    res.json({
      message: "Order placed successfully",
      order: newOrder,
      invoicePath,
    });
  } catch (err) {
    console.error("Place Order Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Download invoice
const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Fetch order with populated fields
    const order = await Order.findById(orderId)
      .populate("user", "username email")
      .populate("items.product", "productName price")
      .populate("items.size", "size");

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Ensure invoice directory exists
    const invoiceDir = path.join(__dirname, "../invoices");
    if (!fs.existsSync(invoiceDir))
      fs.mkdirSync(invoiceDir, { recursive: true });
    const invoicePath = path.join(invoiceDir, `invoice-${orderId}.pdf`);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = fs.createWriteStream(invoicePath);
    doc.pipe(stream);

    // -------- Company Header --------
    const logoPath = path.join(__dirname, "../public/logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 60 });
    }

    doc
      .fillColor("#0B3D91")
      .fontSize(20)
      .text("Safar Techlab Pvt. Ltd.", 120, 50);

    doc
      .fillColor("#444444")
      .fontSize(10)
      .text("GSTIN: 27AAACS1234Z1Z1", 120, 70)
      .text("Email: support@safartechlab.com | Phone: +91-9876543210", 120, 85)
      .moveDown(2);

    // -------- Invoice Header --------
    doc
      .fillColor("#FFFFFF")
      .rect(50, doc.y, 500, 30)
      .fill("#0B3D91")
      .fillColor("#FFFFFF")
      .fontSize(18)
      .text("INVOICE", 50, doc.y + 7, { align: "center" });

    doc
      .moveDown(2)
      .fillColor("#444444")
      .fontSize(12)
      .text(`Invoice ID: ${order._id}`)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`)
      .text(`Payment Method: ${order.paymentMethod}`)
      .moveDown();

    // -------- Customer Info --------
    doc
      .fillColor("#0B3D91")
      .fontSize(14)
      .text("Customer Details", { underline: true });

    doc
      .fillColor("#444444")
      .fontSize(12)
      .text(`Name: ${order.user.username}`)
      .text(`Email: ${order.user.email}`)
      .moveDown();

    // -------- Shipping Address --------
    doc
      .fillColor("#0B3D91")
      .fontSize(14)
      .text("Shipping Address", { underline: true });

    doc
      .fillColor("#444444")
      .fontSize(12)
      .text(
        `${order.shippingAddress.houseno || ""}, ${
          order.shippingAddress.street || ""
        }, 
${order.shippingAddress.city}, ${order.shippingAddress.state}, 
${order.shippingAddress.pincode}, ${order.shippingAddress.country}`
      )
      .moveDown(2);

    // -------- Order Items (Table) --------
    doc
      .fillColor("#0B3D91")
      .fontSize(14)
      .text("Order Items", { underline: true });

    doc.moveDown(0.5);

    const tableTop = doc.y;
    const headers = ["S.No", "Product", "Qty", "Price", "Total"];
    const colWidths = [50, 200, 50, 80, 80];
    const startX = 50;

    // Table header background
    doc.rect(startX, tableTop, 500, 20).fill("#D6E4FF").stroke();
    doc.fillColor("#0B3D91").fontSize(12);

    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x + 2, tableTop + 5, {
        width: colWidths[i],
        align: i > 1 ? "right" : "left",
      });
      x += colWidths[i];
    });

    let y = tableTop + 20;
    order.items.forEach((item, i) => {
      const total = item.price * item.quantity;

      // Alternate row colors
      if (i % 2 === 0) doc.rect(startX, y, 500, 20).fill("#F0F5FF").stroke();

      doc.fillColor("#444444").fontSize(12);
      doc.text(i + 1, startX + 2, y + 5, {
        width: colWidths[0],
        align: "left",
      });
      doc.text(
        `${item.product.productName} (${item.size?.size || "N/A"})`,
        startX + colWidths[0] + 2,
        y + 5,
        { width: colWidths[1], align: "left" }
      );
      doc.text(item.quantity, startX + colWidths[0] + colWidths[1] + 2, y + 5, {
        width: colWidths[2],
        align: "right",
      });
      doc.text(
        `₹${item.price}`,
        startX + colWidths[0] + colWidths[1] + colWidths[2] + 2,
        y + 5,
        { width: colWidths[3], align: "right" }
      );
      doc.text(
        `₹${total}`,
        startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2,
        y + 5,
        { width: colWidths[4], align: "right" }
      );

      y += 20;
    });

    doc.moveDown(2);

    // -------- Totals --------
    doc.fillColor("#0B3D91").fontSize(12);
    doc.text(`Subtotal: ₹${order.totalPrice}`, { align: "right" });
    doc.text(`Discount: ₹0`, { align: "right" });
    doc.text(`Tax: ₹0`, { align: "right" });
    doc.fontSize(14).text(`Grand Total: ₹${order.totalPrice}`, {
      align: "right",
      bold: true,
    });

    doc.moveDown(2);

    // -------- Footer --------
    doc
      .fillColor("#0B3D91")
      .fontSize(12)
      .text("Thank you for shopping with Safar Techlab!", { align: "center" });
    doc
      .fillColor("#444444")
      .text("For support, contact support@safartechlab.com", {
        align: "center",
      });

    doc.end();

    stream.on("finish", () => res.download(invoicePath));
  } catch (err) {
    console.error("Invoice Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get orders of logged-in user
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .select("items totalPrice status createdAt")
      .populate("items.product", "productName price")
      .populate("items.size", "name")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product", "productName price")
      .populate("items.size", "name")
      .populate("user", "username email");

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
      .populate("items.product", "productName price")
      .populate("items.size", "name")
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = req.body.status;
    await order.save();

    res.json({ message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "_id");

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.user._id.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    if (order.status === "Delivered")
      return res
        .status(400)
        .json({ message: "Delivered order cannot be cancelled" });

    order.status = "Cancelled";
    await order.save();

    res.json({ message: "Order cancelled", order });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================== Exports ==================
module.exports = {
  placeOrder,
  downloadInvoice,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
};
