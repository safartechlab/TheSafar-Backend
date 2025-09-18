const Order = require("../Models/ordermodel");
const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const moment = require("moment");

// ================== Generate Invoice with Puppeteer ==================

const generateInvoice = async (order) => {
  const invoiceDir = path.join(__dirname, "../Invoices");
  if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });

  const invoiceNumber =
    order.invoiceNumber || Math.floor(10000 + Math.random() * 90000);
  const invoicePath = path.join(invoiceDir, `IN-${invoiceNumber}.pdf`);

  // Build HTML Template (you can move this into a .ejs/.hbs file later)
  const html = `
<html>
  <head>
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; background: #f9fafb; }
      h1, h2, h3 { margin: 0; }

      /* Header */
      .header { 
        background: linear-gradient(90deg, #1E3A8A, #3B82F6); 
        color: white; 
        padding: 20px; 
        border-radius: 8px; 
        text-align: center; 
      }
      .header h2 { margin-bottom: 5px; font-size: 28px; }
      .header p { margin: 0; font-size: 12px; }

      /* Invoice Box */
      .invoice-box { 
        background: #fff; 
        border-radius: 10px; 
        padding: 25px; 
        margin-top: 20px; 
        box-shadow: 0 4px 10px rgba(0,0,0,0.08); 
      }
      .invoice-box h1 { 
        color: #1E3A8A; 
        text-align: center; 
        margin-bottom: 20px; 
        letter-spacing: 1px; 
      }

      /* Shipping & Invoice Info */
      .info { margin-bottom: 20px; font-size: 14px; line-height: 1.6; }
      .info p { margin: 2px 0; }
      .section-title { 
        font-size: 16px; 
        color: #1E3A8A; 
        margin-top: 20px; 
        margin-bottom: 10px; 
        border-left: 4px solid #3B82F6; 
        padding-left: 8px; 
      }

      /* Table */
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-top: 10px; 
        border-radius: 6px; 
        overflow: hidden; 
      }
      th { 
        background: #1E3A8A; 
        color: #fff; 
        padding: 10px; 
        font-size: 14px; 
        text-transform: uppercase; 
      }
      td { 
        border-bottom: 1px solid #e5e7eb; 
        padding: 10px; 
        font-size: 13px; 
      }
      tr:nth-child(even) td { background: #f3f4f6; }

      /* Totals */
      .totals { 
        margin-top: 20px; 
        text-align: right; 
        font-size: 15px; 
      }
      .totals p { margin: 4px 0; }
      .totals h3 { 
        color: #10B981; 
        font-size: 20px; 
        margin-top: 10px; 
      }

      /* Footer */
      .footer { 
        text-align: center; 
        margin-top: 30px; 
        font-size: 12px; 
        color: #6b7280; 
        padding: 10px; 
        background: #f3f4f6; 
        border-radius: 6px; 
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>TheSafarStore</h2>
      <p>GSTIN: 27AAACS1234Z1Z1 | Email: support@safaronlinestore.com | Phone: +91-9876543210</p>
    </div>

    <div class="invoice-box">
      <h1>INVOICE</h1>
      <div class="info">
        <p><b>Invoice No:</b> ${invoiceNumber}</p>
        <p><b>Date:</b> ${moment(order.createdAt).format("DD/MM/YYYY")}</p>
        <p><b>Payment Method:</b> ${order.paymentMethod}</p>
      </div>

      <h3 class="section-title">Shipping Address</h3>
      <p class="info">
        ${order.shippingAddress?.houseno || ""}, ${
    order.shippingAddress?.street || ""
  }<br/>
        ${
          order.shippingAddress?.landmark
            ? order.shippingAddress.landmark + "<br/>"
            : ""
        }
        ${order.shippingAddress?.city}, ${order.shippingAddress?.state}, ${
    order.shippingAddress?.pincode
  }<br/>
        ${order.shippingAddress?.country}<br/>
        ${
          order.shippingAddress?.phone
            ? "Phone: " + order.shippingAddress.phone
            : ""
        }
      </p>

      <h3 class="section-title">Order Details</h3>
      <table>
        <tr>
          <th>S.No</th>
          <th>Product</th>
          <th>Size</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
        ${order.items
          .map(
            (item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${item.productName || item.product?.productName}</td>
            <td>${item.sizeName || item.size?.size || "N/A"}</td>
            <td>${item.quantity}</td>
            <td>₹${item.price}</td>
            <td>₹${item.price * item.quantity}</td>
          </tr>
        `
          )
          .join("")}
      </table>

      <div class="totals">
        <p>Discount: ₹${order.discount || 0}</p>
        <p>Tax: ₹${order.tax || 0}</p>
        <h3>Grand Total: ₹${order.totalPrice}</h3>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for shopping with <b>TheSafarStore</b>!</p>
      <p>For support, contact support@safartechlab.com</p>
    </div>
  </body>
</html>
`;

  // Launch Puppeteer
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  // Save PDF
  await page.pdf({
    path: invoicePath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return { invoicePath, invoiceNumber };
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
      .populate("items.size", "size");

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
      sizeName: item.size.size,
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
      .populate("items.size", "size"); // ✅ populate only the "size" field

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
      .populate("items.size", "size")
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
      .populate("items.size", "size")
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
