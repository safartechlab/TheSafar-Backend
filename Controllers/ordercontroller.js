const Order = require("../Models/ordermodel");
const Cart = require("../Models/cartmodel");
const Product = require("../Models/productmodel");
const Size = require("../Models/sizemodel");
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

  const logoPath = path.join(__dirname, "../assets/banner.png");
  const logoUrl = `file://${logoPath}`;

  const html = `
  <html>
  <head>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 30px;
        color: #333;
      }
      .header {
        text-align: center;
        background: linear-gradient(135deg, #4facfe, #033045);
        color: #ffff;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 20px;
      }
      .header h1 {
        margin: 0;
        font-size: 32px;
        letter-spacing: 1px;
      }
      .info-section {
        display: flex;
        justify-content: space-between;
        margin: 20px 0;
        font-size: 14px;
      }
      .info-left p, .info-right p {
        margin: 3px 0;
      }
      .info-left strong {
        color: #0077b6;
      }
      .shipping {
        margin: 20px 0;
        font-size: 14px;
      }
      .shipping h4 {
        margin-bottom: 5px;
        color: #0077b6;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        font-size: 14px;
      }
      th {
        background: #0077b6;
        color: #fff;
        padding: 10px;
        text-transform: uppercase;
      }
      td {
        border: 1px solid #ddd;
        padding: 10px;
        text-align: center;
      }
      tr:nth-child(even) { background: #f9f9f9; }
      .totals {
        margin-top: 20px;
        float: right;
        width: 40%;
        border: 1px solid #ddd;
        border-radius: 8px;
      }
      .totals table {
        width: 100%;
        border: none;
      }
      .totals td {
        padding: 10px;
        text-align: right;
        border: none;
      }
      .totals tr:last-child td {
        font-weight: bold;
        font-size: 16px;
        border-top: 2px solid #0077b6;
      }
      .footer {
        margin-top: 50px;
        text-align: center;
        font-size: 12px;
        color: #777;
      }
    </style>
  </head>
  <body>
    <!-- Header -->
    <div class="header">
      <h1>TheSafarStore</h1>
    </div>

  <!-- Invoice Info + Company Info -->
  <div class="info-section">
    <div class="info-left">
      <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
      <p><strong>Date:</strong> ${moment(order.createdAt).format(
        "DD/MM/YYYY"
      )}</p>
      <p><strong>Payment:</strong> ${order.paymentMethod}</p>
    </div>
    <div class="info-right">
      <p><strong>Office Address:</strong></p>
      <p>410, Adinath Arcade, HoneyPark Road, Adajan, Surat - 395009</p>
      <p>📞 +91-9979781975</p>
      <p>✉️ thesafaronlinestore@gmail.com</p>
    </div>
  </div>

  <!-- Shipping -->
  <div class="shipping">
    <h4>Shipping Address</h4>
    <p>
      ${order.shippingAddress?.houseno || ""}, 
      ${order.shippingAddress?.street || ""}, 
      ${order.shippingAddress?.landmark || ""},<br>
      ${order.shippingAddress?.city}, 
      ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}
    </p>
  </div>

  <!-- Items Table -->
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
        (it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${it.productName}</td>
        <td>${it.sizeName || "N/A"}</td>
        <td>${it.quantity}</td>
        <td>₹${it.price}</td>
        <td>₹${it.price * it.quantity}</td>
      </tr>
    `
      )
      .join("")}
  </table>

  <!-- Totals -->
  <div class="totals">
    <table>
      <tr>
        <td>Subtotal:</td>
        <td>₹${order.subtotal}</td>
      </tr>
      <tr>
        <td>Discount:</td>
        <td>- ₹${order.discount}</td>
      </tr>
      <tr>
        <td>Tax:</td>
        <td>+ ₹${order.tax}</td>
      </tr>
      <tr>
        <td>Total:</td>
        <td>₹${order.totalPrice}</td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Thank you for shopping with <strong>TheSafarStore</strong>! 💙</p>
    <p>For support, contact us at support@thesafarstore.com</p>
  </div>

</body>
</html>
`;

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: filePath, format: "A4", printBackground: true });
  await browser.close();

  return { filePath, invoiceNumber };
};

// ================== Place Order ==================
const placeOrder = async (req, res) => {
  try {
    let items = [];

    const orderItems =
      req.body.items && req.body.items.length > 0
        ? req.body.items
        : (await Cart.findOne({ user: req.user.id }).populate("items.product"))
            ?.items;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No items to place order" });
    }

    for (const it of orderItems) {
      const product = await Product.findById(it.product).lean();
      if (!product) return res.status(400).json({ message: "Invalid product" });

      let selectedSize = null;
      if (it.size && product.sizes && product.sizes.length > 0) {
        selectedSize = product.sizes.find((s) => s.size.equals(it.size));
        if (!selectedSize) {
          return res.status(400).json({ message: "Invalid size" });
        }

        if (it.quantity > selectedSize.stock) {
          return res.status(400).json({
            message: `Only ${selectedSize.stock} left for ${product.productName}`,
          });
        }

        await Product.updateOne(
          { _id: product._id, "sizes.size": it.size },
          { $inc: { "sizes.$.stock": -it.quantity } }
        );

        // ✅ fetch sizeName from Size model
        const sizeDoc = await Size.findById(selectedSize.size).lean();
        items.push({
          product: product._id,
          size: selectedSize?.size || null,
          quantity: it.quantity,
          price: selectedSize.price,
          productName: product.productName,
          sizeName: sizeDoc?.size || null,
        });
      } else {
        if (it.quantity > product.stock) {
          return res.status(400).json({
            message: `Only ${product.stock} left for ${product.productName}`,
          });
        }
        await Product.findByIdAndUpdate(product._id, {
          $inc: { stock: -it.quantity },
        });

        items.push({
          product: product._id,
          size: null,
          quantity: it.quantity,
          price: product.price,
          productName: product.productName,
          sizeName: null,
        });
      }
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

    if (!req.body.items) {
      const cart = await Cart.findOne({ user: req.user.id });
      cart.items = [];
      await cart.save();
    }

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

// ================== Download Invoice ==================
const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product", "productName price")
      .populate("items.size");

    if (!order) return res.status(404).json({ message: "Order not found" });

    const { filePath } = await generateInvoice(order);
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================== Get User Orders ==================
const getUserOrders = async (req, res) => {
  try {
    let orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("items.product", "productName")
      .populate("items.size");

    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================== Get Order By ID ==================
const getOrderById = async (req, res) => {
  try {
    const orders = await Order.find({ "user._id": req.params.userId })
      .populate("items.product")
      .populate("items.size")
      .populate("user");

    if (!orders.length)
      return res.status(404).json({ message: "No orders found" });

    res.status(200).json({ message: "Orders fetched successfully", orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================== Get All Orders (Admin) ==================
const getAllOrders = async (req, res) => {
  try {
    let orders = await Order.find()
      .populate("items.product")
      .populate("items.size")
      .populate("user")
      .sort({ createdAt: -1 });

    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================== Update Order Status (Admin) ==================
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params; // order ID
    const { status } = req.body; // new status (e.g. 'Shipped')

    const validStatuses = [
      "Received",
      "Confirmed",
      "Rejected",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      message: "Order status updated successfully",
      updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ================== Cancel Order (User) ==================
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

    for (const i of order.items) {
      if (i.size) {
        await Product.updateOne(
          { _id: i.product, "sizes.size": i.size }, // match by size reference
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
