const Product = require("../Models/productmodel");
const Category = require("../Models/categorymodel");
const Subcategory = require("../Models/subcategory");
const Size = require("../Models/sizemodel");
const Joi = require("joi");
const fs = require("fs");
const mongoose = require("mongoose");

// ✅ Joi Schemas
const productSchema = {
  create: Joi.object({
    productName: Joi.string().min(2).required(),
    gender: Joi.string().valid("Male", "Female", "Unisex").optional(),
    stock: Joi.number().min(0).optional(),
    price: Joi.number().min(0).optional(),
    discount: Joi.number().min(0).optional(),
    discountType: Joi.string().valid("Percentage", "Flat").optional(),
    description: Joi.string().optional(),
    review: Joi.string().optional(),
    category: Joi.string().length(24).hex().required(),
    subcategory: Joi.string().length(24).hex().required(),
    sizes: Joi.array()
      .items(
        Joi.object({
          size: Joi.string().length(24).hex().required(),
          price: Joi.number().min(0).required(),
          stock: Joi.number().min(0).optional(),
        })
      )
      .optional(),
  }),
  update: Joi.object({
    productName: Joi.string().min(2).optional(),
    gender: Joi.string().valid("Male", "Female", "Unisex").optional(),
    stock: Joi.number().min(0).optional(),
    price: Joi.number().min(0).optional(),
    discount: Joi.number().min(0).optional(),
    discountType: Joi.string().valid("Percentage", "Flat").optional(),
    description: Joi.string().optional(),
    review: Joi.string().optional(),
    category: Joi.string().length(24).hex().optional(),
    subcategory: Joi.string().length(24).hex().optional(),
    sizes: Joi.array()
      .items(
        Joi.object({
          size: Joi.string().length(24).hex().required(),
          price: Joi.number().min(0).required(),
          stock: Joi.number().min(0).optional(),
        })
      )
      .optional(),
    removedImages: Joi.alternatives()
      .try(Joi.array().items(Joi.string()), Joi.string())
      .optional(),
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

// calculate stock
const calculateStock = (sizes, topStock) => {
  if (sizes && sizes.length > 0) {
    return sizes.reduce((total, s) => total + (s.stock || 0), 0);
  }
  return topStock || 0;
};

// calculate min price
const calculatePrice = (sizes, topPrice) => {
  if (sizes && sizes.length > 0) {
    return Math.min(...sizes.map((s) => s.price));
  }
  return topPrice || 0;
};

// ➤ Add Product
const addProduct = async (req, res) => {
  try {
    const sizes = parseJSON(req.body.sizes || "[]");

    // validate
    const { error } = productSchema.create.validate({ ...req.body, sizes });
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    await validateRefs(req.body.category, req.body.subcategory, sizes);

    const images = (req.files || []).map((file) => ({
      filename: file.filename,
      filepath: file.path,
    }));

    let newProductData = {
      ...req.body,
      images,
    };

    if (sizes.length > 0) {
      newProductData.sizes = sizes;
      newProductData.price = null;
      newProductData.stock = calculateStock(sizes, null);
    } else {
      newProductData.sizes = [];
      newProductData.stock = req.body.stock || 0;
    }

    const newProduct = new Product(newProductData);
    await newProduct.save(); // trigger pre-save hook for discounts

    const populated = await Product.findById(newProduct._id)
      .populate("category", "categoryname")
      .populate("subcategory", "subcategory")
      .populate("sizes.size", "size");

    res.status(201).json({ message: "Product created", data: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// ➤ Update Product
const updateProduct = async (req, res) => {
  try {
    const sizes = parseJSON(req.body.sizes || "[]");
    let removedImages = parseJSON(req.body.removedImages || "[]");

    // validate
    const { error } = productSchema.update.validate({
      ...req.body,
      sizes,
      removedImages,
    });
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    await validateRefs(req.body.category, req.body.subcategory, sizes);

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // remove old images
    if (removedImages.length > 0) {
      product.images = product.images.filter((img) => {
        if (removedImages.includes(img.filepath)) {
          if (fs.existsSync(img.filepath)) {
            fs.unlinkSync(img.filepath);
          }
          return false;
        }
        return true;
      });
    }

    // new uploaded images
    const newImages = (req.files || []).map((file) => ({
      filename: file.filename,
      filepath: file.path,
    }));

    const allImages = [...product.images, ...newImages];
    const updatedSizes = sizes.length > 0 ? sizes : product.sizes;

    product.set({
      ...req.body,
      sizes: updatedSizes,
      images: allImages,
      stock: calculateStock(updatedSizes, req.body.stock),
      price: calculatePrice(updatedSizes, req.body.price),
    });

    await product.save();

    const updated = await Product.findById(product._id)
      .populate("category", "categoryname")
      .populate("subcategory", "subcategory")
      .populate("sizes.size", "size");

    res.json({ message: "Product updated", data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// ➤ Get All Products
const getAllProducts = async (req, res) => {
  try {
    const { category, subcategory, query } = req.query;
    let filter = {};

    // Category filter
    if (category && category !== "All") filter.category = category;

    // Subcategory filter
    if (subcategory && subcategory !== "All") filter.subcategory = subcategory;

    // Query search: productName OR categoryname OR subcategoryname
    if (query) {
      const q = query.toLowerCase();
      filter.$or = [
        { productName: { $regex: q, $options: "i" } },
        { subcategoryname: { $regex: q, $options: "i" } },
        { "category.categoryname": { $regex: q, $options: "i" } }, // adjust if category is populated
      ];
    }

    const products = await Product.find(filter).populate("category");
    res.json({ success: true, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ➤ Get Product by ID
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

// ➤ Delete Product
const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted", data: deleted });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

module.exports = {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
