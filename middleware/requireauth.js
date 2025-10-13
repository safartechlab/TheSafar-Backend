const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../Utilities/config.js");
const User = require("../Models/usermodel");

const Auth = async (req, res, next) => {
  try {
    // 🔹 Get Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    // 🔹 Check Bearer prefix
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader; // fallback if no Bearer

    if (!token) {
      return res.status(401).json({ message: "Token is empty" });
    }

    // 🔹 Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("JWT verification failed:", err.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // 🔹 Get user from DB
    const dbuser = await User.findById(decoded.id);
    if (!dbuser) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = dbuser; // attach user to request
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Server error in auth" });
  }
};

// Admin middleware
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.usertype === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied: Admin only" });
};

module.exports = { Auth, adminMiddleware };
