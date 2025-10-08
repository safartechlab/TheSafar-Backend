const Product = require("../Models/productmodel");
const Category = require("../Models/categorymodel");
const Subcategory = require("../Models/subcategory");
const Size = require("../Models/sizemodel");
const Joi = require("joi");
const fs = require("fs");
<<<<<<< HEAD
=======


>>>>>>> d19b6ad42c61ae35b61137f3919dad9904b681ae

// ✅ Joi Schemas
const productSchema = {
  create: Joi.object({
    productName: Joi.string().min(2).required(),
    gender: Joi.string().valid("Male", "Female", "Unisex").required(),
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
<<<<<<< HEAD
    removedImages: Joi.alternatives().try(
      Joi.array().items(Joi.string()), // already array
      Joi.string() // or JSON string from frontend
    ).optional(),

=======
    removedImages: Joi.alternatives()
      .try(Joi.array().items(Joi.string()), Joi.string())
      .optional(),
>>>>>>> d19b6ad42c61ae35b61137f3919dad9904b681ae
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

<<<<<<< HEAD

=======
// ➤ Update Product
>>>>>>> d19b6ad42c61ae35b61137f3919dad9904b681ae
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
<<<<<<< HEAD
    if (error) {
=======
    if (error)
>>>>>>> d19b6ad42c61ae35b61137f3919dad9904b681ae
      return res.status(400).json({ message: error.details[0].message });
    }

    await validateRefs(req.body.category, req.body.subcategory, sizes);

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

<<<<<<< HEAD
    // remove old images if requested
=======
    // remove old images
>>>>>>> d19b6ad42c61ae35b61137f3919dad9904b681ae
    if (removedImages.length > 0) {
      product.images = product.images.filter((img) => {
        if (removedImages.includes(img.filepath)) {
          if (fs.existsSync(img.filepath)) {
<<<<<<< HEAD
            fs.unlinkSync(img.filepath); // delete file
=======
            fs.unlinkSync(img.filepath);
>>>>>>> d19b6ad42c61ae35b61137f3919dad9904b681ae
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
<<<<<<< HEAD

=======
>>>>>>> d19b6ad42c61ae35b61137f3919dad9904b681ae
    const updatedSizes = sizes.length > 0 ? sizes : product.sizes;

    product.set({
      ...req.body,
      sizes: updatedSizes,
      images: allImages,
      stock: calculateStock(updatedSizes, req.body.stock),
      price: calculatePrice(updatedSizes, req.body.price),
    });

<<<<<<< HEAD
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    )
=======
    await product.save();

    const updated = await Product.findById(product._id)
>>>>>>> d19b6ad42c61ae35b61137f3919dad9904b681ae
      .populate("category", "categoryname")
      .populate("subcategory", "subcategory")
      .populate("sizes.size", "size");

    res.json({ message: "Product updated", data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

<<<<<<< HEAD

// Get All Products
=======
// ➤ Get All Products
>>>>>>> d19b6ad42c61ae35b61137f3919dad9904b681ae
const getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }
    const products = await Product.find(filter)
      .populate("category", "categoryname")
      .populate("subcategory", "subcategory")
      .populate("sizes.size", "size")
      .sort({ createdAt: -1 });

    res.json({
      message: "Products fetched",
      count: products.length,
      data: products,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
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
