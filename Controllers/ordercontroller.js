// controllers/orderController.js
const Order = require("../Models/ordermodel");
const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");
const Size = require("../Models/sizemodel"); // <-- ADDED
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

const mapOrderItems = async (items) => {
  const updatedItems = [];

  for (const it of items) {
    const productId = it.productId || it.product;
    const productDoc = await Product.findById(productId).lean();

    // Extract size info from cart
    const sizeId = it.size || it.sizeId || null;
    const sizeName = it.sizeLabel || it.sizeName || null;

    let finalSizeName = sizeName;

    // If still not found, fetch from product or Size model
    if (!finalSizeName && sizeId) {
      const sizeObj = productDoc?.sizes?.find(
        (s) => String(s._id) === String(sizeId)
      );

      if (sizeObj) {
        finalSizeName = sizeObj.sizeLabel || sizeObj.size || null;
      } else {
        const sizeDoc = await Size.findById(sizeId)
          .lean()
          .catch(() => null);
        finalSizeName = sizeDoc?.size || null;
      }
    }

    updatedItems.push({
      product: productId,
      productName:
        it.productName || productDoc?.productName || productDoc?.name || "",

      image:
        it.image ||
        productDoc?.images?.[0]?.filepath ||
        productDoc?.images?.[0]?.url,

      // 🔥 MOST IMPORTANT FIX
      sizeId: sizeId || null,
      sizeName: finalSizeName || "N/A",

      price: Number(it.price || 0),
      discountedPrice: Number(
        it.discountedPrice != null ? it.discountedPrice : it.price || 0
      ),
      quantity: Number(it.quantity || 1),
      discountPercentage: Number(it.discountPercentage || 0),

      total: Number(
        ((it.discountedPrice || it.price) * (it.quantity || 1)).toFixed(2)
      ),
    });
  }

  return updatedItems;
};

const calculateTotals = (items = []) => {
  let subtotal = 0;
  let finalTotal = 0;

  items.forEach((it) => {
    subtotal += Number(it.price || 0) * Number(it.quantity || 0);
    finalTotal += Number(it.discountedPrice || 0) * Number(it.quantity || 0);
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
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 30px;
      color: #444;
      background: #f4f6f8;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 28px;
      color: #1f2937;
      margin-bottom: 5px;
    }

    .header p {
      font-size: 14px;
      color: #6b7280;
      margin: 2px 0;
    }

    .invoice-title {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin: 30px 0 15px;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 5px;
    }

    .company-info, .customer-info {
      background: #ffffff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      margin-bottom: 25px;
    }

    .company-info h3, .customer-info h3 {
      margin-bottom: 12px;
      color: #1f2937;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    table th {
      background: #3b82f6;
      color: #fff;
      font-weight: 600;
      padding: 12px;
      text-align: left;
    }

    table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    table tr:last-child td {
      border-bottom: none;
    }

    .summary {
      margin-top: 30px;
      padding: 20px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      width: 320px;
      float: right;
      font-size: 16px;
    }

    .summary div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .summary hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 10px 0;
    }

    .summary div.total {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }

    .thanks {
      margin-top: 100px;
      text-align: center;
      font-size: 18px;
      color: #1f2937;
    }

    .thanks small {
      display: block;
      margin-top: 5px;
      color: #6b7280;
    }

    /* Clear float */
    .clearfix::after {
      content: "";
      clear: both;
      display: table;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${COMPANY_NAME}</h1>
    <p>${COMPANY_EMAIL} | ${COMPANY_PHONE}</p>
    <p>${COMPANY_ADDRESS}</p>
  </div>

  <div class="invoice-title">INVOICE #${invoiceNumber}</div>
  <p><strong>Date:</strong> ${moment(order.createdAt).format("DD/MM/YYYY")}</p>

  <div class="customer-info">
    <h3>Shipping Address</h3>
    <p>
      <strong>${order.shippingAddress.name}</strong><br/>
      Phone: ${order.shippingAddress.phone}<br/><br/>
      ${
        order.shippingAddress.houseno
          ? order.shippingAddress.houseno + ", "
          : ""
      }${
    order.shippingAddress.street ? order.shippingAddress.street + ", " : ""
  }${
    order.shippingAddress.landmark ? order.shippingAddress.landmark + ", " : ""
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

  <div class="summary clearfix">
    <div><span>Original Price:</span> <strong>₹${order.subtotal}</strong></div>
    <div><span>Discount:</span> <strong>₹${order.discount}</strong></div>
    <hr/>
    <div class="total"><span>Payable Amount:</span> <strong>₹${
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
    const {
      amount: clientAmount,
      shippingAddress,
      paymentMethod,
      items,
      isBuyNow,
    } = req.body;
    const userId = req.user.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let mappedItems = [];
    let totals = { subtotal: 0, discount: 0, totalPrice: 0 };

    // -----------------------------------------------
    // BUY NOW MODE
    // -----------------------------------------------
    if (isBuyNow && Array.isArray(items) && items.length > 0) {
      mappedItems = await mapOrderItems(items);
      totals = calculateTotals(mappedItems);
    } else {
      // -----------------------------------------------
      // NORMAL CART CHECKOUT
      // -----------------------------------------------
      const cart = await Cart.findOne({ user: userId });

      if (!cart || !cart.items.length) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      mappedItems = await mapOrderItems(cart.items);
      totals = calculateTotals(mappedItems);
    }

    // Amount mismatch check
    if (
      clientAmount != null &&
      Number(clientAmount).toFixed(2) !== totals.totalPrice.toFixed(2)
    ) {
      console.warn(
        `Client amount mismatch. clientAmount=${clientAmount}, serverTotal=${totals.totalPrice}`
      );
    }

    // Razorpay order create
    const rpOrder = await razorpay.orders.create({
      amount: Math.round(totals.totalPrice * 100),
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    });

    // Create order entry
    const newOrder = await Order.create({
      user: userId,
      items: mappedItems,
      shippingAddress: normalizeShippingAddress(shippingAddress),
      subtotal: totals.subtotal,
      discount: totals.discount,
      totalPrice: totals.totalPrice,
      paymentMethod: paymentMethod || "Razorpay",
      razorpayOrderId: rpOrder.id,
      status: "Order Placed",
      paymentStatus: "Pending",
      date: new Date(),
    });

    return res.json({
      success: true,
      key: RAZORPAY_KEY_ID,
      order: rpOrder,
      orderId: newOrder._id,
    });
  } catch (err) {
    console.error("createRazorpayOrder error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
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
      items,
      isBuyNow,
    } = req.body;

    const userId = req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // ----------------------
    // 1. Validate Razorpay signature
    // ----------------------
    const expectedSign = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSign !== razorpay_signature)
      return res.status(400).json({ message: "Invalid payment signature" });

    // ----------------------
    // 2. Map items and calculate totals
    // ----------------------
    let mappedItems = [];
    let totals = {};

    if (isBuyNow && Array.isArray(items) && items.length > 0) {
      mappedItems = await mapOrderItems(items);
      totals = calculateTotals(mappedItems);
    } else {
      const cart = await Cart.findOne({ user: userId });
      mappedItems = await mapOrderItems(cart ? cart.items : []);
      totals = calculateTotals(mappedItems);
    }

    if (!mappedItems.length)
      return res.status(400).json({ message: "No items to process" });

    // ----------------------
    // 3. Validate stock availability
    // ----------------------
    for (const item of mappedItems) {
      const product = await Product.findById(item.product).lean();
      if (!product)
        return res.status(404).json({ message: "Product not found" });

      if (item.sizeId) {
        const sizeObj = product.sizes.find(
          (s) => String(s._id) === String(item.sizeId)
        );
        if (!sizeObj || sizeObj.stock < item.quantity) {
          return res.status(400).json({
            message: `Not enough stock for ${item.productName} (${
              sizeObj?.sizeLabel || "N/A"
            })`,
          });
        }
      } else if ((product.stock || 0) < item.quantity) {
        return res
          .status(400)
          .json({ message: `Not enough stock for ${item.productName}` });
      }
    }

    // ----------------------
    // 4. Create or update order
    // ----------------------
    let order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

    if (!order) {
      order = new Order({
        user: userId,
        items: mappedItems,
        paymentMethod: paymentMethod || "Razorpay",
        shippingAddress: normalizeShippingAddress(checkoutForm),
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
      order.paymentStatus = "Paid";
      order.status = "Received";
      order.subtotal = totals.subtotal;
      order.discount = totals.discount;
      order.totalPrice = totals.totalPrice;
      order.shippingAddress = normalizeShippingAddress(checkoutForm);
      await order.save();
    }

    // ----------------------
    // 5. Decrease stock after order is saved
    // ----------------------
    for (const item of mappedItems) {
      if (item.sizeId) {
        await Product.updateOne(
          { _id: item.product, "sizes._id": item.sizeId },
          { $inc: { "sizes.$.stock": -item.quantity } }
        );
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    // ----------------------
    // 6. Clear cart for normal checkout
    // ----------------------
    if (!isBuyNow) {
      await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and stock updated",
      order,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    // Map items and calculate totals
    const mappedItems = await mapOrderItems(items);
    const totals = calculateTotals(mappedItems);

    // ----------------------
    // 1. Validate stock
    // ----------------------
    for (const item of mappedItems) {
      const product = await Product.findById(item.product).lean();
      if (!product)
        return res.status(404).json({ message: "Product not found" });

      if (item.sizeId) {
        const sizeObj = product.sizes.find(
          (s) => String(s._id) === String(item.sizeId)
        );
        if (!sizeObj || sizeObj.stock < item.quantity) {
          return res.status(400).json({
            message: `Not enough stock for ${item.productName} (${
              sizeObj?.sizeLabel || "N/A"
            })`,
          });
        }
      } else if ((product.stock || 0) < item.quantity) {
        return res
          .status(400)
          .json({ message: `Not enough stock for ${item.productName}` });
      }
    }

    // ----------------------
    // 2. Create order
    // ----------------------
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

    // ----------------------
    // 3. Decrease stock
    // ----------------------
    for (const item of mappedItems) {
      if (item.sizeId) {
        await Product.updateOne(
          { _id: item.product, "sizes._id": item.sizeId },
          { $inc: { "sizes.$.stock": -item.quantity } }
        );
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    // ----------------------
    // 4. Clear cart
    // ----------------------
    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error("placeOrder error:", error);
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
    console.error("downloadInvoice error:", err);
    res.status(500).json({ message: "Invoice error", err });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("items.product") // populate product info for each item
      .populate("user", "username email"); // optional: user info

    res.json({ success: true, orders }); // rejectReason is included automatically
  } catch (err) {
    console.error("getUserOrders error:", err);
    res.status(500).json({ message: "Failed to fetch orders", err });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("user").sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    console.error("getAllOrders error:", err);
    res.status(500).json({ message: "Failed to fetch all orders", err });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const valid = [
      "Received",
      "Confirmed",
      "Shipped",
      "Delivered",
      "Rejected",
      "Cancelled",
    ];

    const { status, rejectReason } = req.body; // <-- extract from request

    if (!valid.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateFields = { status };

    // If rejected, include rejectReason
    if (status === "Rejected") {
      updateFields.rejectReason = rejectReason || "No reason provided";
    } else {
      updateFields.rejectReason = null; // clear any previous reason if not rejected
    }

    const updated = await Order.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ success: true, updated });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    res
      .status(500)
      .json({ message: "Failed to update status", error: err.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("cancelOrder error:", err);
    res.status(500).json({ message: "Failed to cancel order", err });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product")
      .populate("items.sizeId");
    res.json({ success: true, order });
  } catch (err) {
    console.error("getOrderById error:", err);
    res.status(500).json({ message: "Failed to fetch order", err });
  }
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
