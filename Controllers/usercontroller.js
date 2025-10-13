const User = require("../Models/usermodel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { JWT_SECRET } = require("../Utilities/config");
const { Sendmail } = require("../Utilities/nodemailer");
const crypto = require("crypto");

const signupSchema = Joi.object({
  usertype: Joi.string().required(),
  username: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  gender: Joi.string().required(),
  contactno: Joi.number().optional(),
  address: Joi.object({
    houseno: Joi.number().optional(),
    society: Joi.string().optional(),
    landmark: Joi.string().optional(),
    area: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.number().optional(),
  }).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateSchema = Joi.object({
  usertype: Joi.string().optional(),
  username: Joi.string().min(3).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  gender: Joi.string().optional(),
  contactno: Joi.number().optional(),
  address: Joi.object({
    houseno: Joi.number().optional(),
    society: Joi.string().optional(),
    landmark: Joi.string().optional(),
    area: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.number().optional(),
  }).optional(),
});

// Signup controller
const signup = async (req, res) => {
  try {
    const { error } = signupSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { usertype, username, email, password, gender, contactno, address } =
      req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      usertype,
      username,
      email,
      password: hashedPassword,
      gender,
      contactno,
      address,
    });

    await newUser.save();
    await Sendmail(
      email,
      "WELCOME TO SAFAR",
      `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; background:white; padding:30px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fdf4e5; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header / Logo -->
        <tr>
          <td style="background:#133547; color:#fdf4e5; padding:20px; text-align:center;">
            <h1 style="margin:0; font-size:24px;">Welcome to SAFAR STORE !!</h1>
          </td>
        </tr>

        <!-- Hero Image -->
        <tr>
          <td style="text-align:center;">
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:25px; color:#333;">
            <p style="font-size:18px; margin:0 0 10px;">Hello,{User.username}</p>
            <p style="font-size:16px; margin:0 0 15px;">We’re absolutely thrilled to have you with us at <strong>Safar Store</strong>. Your journey towards amazing products starts here! 🎉</p>
            <p style="font-size:16px; margin:0 0 20px;">Click the button below to explore our latest collection and exclusive offers.</p>
            <p style="text-align:center; margin:30px 0;">
              <a href="https://google.com" style="background:#133547; color:#fdf4e5; padding:14px 28px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:16px; display:inline-block;">🛒 Start Shopping</a>
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 25px;">
            <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;"/>
          </td>
        </tr>

        <!-- Extra Info -->
        <tr>
          <td style="padding:0 25px 25px; color:#555; font-size:14px; line-height:1.6;">
            <p>✅ Free delivery on orders above $50</p>
            <p>✅ 24/7 Customer Support</p>
            <p>✅ Hassle-free returns</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fdf4e5; padding:20px; text-align:center; font-size:13px; color:#666;">
            <p style="margin:0 0 10px;">Best Regards,<br/><strong>Safar Team</strong></p>
            <p style="margin:0;">📍410 Adinath Arcade, Adajan, Surat, Gujarat, India</p>
            <p style="margin:10px 0 0;">
              <a href="#" style="color:#2563eb; margin:0 8px; text-decoration:none;">Facebook</a> |
              <a href="#" style="color:#2563eb; margin:0 8px; text-decoration:none;">Twitter</a> |
              <a href="#" style="color:#2563eb; margin:0 8px; text-decoration:none;">Instagram</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

  `
    );

    res
      .status(201)
      .json({ message: "User registered successfully", data: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Login controller
const login = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id, email: user.email, usertype: user.usertype },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Remove sensitive fields before sending response
    const {
      password: _,
      resetPasswordOTP,
      resetPasswordExpires,
      ...safeUser
    } = user._doc;

    res.status(200).json({
      message: "Login successful",
      token,
      userID:user._id,
      usertype: user.usertype,
      data: safeUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateuser = async (req, res) => {
  try {
    // Validate request body
    const { error } = updateSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { id } = req.params; // user ID from route param
    const updateData = { ...req.body };

    // If password is being updated, hash it
    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      updateData.password = hashedPassword;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res
      .status(200)
      .json({ message: "User updated successfully", data: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getuserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User fetched successfully", data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getallusers = async (req, res) => {
  try {
    const users = await User.find();
    res
      .status(200)
      .json({ message: "Users fetched successfully", data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const authverify = async (req, res) => {
  return res.status(200).json({
    status: true,
    data: { message: "User is authenticated", data: req.user },
  });
};

// Forgot Password
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // valid for 10 minutes
    await user.save();

    // Send OTP via email
    await Sendmail(
      user.email,
      "Your Password Reset OTP",
      `<p>Hello ${user.username},</p>
       <p>Your OTP for password reset is:</p>
       <h2>${otp}</h2>
       <p>Valid for 10 minutes.</p>`
    );

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    // ✅ Check required fields
    if (!email || !otp || !password) {
      return res
        .status(400)
        .json({ message: "Email, OTP, and password are required" });
    }

    // ✅ Find user with matching email + OTP + not expired
    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // ✅ Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Update user fields
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    await Sendmail(
      user.email,
      "Password Reset Successful",
      `
      <h2>Hello ${user.username},</h2>
      <p>Your password has been reset successfully. 🎉</p>
      <p>If you did not perform this action, please contact our support team immediately.</p>
      <br/>
      <p>Best regards,<br/>Safar Team</p>
      `
    );

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


  const verifyOtp = async (req, res) => {
    try {
      const { email, otp } = req.body;

      // ✅ Check required fields
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      // ✅ Find user with matching email + OTP + not expired
      const user = await User.findOne({
        email,
        resetPasswordOTP: otp,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // ✅ OTP is valid
      return res.status(200).json({ message: "OTP verified successfully" });
    } catch (err) {
      console.error("Verify OTP Error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  };

  const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Optional: verify token and user
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== userId && decoded.usertype !== "admin") {
      return res.status(403).json({ message: "Forbidden: Not allowed to delete this user" });
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  signup,
  login,
  updateuser,
  getuserById,
  getallusers,
  authverify,
  forgotPassword,
  resetPassword,
  verifyOtp,
  deleteUser
};
