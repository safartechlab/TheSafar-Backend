const User = require("../Models/usermodel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { JWT_SECRET } = require("../Utilities/config");
const { Sendmail } = require("../Utilities/nodemailer");

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
      "Welcome to our website",
      "<a href='https://google.com'>Google</a>"
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

    res
      .status(200)
      .json({ message: "Login successful", data: user, token: token });
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

const authverify = async(req,res) => {
  return res.status(200).json({
    status: true,
    data: { message: "User is authenticated", data: req.user },
  });
} 

module.exports = { signup, login, updateuser, getuserById, getallusers,authverify };
