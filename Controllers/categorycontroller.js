const Category = require("../Models/categorymodel");
const Joi = require("joi");

// Joi validation schemas
const createCategorySchema = Joi.object({
  categoryname: Joi.string().trim().min(2).max(50).required(),
});

const updateCategorySchema = Joi.object({
  categoryname: Joi.string().trim().min(2).max(50),
});

// ✅ Create Category
const createCategory = async (req, res) => {
  try {
    const { error } = createCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { categoryname } = req.body;

    const existingCategory = await Category.findOne({ categoryname });
    if (existingCategory) {
      return res.status(409).json({ message: "Category already exists" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Category image is required" });
    }

    const categoryImage = {
      filename: req.file.filename,
      filepath: req.file.path,
    };

    const newCategory = new Category({
      categoryname,
      categoryimage: categoryImage,
    });

    await newCategory.save();

    res.status(201).json({
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (err) {
    console.error("Create Category Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Get All Categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (err) {
    console.error("Fetch Categories Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Get Category By ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category fetched successfully",
      data: category,
    });
  } catch (err) {
    console.error("Fetch Category Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Update Category
const updateCategory = async (req, res) => {
  try {
    const { error } = updateCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    if (req.file) {
      updateData.categoryimage = {
        filename: req.file.filename,
        filepath: req.file.path,
      };
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (err) {
    console.error("Update Category Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Delete Category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (err) {
    console.error("Delete Category Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Export Controllers
module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
