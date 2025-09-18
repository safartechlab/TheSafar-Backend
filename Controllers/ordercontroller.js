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
    order.invoiceNumber || Math.floor(10000000 + Math.random() * 90000000);
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
      <h3>Invoice #${invoiceNumber}</h3>
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
const placeOrder = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product", "productName price stock")
      .populate("items.size", "size");
    if (!cart || !cart.items.length)
      return res.status(400).json({ message: "Cart is empty" });

    for (const it of cart.items) {
      if (!it.size)
        return res
          .status(400)
          .json({ message: `Size required for ${it.product.productName}` });
      if (it.quantity > it.product.stock)
        return res
          .status(400)
          .json({
            message: `Only ${it.product.stock} left for ${it.product.productName}`,
          });
    }

    const items = cart.items.map((i) => ({
      product: i.product._id,
      size: i.size._id,
      quantity: i.quantity,
      price: i.product.price,
      productName: i.product.productName,
      sizeName: i.size.size,
    }));

    const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
    const order = await Order.create({
      user: req.user.id,
      items,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      subtotal,
      discount: 0,
      tax: 0,
      totalPrice: subtotal,
      invoiceNumber: Math.floor(10000000 + Math.random() * 90000000),
    });

    for (const i of cart.items)
      await Product.findByIdAndUpdate(i.product._id, {
        $inc: { stock: -i.quantity },
      });
    cart.items = [];
    await cart.save();

    const { filePath, invoiceNumber } = await generateInvoice(order);
    res.json({
      message: "Order placed",
      order,
      invoicePath: filePath,
      invoiceNumber,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const downloadInvoice = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "username email")
    .populate("items.product", "productName price")
    .populate("items.size", "size");
  if (!order) return res.status(404).json({ message: "Order not found" });
  const { filePath } = await generateInvoice(order.toObject());
  res.download(filePath);
};

const getUserOrders = async (req, res) =>
  res.json(await Order.find({ user: req.user.id }).sort({ createdAt: -1 }));
const getOrderById = async (req, res) =>
  res.json(
    await Order.findById(req.params.id).populate(
      "items.product items.size user"
    )
  );
const getAllOrders = async (req, res) =>
  res.json(
    await Order.find()
      .populate("items.product items.size user")
      .sort({ createdAt: -1 })
  );
const updateOrderStatus = async (req, res) =>
  res.json(
    await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    )
  );
const cancelOrder = async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ message: "Order not found" });
  if (o.user.toString() !== req.user.id)
    return res.status(403).json({ message: "Not authorized" });
  if (o.status === "Delivered")
    return res
      .status(400)
      .json({ message: "Delivered order cannot be cancelled" });
  o.status = "Cancelled";
  await o.save();
  res.json({ message: "Order cancelled", o });
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
