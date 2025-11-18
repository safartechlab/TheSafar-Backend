// controllers/orderController.js
const Order = require("../Models/ordermodel");
const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");
const puppeteer = require("puppeteer");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const moment = require("moment");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// ----------------- Company / Config -----------------
const COMPANY_NAME = "TheSafarStore";
const COMPANY_EMAIL = "thesafaronlinestore@gmail.com";
const COMPANY_PHONE = "+91 99795-51975";
const COMPANY_ADDRESS =
  "410, Adinath Arcade,HoneyPark road, Adajan, Surat, Gujarat - 395004";

const INVOICE_TAX_PERCENT = parseFloat(process.env.INVOICE_TAX_PERCENT || "18");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_ID;
const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn("⚠ Razorpay credentials missing - payment endpoints will fail");
}

const razorpay =
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
      })
    : null;

// ----------------- Helpers -----------------
const generateInvoiceNumber = () => {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `INV-${random}`;
};

const normalizeSize = (sizeObjOrIdOrString) => {
  if (!sizeObjOrIdOrString) return "N/A";
  if (typeof sizeObjOrIdOrString === "string") return sizeObjOrIdOrString;
  if (typeof sizeObjOrIdOrString === "number") return String(sizeObjOrIdOrString);
  if (typeof sizeObjOrIdOrString === "object") {
    if ("size" in sizeObjOrIdOrString && sizeObjOrIdOrString.size)
      return String(sizeObjOrIdOrString.size);
    if (sizeObjOrIdOrString._id && typeof sizeObjOrIdOrString._id !== "object")
      return String(sizeObjOrIdOrString._id);
    try {
      return String(sizeObjOrIdOrString.toString());
    } catch {
      return "N/A";
    }
  }
  return String(sizeObjOrIdOrString);
};

const calculateTotals = (items = []) => {
  let originalTotal = 0;
  let discountedTotal = 0;
  let totalDiscount = 0;

  items.forEach((it) => {
    const qty = Number(it.quantity || 1);
    const charged = Number(it.price || 0) * qty;
    discountedTotal += charged;

    const original =
      Number(it.originalPrice ?? it.mrp ?? it.listPrice ?? it.price ?? 0);
    originalTotal += original * qty;

    totalDiscount += (original - Number(it.price || 0)) * qty;
  });

  if (!items.some((i) => i.originalPrice || i.mrp || i.listPrice)) {
    originalTotal = discountedTotal;
    totalDiscount = 0;
  }

  const tax = Number(((discountedTotal * INVOICE_TAX_PERCENT) / 100).toFixed(2));
  const payable = Number((discountedTotal + tax).toFixed(2));

  return {
    originalTotal: Number(originalTotal.toFixed(2)),
    discountedTotal: Number(discountedTotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    tax,
    payable,
  };
};

// ----------------- Invoice PDF Generator -----------------
const generateInvoice = async (order) => {
  const dir = path.join(__dirname, "../Invoices");
  if (!fs.existsSync(dir)) await fsp.mkdir(dir, { recursive: true });

  const invoiceNumber = order.invoiceNumber || generateInvoiceNumber();
  order.invoiceNumber = invoiceNumber;

  try {
    await order.save();
  } catch (e) {
    console.warn("Could not persist invoiceNumber on order:", e.message || e);
  }

  const displayItems = (order.items || []).map((it) => {
    const qty = Number(it.quantity || 0);
    const price = Number(it.price || 0);
    const originalPrice = Number(it.originalPrice || it.mrp || it.listPrice || price);
    return {
      productName: it.productName || (it.product && it.product.productName) || "Item",
      size: normalizeSize(it.size),
      quantity: qty,
      price,
      originalPrice,
      total: Number((price * qty).toFixed(2)),
    };
  });

  const totals = calculateTotals(displayItems);
  const filePath = path.join(dir, `${invoiceNumber}.pdf`);

  const rowsHtml = displayItems
    .map(
      (it, idx) => `
    <tr>
      <td style="padding:8px; border:1px solid #ddd; text-align:center">${idx + 1}</td>
      <td style="padding:8px; border:1px solid #ddd">${it.productName}</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center">${it.size}</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center">${it.quantity}</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:right">₹${it.originalPrice.toFixed(
        2
      )}</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:right">₹${it.price.toFixed(
        2
      )}</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:right">₹${it.total.toFixed(
        2
      )}</td>
    </tr>`
    )
    .join("");

  const html = `
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice - ${invoiceNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
      .company { background:#033045; color:#fff; padding:16px; border-radius:8px; text-align:center }
      .company h1 { margin:0; font-size:22px; letter-spacing:1px }
      .meta { margin-top:12px; }
      .flex { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      table { width:100%; border-collapse:collapse; margin-top:20px; font-size:13px; }
      th, td { border:1px solid #ddd; padding:8px; }
      th { background:#0077b6; color:#fff; text-transform:uppercase; font-size:12px; }
      .right { text-align:right; }
      .totals { width: 320px; margin-left:auto; margin-top:12px; }
      .totals table { width:100%; border:none; }
      .totals td { border:none; padding:6px 8px; }
      .footer { margin-top:26px; text-align:center; color:#666; font-size:12px }
    </style>
  </head>
  <body>
    <div class="company">
      <h1>${COMPANY_NAME}</h1>
      <div class="meta">${COMPANY_EMAIL} | ${COMPANY_PHONE}</div>
      <div class="meta">${COMPANY_ADDRESS}</div>
    </div>

    <div style="margin-top:16px" class="flex">
      <div>
        <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
        <p><strong>Date:</strong> ${moment(order.createdAt).format("DD/MM/YYYY")}</p>
      </div>
      <div>
        <p><strong>Customer:</strong> ${order.shippingAddress?.name || "-"}</p>
        <p><strong>Phone:</strong> ${order.shippingAddress?.phone || "-"}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod || "-"}</p>
        <p><strong>Payment Status:</strong> ${order.paymentStatus || "-"}</p>
      </div>
    </div>

    <h4>Shipping Address</h4>
    <p>
      ${order.shippingAddress?.houseno || ""} ${order.shippingAddress?.street || ""}<br>
      ${order.shippingAddress?.landmark || ""}<br>
      ${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""} - ${order.shippingAddress?.pincode || ""}<br>
      ${order.shippingAddress?.country || ""}
    </p>

    <table>
      <tr>
        <th>S.No</th>
        <th>Product</th>
        <th>Size</th>
        <th>Qty</th>
        <th>Original Price</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
      ${rowsHtml}
    </table>

    <div class="totals">
      <table>
        <tr><td>Subtotal (Original):</td><td class="right">₹${totals.originalTotal.toFixed(2)}</td></tr>
        <tr><td>Subtotal (Charged):</td><td class="right">₹${totals.discountedTotal.toFixed(2)}</td></tr>
        <tr><td>Discount (You saved):</td><td class="right">- ₹${totals.totalDiscount.toFixed(2)}</td></tr>
        <tr><td>Tax (${INVOICE_TAX_PERCENT}%):</td><td class="right">₹${totals.tax.toFixed(2)}</td></tr>
        <tr><td style="font-weight:700">Payable Amount:</td><td class="right" style="font-weight:700">₹${totals.payable.toFixed(2)}</td></tr>
      </table>
    </div>

    <div class="footer">
      <p>Thank you for shopping with <strong>${COMPANY_NAME}</strong> 💙</p>
    </div>
  </body>
  </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ path: filePath, format: "A4", printBackground: true });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return { filePath, invoiceNumber };
};

// ----------------- Controllers -----------------

// Razorpay order creation
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, items = [], shippingAddress = {}, paymentMethod } = req.body;
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: "Invalid amount" });

    if (!razorpay)
      return res.status(500).json({ success: false, message: "Razorpay not configured" });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    const orderItems = items.map((it) => ({
      product: it.productId || it.product,
      productName: it.productName || it.name || "Item",
      image: it.image || "",
      price: Number(it.price || it.discountedPrice || it.mrp || 0),
      originalPrice: Number(it.originalPrice || it.mrp || it.listPrice || it.price || 0),
      quantity: Number(it.quantity || 1),
      size: normalizeSize(it.size || it.sizeId || it.selectedSize),
    }));

    await Order.create({
      user: userId,
      items: orderItems,
      paymentMethod: paymentMethod || "Razorpay",
      shippingAddress,
      subtotal: Number(amount),
      totalPrice: Number(amount),
      razorpayOrderId: razorpayOrder.id,
      status: "Pending",
      paymentStatus: "Pending",
    });

    res.status(200).json({ success: true, key: RAZORPAY_KEY_ID, order: razorpayOrder });
  } catch (error) {
    console.error("Create Razorpay Order Error:", error);
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

// Razorpay payment verification
const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      checkoutForm,
      cartItems = [],
      totalAmount = 0,
      paymentMethod = "Razorpay",
    } = req.body;

    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ success: false, message: "Missing payment fields" });

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign)
      return res.status(400).json({ success: false, message: "Invalid payment signature" });

    let existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    const itemsToSave = cartItems.map((it) => ({
      product: it.productId || it.product,
      productName: it.productName || it.name || "Item",
      image: it.image || "",
      price: Number(it.price || it.discountedPrice || it.mrp || 0),
      originalPrice: Number(it.originalPrice || it.mrp || it.listPrice || it.price || 0),
      quantity: Number(it.quantity || 1),
      size: normalizeSize(it.size || it.sizeId || it.selectedSize),
    }));

    if (!existingOrder) {
      existingOrder = await Order.create({
        user: userId,
        items: itemsToSave,
        paymentMethod,
        shippingAddress: checkoutForm || {},
        subtotal: Number(totalAmount),
        totalPrice: Number(totalAmount),
        razorpayOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        paymentStatus: "Paid",
        status: "Received",
        date: new Date(),
      });
    } else {
      existingOrder.paymentId = razorpay_payment_id;
      existingOrder.paymentStatus = "Paid";
      existingOrder.status = "Received";
      existingOrder.date = new Date();
      existingOrder.paymentMethod = paymentMethod || existingOrder.paymentMethod;

      if (checkoutForm) existingOrder.shippingAddress = checkoutForm;
      if (itemsToSave.length) existingOrder.items = itemsToSave;
      existingOrder.subtotal = Number(totalAmount) || existingOrder.subtotal;
      existingOrder.totalPrice = Number(totalAmount) || existingOrder.totalPrice;

      await existingOrder.save();
    }

    await Cart.findOneAndUpdate({ user: userId }, { items: [] }).catch(() => {});

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      order: existingOrder,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false, message: error.message || "Verification failed" });
  }
};

// Download invoice
const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product").populate("items.size");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const { filePath, invoiceNumber } = await generateInvoice(order);
    res.download(filePath, `${invoiceNumber}.pdf`, (err) => {
      if (err) console.error("Send invoice error:", err);
    });
  } catch (err) {
    console.error("Invoice download error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error("Get user orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all orders (admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("user").sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error("Get all orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update order status (admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["Received", "Confirmed", "Rejected", "Shipped", "Delivered", "Cancelled"];
    if (!valid.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const updated = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, updated });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status === "Delivered") return res.status(400).json({ message: "Delivered order cannot be cancelled" });

    order.status = "Cancelled";
    await order.save();

    // Restore stock
    for (const item of order.items) {
      try {
        if (item.size) {
          await Product.updateOne(
            { _id: item.product, "sizes.size": item.size },
            { $inc: { "sizes.$.stock": item.quantity } }
          );
        } else {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }
      } catch (e) {
        console.warn("Failed to restore stock for", item.product, e.message || e);
      }
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Place manual order (COD / offline)
const placeOrder = async (req, res) => {
  try {
    const { items = [], shippingAddress = {}, paymentMethod = "COD", subtotal = 0, totalPrice = 0 } = req.body;
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const normalizedItems = items.map((it) => ({
      product: it.productId || it.product,
      productName: it.productName || it.name || "Item",
      image: it.image || "",
      price: Number(it.price || it.discountedPrice || 0),
      originalPrice: Number(it.originalPrice || it.mrp || it.listPrice || it.price || 0),
      quantity: Number(it.quantity || 1),
      size: normalizeSize(it.size || it.sizeId || it.selectedSize),
    }));

    const newOrder = new Order({
      user: userId,
      items: normalizedItems,
      shippingAddress,
      paymentMethod,
      subtotal: Number(subtotal),
      totalPrice: Number(totalPrice),
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Pending",
      status: paymentMethod === "COD" ? "Received" : "Pending",
    });

    await newOrder.save();
    await Cart.findOneAndUpdate({ user: userId }, { items: [] }).catch(() => {});

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    console.error("Place order error:", err);
    res.status(500).json({ success: false, message: "Failed to place order" });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product").populate("items.size");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, order });
  } catch (error) {
    console.error("Get order by id error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  placeOrder,
  verifyRazorpayPayment,
  downloadInvoice,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderById,
  createRazorpayOrder,
};
