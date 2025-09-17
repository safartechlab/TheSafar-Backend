const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../Utilities/config.js");
const User = require("../Models/usermodel");

const Auth = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ message: "Token is empty" });
    }

    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const dbuser = await User.findById(decoded.id);

    if (!dbuser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = dbuser;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.usertype === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied: Admin only" });
};

module.exports = { Auth, adminMiddleware };
