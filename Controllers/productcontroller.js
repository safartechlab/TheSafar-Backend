const Product = require("../Models/productmodel");
const Category = require("../Models/categorymodel");
const Subcategory = require("../Models/subcategory");
const Size = require("../Models/sizemodel");
const Joi = require("joi");

// ✅ Joi Schemas
const productSchema = {
  create: Joi.object({
    productName: Joi.string().min(2).required(),
    gender: Joi.string().valid("Male", "Female", "Unisex").required(),
    price: Joi.number().min(0).required(),
    discount: Joi.number().min(0).optional(),
    discountType: Joi.string().valid("Percentage", "Flat").optional(),
    description: Joi.string().optional(),
    review: Joi.string().optional(),
    category: Joi.string().length(24).hex().required(),
    subcategory: Joi.string().length(24).hex().required(),
    sizes: Joi.array().items(
      Joi.object({
        size: Joi.string().length(24).hex().required(),
        price: Joi.number().min(0).required(),
      })
    ).optional(),
  }),
  update: Joi.object({
    productName: Joi.string().min(2).optional(),
    gender: Joi.string().valid("Male", "Female", "Unisex").optional(),
    price: Joi.number().min(0).optional(),
    discount: Joi.number().min(0).optional(),
    discountType: Joi.string().valid("Percentage", "Flat").optional(),
    description: Joi.string().optional(),
    review: Joi.string().optional(),
    category: Joi.string().length(24).hex().optional(),
    subcategory: Joi.string().length(24).hex().optional(),
    sizes: Joi.array().items(
      Joi.object({
        size: Joi.string().length(24).hex().required(),
        price: Joi.number().min(0).required(),
      })
    ).optional(),
  }),
};

// ✅ Helpers
const parseJSON = (field) => {
  if (!field) return [];
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      throw new Error("Invalid JSON format");
    }
  }
  return field;
};

const validateRefs = async (category, subcategory, sizes = []) => {
  if (category && !(await Category.findById(category))) {
    throw new Error("Invalid category");
  }
  if (subcategory && !(await Subcategory.findById(subcategory))) {
    throw new Error("Invalid subcategory");
  }
  for (let s of sizes) {
    if (!(await Size.findById(s.size))) {
      throw new Error(`Invalid size ID: ${s.size}`);
    }
  }
};

// ✅ Controller
const addProduct = async (req, res) => {
  try {
    const sizes = parseJSON(req.body.sizes);
    const { error } = productSchema.create.validate({ ...req.body, sizes });
    if (error) return res.status(400).json({ message: error.details[0].message });

    await validateRefs(req.body.category, req.body.subcategory, sizes);

    const images = (req.files || []).map((file) => ({
      filename: file.filename,
      filepath: file.path,
    }));

    const newProduct = await Product.create({
      ...req.body,
      sizes,
      images,
    });

    const populated = await Product.findById(newProduct._id)
      .populate("category", "categoryname")
      .populate("subcategory", "subcategory")
      .populate("sizes.size", "size");

    res.status(201).json({ message: "Product created", data: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "categoryname")
      .populate("subcategory", "subcategory")
      .populate("sizes.size", "size")
      .sort({ createdAt: -1 });

    res.json({ message: "Products fetched", count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "categoryname")
      .populate("subcategory", "subcategory")
      .populate("sizes.size", "size");

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product fetched", data: product });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const sizes = parseJSON(req.body.sizes);
    const { error } = productSchema.update.validate({ ...req.body, sizes });
    if (error) return res.status(400).json({ message: error.details[0].message });

    await validateRefs(req.body.category, req.body.subcategory, sizes);

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const newImages = (req.files || []).map((file) => ({
      filename: file.filename,
      filepath: file.path,
    }));

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, sizes, images: [...product.images, ...newImages] },
      { new: true, runValidators: true }
    )
      .populate("category", "categoryname")
      .populate("subcategory", "subcategory")
      .populate("sizes.size", "size");

    res.json({ message: "Product updated", data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted", data: deleted });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

module.exports = { addProduct, getAllProducts, getProductById, updateProduct, deleteProduct };
