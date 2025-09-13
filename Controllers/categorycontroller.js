const Category = require("../Models/categorymodel");
const Joi = require("joi");


const createCategorySchema = Joi.object({
  categoryname: Joi.string().min(2).required(),
});

const updateCategorySchema = Joi.object({
  categoryname: Joi.string().min(2).optional(),
});

const createcategory = async (req, res) => {

    // console.log("Reached createcategory controller");
  try {
    const { error } = createCategorySchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { categoryname} = req.body;
    const existingCategory = await Category.findOne({ categoryname });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }
     if (!req.file) {
      return res.status(400).json({ message: "Category image is required" });
    }
    const uploadimage = {
      filename: req.file.filename,
      filepath: req.file.path,
    };

    const newCategory = new Category({
      categoryname,
      categoryimage: uploadimage,
    });
    await newCategory.save();

    res.status(201).json({
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (err) {
    console.error("Error",err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get All Categories
const getallCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json({
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get Category By ID
const getcategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    res.status(200).json({
      message: "Category fetched successfully",
      data: category,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update Category
const updatecategory = async (req, res) => {
  try {
    const { error } = updateCategorySchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { id } = req.params;
    const updateData = { ...req.body };

    if (req.file) {
      updateData.categoryimage = {
        filename: req.file.filename, // Cloudinary public_id
        filepath: req.file.path, // Cloudinary secure_url
      };
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCategory)
      return res.status(404).json({ message: "Category not found" });

    res.status(200).json({
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete Category
const deletecategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory)
      return res.status(404).json({ message: "Category not found" });

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createcategory,
  getallCategories,
  getcategoryById,
  updatecategory,
  deletecategory,
};
