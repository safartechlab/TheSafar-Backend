const Order = require("../Models/ordermodel");
const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const COMPANY_NAME = "TheSafarStore";
const COMPANY_EMAIL = "thesafaronlinestore@gmail.com";
const COMPANY_PHONE = "+91 99795-51975";
const COMPANY_ADDRESS =
  "410, Adinath Arcade,HoneyPark road, Adajan, Surat, Gujarat - 395004";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_ID;
const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const generateInvoiceNumber = () =>
  `INV-${Math.floor(10000 + Math.random() * 90000)}`;

const normalizeShippingAddress = (addr = {}) => ({
  name: addr.name || "",
  phone: addr.phone || "",

  houseno: addr.houseno || addr.houseNo || addr.house || "",
  street: addr.street || addr.address || "",
  landmark: addr.landmark || addr.area || "",

  city: addr.city || "",
  state: addr.state || "",
  pincode: addr.pincode || addr.zip || "",
  country: addr.country || "India",
});

// ------------------ FIXED mapOrderItems ------------------
const Size = require("../Models/sizemodel"); // make sure this import exists

const mapOrderItems = async (items) => {
  const updatedItems = [];

  for (const it of items) {
    let sizeName = "N/A";

    // If sizeId exists, fetch size name from DB
    if (it.sizeId || it.size?._id) {
      const sizeDoc = await Size.findById(it.sizeId || it.size?._id).lean();
      if (sizeDoc) {
        sizeName = sizeDoc.size; // <-- IMPORTANT
      }
    }

    updatedItems.push({
      productId: it.productId || it.product,
      productName: it.productName,
      image: it.image,

      sizeId: it.sizeId || it.size?._id || null,
      sizeName: sizeName, // <-- CORRECTED

      price: it.price,
      discountedPrice: it.discountedPrice || it.price,
      quantity: it.quantity,
      total: (it.discountedPrice || it.price) * it.quantity,
    });
  }

  return updatedItems;
};

const calculateTotals = (items = []) => {
  let subtotal = 0;
  let finalTotal = 0;

  items.forEach((it) => {
    subtotal += Number(it.price) * Number(it.quantity);
    finalTotal += Number(it.discountedPrice) * Number(it.quantity);
  });

  return {
    subtotal: Number(subtotal.toFixed(2)),
    totalPrice: Number(finalTotal.toFixed(2)),
    discount: Number((subtotal - finalTotal).toFixed(2)),
  };
};

const generateInvoice = async (order) => {
  const dir = path.join(__dirname, "../Invoices");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const invoiceNumber = order.invoiceNumber || generateInvoiceNumber();
  order.invoiceNumber = invoiceNumber;
  await order.save().catch(() => {});

  const rows = order.items
    .map(
      (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${it.productName}</strong><br/>
            <small>Size: ${it.sizeName || "N/A"}</small>
          </td>
          <td>${it.quantity}</td>
          <td>₹${it.discountedPrice}</td>
          <td>₹${it.total}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 25px; color: #333; }
        .header { text-align: center; margin-bottom: 20px; }
        .company-info, .customer-info { background: #f8f8f8; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .invoice-title { font-size: 22px; margin: 20px 0 10px 0; border-bottom: 2px solid #000; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        table th { background: #eee; padding: 10px; border: 1px solid #ccc; text-align: left; }
        table td { padding: 10px; border: 1px solid #ddd; }
        .summary { margin-top: 25px; padding: 15px; background: #fafafa; border-radius: 8px; width: 300px; float: right; font-size: 16px; }
        .summary div { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .thanks { margin-top: 60px; text-align: center; font-size: 18px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${COMPANY_NAME}</h1>
        <p>${COMPANY_EMAIL} | ${COMPANY_PHONE}</p>
        <p>${COMPANY_ADDRESS}</p>
      </div>

      <div class="invoice-title">INVOICE #${invoiceNumber}</div>
      <p><strong>Date:</strong> ${moment(order.createdAt).format(
        "DD/MM/YYYY"
      )}</p>

      <div class="customer-info">
        <h3>Shipping Address</h3>
        <p>
          <strong>${order.shippingAddress.name}</strong><br/>
          Phone: ${order.shippingAddress.phone}<br/><br/>
          ${
            order.shippingAddress.houseno
              ? order.shippingAddress.houseno + ", "
              : ""
          }
          ${
            order.shippingAddress.street
              ? order.shippingAddress.street + ", "
              : ""
          }
          ${
            order.shippingAddress.landmark
              ? order.shippingAddress.landmark + ", "
              : ""
          }<br/>
          ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${
    order.shippingAddress.pincode
  }<br/>
          ${order.shippingAddress.country}
        </p>
      </div>

      <h3>Order Items</h3>

      <table>
        <tr>
          <th>#</th>
          <th>Product</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
        ${rows}
      </table>

      <div class="summary">
        <div><span>Original Price:</span> <strong>₹${
          order.subtotal
        }</strong></div>
        <div><span>Discount:</span> <strong>₹${order.discount}</strong></div>
        <hr/>
        <div style="font-size:18px;"><span>Payable Amount:</span> <strong>₹${
          order.totalPrice
        }</strong></div>
      </div>

      <div class="thanks">
        Thank you for shopping with us 🙏<br/>
        <small>Your support means a lot!</small>
      </div>

    </body>
    </html>
  `;

  const filePath = path.join(dir, `${invoiceNumber}.pdf`);
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: filePath, format: "A4", printBackground: true });
  await browser.close();

  return { filePath, invoiceNumber };
};

// ------------------- Other Controllers -------------------

const createRazorpayOrder = async (req, res) => {
  try {
    const { amount: clientAmount, shippingAddress, paymentMethod } = req.body;
    const userId = req.user.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const cart = await Cart.findOne({ user: userId });
    if (!cart || !cart.items.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    const mappedItems = await mapOrderItems(cart.items);
    const totals = calculateTotals(mappedItems);

    if (
      clientAmount != null &&
      Number(clientAmount).toFixed(2) !== totals.totalPrice.toFixed(2)
    ) {
      console.warn(
        `Client amount mismatch. clientAmount=${clientAmount}, serverTotal=${totals.totalPrice}`
      );
    }

    const rpOrder = await razorpay.orders.create({
      amount: Math.round(Number(totals.totalPrice) * 100),
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    });

    const newOrder = await Order.create({
      user: userId,
      items: mappedItems,
      shippingAddress: normalizeShippingAddress(
        shippingAddress || cart.shippingAddress || {}
      ),
      subtotal: totals.subtotal,
      discount: totals.discount,
      totalPrice: totals.totalPrice,
      paymentMethod: paymentMethod || "Razorpay",
      razorpayOrderId: rpOrder.id,
      status: "Order Placed",
      paymentStatus: "Pending",
      date: new Date(),
    });

    res.json({
      success: true,
      key: RAZORPAY_KEY_ID,
      order: rpOrder,
      orderId: newOrder._id,
    });
  } catch (err) {
    console.error("createRazorpayOrder error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      checkoutForm,
      paymentMethod,
    } = req.body;
    const userId = req.user.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const expectedSign = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSign !== razorpay_signature)
      return res.status(400).json({ message: "Invalid payment signature" });

    const cart = await Cart.findOne({ user: userId });
    const mappedItems = await mapOrderItems(cart ? cart.items : []);
    const totals = calculateTotals(mappedItems);

    let order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!order) {
      order = new Order({
        user: userId,
        items: mappedItems,
        paymentMethod: paymentMethod || "Razorpay",
        shippingAddress: normalizeShippingAddress(
          checkoutForm || (cart && cart.shippingAddress) || {}
        ),
        subtotal: totals.subtotal,
        discount: totals.discount,
        totalPrice: totals.totalPrice,
        razorpayOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        paymentStatus: "Paid",
        status: "Received",
        date: new Date(),
      });
      await order.save();
    } else {
      order.items = mappedItems;
      order.paymentId = razorpay_payment_id;
      order.paymentMethod = paymentMethod || order.paymentMethod;
      order.paymentStatus = "Paid";
      order.status = "Received";
      order.subtotal = totals.subtotal;
      order.discount = totals.discount;
      order.totalPrice = totals.totalPrice;
      order.shippingAddress = normalizeShippingAddress(
        checkoutForm || (cart && cart.shippingAddress) || order.shippingAddress
      );
      order.date = new Date();
      await order.save();
    }
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });

    res.status(200).json({
      success: true,
      message: "Payment verified",
      order,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      message: "Payment verification failed",
      error: error.message || error,
    });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    const mappedItems = await mapOrderItems(items);
    const totals = calculateTotals(mappedItems);

    const order = await Order.create({
      user: req.user.id,
      items: mappedItems,
      shippingAddress: normalizeShippingAddress(shippingAddress),
      subtotal: totals.subtotal,
      discount: totals.discount,
      totalPrice: totals.totalPrice,
      paymentMethod: "COD",
      paymentStatus: "Pending",
      status: "Received",
      date: new Date(),
    });

    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: "Failed to place order", error });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const { filePath, invoiceNumber } = await generateInvoice(order);

    res.download(filePath, `${invoiceNumber}.pdf`);
  } catch (err) {
    res.status(500).json({ message: "Invoice error", err });
  }
};

const getUserOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, orders });
};

const getAllOrders = async (req, res) => {
  const orders = await Order.find().populate("user").sort({ createdAt: -1 });
  res.json({ success: true, orders });
};

const updateOrderStatus = async (req, res) => {
  const valid = [
    "Received",
    "Confirmed",
    "Shipped",
    "Delivered",
    "Rejected",
    "Cancelled",
  ];
  if (!valid.includes(req.body.status))
    return res.status(400).json({ message: "Invalid status" });

  const updated = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  res.json({ success: true, updated });
};

const cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.status === "Delivered")
    return res
      .status(400)
      .json({ message: "Delivered order can't be cancelled" });

  order.status = "Cancelled";
  await order.save();

  for (const item of order.items) {
    if (item.sizeId) {
      await Product.updateOne(
        { _id: item.product, "sizes._id": item.sizeId },
        { $inc: { "sizes.$.stock": item.quantity } }
      );
    } else {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }
  }

  res.json({ success: true, order });
};

const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("items.product")
    .populate("items.sizeId");
  res.json({ success: true, order });
};

module.exports = {
  placeOrder,
  verifyRazorpayPayment,
  createRazorpayOrder,
  downloadInvoice,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderById,
};
