const Order = require("../Models/ordermodel");
const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const moment = require("moment");

const generateInvoice = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const invoiceDir = path.join(__dirname, "../Invoices");
      if (!fs.existsSync(invoiceDir))
        fs.mkdirSync(invoiceDir, { recursive: true });

      const invoiceNumber =
        order.invoiceNumber || Math.floor(10000 + Math.random() * 90000);
      const invoicePath = path.join(invoiceDir, `IN-${invoiceNumber}.pdf`);
      const doc = new PDFDocument({ margin: 50 });
  
      const stream = fs.createWriteStream(invoicePath);
      doc.pipe(stream);

      // -------- Company Header --------
      const logoPath = path.join(__dirname, "../public/logo.png");
      if (fs.existsSync(logoPath)) doc.image(logoPath, 50, 45, { width: 60 });

      // -------- Store Header --------
      doc.rect(50, 40, 500, 40).fill("#1E3A8A"); // Dark blue background
      doc.fillColor("#FFF").fontSize(20).text("TheSafarStore", 60, 50);
      doc
        .fontSize(10)
        .text("GSTIN: 27AAACS1234Z1Z1", 300, 50)
        .text("Email: support@safaronlinestore.com", 300, 62)
        .text("Phone: +91-9876543210", 300, 74);

      doc.moveDown(2).fillColor("#000");
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1);

      // -------- Invoice Header --------
      doc.rect(50, doc.y, 500, 60).fill("#F3F4F6").stroke(); // Light gray box
      doc
        .fillColor("#000")
        .fontSize(18)
        .text("INVOICE", 50, doc.y + 5, { align: "center", underline: true });
      doc
        .fontSize(12)
        .text(`Invoice No: ${invoiceNumber}`, 60, doc.y + 30)
        .text(
          `Date: ${moment(order.createdAt).format("DD/MM/YYYY")}`,
          250,
          doc.y + 30
        )
        .text(`Payment Method: ${order.paymentMethod}`, 400, doc.y + 30);

      doc.moveDown(4);

      // -------- Shipping Address --------
      doc
        .fontSize(14)
        .fillColor("#1E3A8A")
        .text("Shipping Address", { underline: true });
      const s = order.shippingAddress;
      doc
        .rect(50, doc.y + 5, 500, 70)
        .fill("#F9FAFB")
        .stroke();
      doc
        .fillColor("#000")
        .fontSize(12)
        .text(
          `${s.houseno || ""}, ${s.street || ""}\n${s.city}, ${s.state}, ${
            s.pincode
          }\n${s.country}`,
          60,
          doc.y + 10
        );
      if (s.landmark) doc.text(`Landmark: ${s.landmark}`);
      if (s.phone) doc.text(`Phone: ${s.phone}`);

      // -------- Order Details Table --------
      doc.moveDown(3);
      doc
        .fontSize(14)
        .fillColor("#1E3A8A")
        .text("Order Details", { underline: true })
        .moveDown(0.5);

      // Table Header
      doc.rect(50, doc.y, 500, 20).fill("#E5E7EB").stroke();
      doc
        .fillColor("#000")
        .fontSize(12)
        .text("S.No", 55, doc.y + 5, { width: 40, align: "center" })
        .text("Product", 100, doc.y + 5, { width: 180 })
        .text("Qty", 290, doc.y + 5, { width: 50, align: "center" })
        .text("Price", 360, doc.y + 5, { width: 80, align: "right" })
        .text("Total", 450, doc.y + 5, { width: 90, align: "right" });

      doc.moveDown(2);

      // Table Rows
      order.items.forEach((item, i) => {
        const total = item.price * item.quantity;
        const rowY = doc.y;

        // Alternate row colors
        doc
          .rect(50, rowY, 500, 20)
          .fill(i % 2 === 0 ? "#F9FAFC" : "#FFF")
          .stroke();
        doc
          .fillColor("#000")
          .fontSize(11)
          .text(i + 1, 55, rowY + 5, { width: 40, align: "center" })
          .text(
            `${item.productName || item.product.productName} (${
              item.sizeName || item.size?.name || "N/A"
            })`,
            100,
            rowY + 5,
            { width: 180 }
          )
          .text(item.quantity, 290, rowY + 5, { width: 50, align: "center" })
          .text(`₹${item.price}`, 360, rowY + 5, { width: 80, align: "right" })
          .text(`₹${total}`, 450, rowY + 5, { width: 90, align: "right" });

        doc.moveDown(2);
      });

      // -------- Totals Section --------
      doc.rect(350, doc.y, 200, 80).fill("#F3F4F6").stroke();
      doc
        .fillColor("#000")
        .fontSize(12)
        .text(`Discount: ₹${order.discount || 0}`, 360, doc.y + 20)
        .text(`Tax: ₹${order.tax || 0}`, 360, doc.y + 35)
        .fontSize(14)
        .fillColor("#1E3A8A")
        .text(`Grand Total: ₹${order.totalPrice}`, 360, doc.y + 55, {
          bold: true,
        });

      // -------- Footer --------
      doc.moveDown(4);
      doc.rect(50, doc.y, 500, 40).fill("#1E3A8A").stroke();
      doc
        .fillColor("#FFF")
        .fontSize(11)
        .text("Thank you for shopping with TheSafarStore!", 50, doc.y + 10, {
          align: "center",
        })
        .text(
          "For any support, contact support@safartechlab.com",
          50,
          doc.y + 25,
          { align: "center" }
        );

      doc.end();

      stream.on("finish", () => resolve({ invoicePath, invoiceNumber }));
      stream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
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

    // Generate numeric invoice number
    const invoiceNumber = Math.floor(10000000 + Math.random() * 90000000);

    // Save order with invoice number
    const newOrder = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      subtotal,
      discount,
      tax,
      totalPrice: total,
      invoiceNumber,
    });

    // Update stock & clear cart
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
    }
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });

    // Generate invoice PDF
    const { invoicePath } = await generateInvoice(newOrder);

    res.json({
      message: "Order placed successfully",
      order: newOrder,
      invoicePath,
      invoiceNumber,
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
    const order = await Order.findById(orderId)
      .populate("user", "username email")
      .populate("items.product", "productName price")
      .populate("items.size", "name");

    if (!order) return res.status(404).json({ message: "Order not found" });

    const { invoicePath } = await generateInvoice(order.toObject());
    res.download(invoicePath);
  } catch (err) {
    console.error("Invoice Download Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get orders of logged-in user
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .select("items totalPrice status createdAt invoiceNumber")
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
