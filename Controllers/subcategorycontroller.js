const Subcategory = require("../Models/subcategory");
const Joi = require("joi");

// Validation schemas (without enforcing sizes)
const createsubcategorySchema = Joi.object({
  subcategory: Joi.string().min(2).required(),
  category: Joi.string().length(24).hex().required(),
  sizes: Joi.array().items(Joi.string().length(24).hex()).optional(),
});

const updatesubcategorySchema = Joi.object({
  subcategory: Joi.string().min(2).optional(),
  category: Joi.string().length(24).hex().optional(),
  sizes: Joi.array().items(Joi.string().length(24).hex()).optional(),
});

// Helper to format subcategory
const formatSubcategory = (sub) => ({
  _id: sub._id,
  subcategory: sub.subcategory,
  categoryID: sub.category?._id || null,
  category: sub.category?.categoryname || "Unknown",
  sizes:
    sub.sizes?.map((s) => ({
      _id: s._id,
      size: s.size,
    })) || [],
});

// ✅ Create Subcategory
const createsubcategory = async (req, res) => {
  try {
    const { error } = createsubcategorySchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { subcategory, category, sizes } = req.body;

    const existing = await Subcategory.findOne({ subcategory });
    if (existing)
      return res.status(400).json({ message: "Subcategory already exists" });

    // Sizes are optional — only include if provided
    const newSubcategory = new Subcategory({
      subcategory,
      category,
      sizes: sizes || [],
    });
    await newSubcategory.save();

    const populated = await newSubcategory.populate([
      { path: "category", select: "categoryname" },
      { path: "sizes", select: "size" },
    ]);

    res.status(201).json({
      message: "Subcategory created successfully",
      data: formatSubcategory(populated),
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update Subcategory
const updatesubcategory = async (req, res) => {
  try {
    const { error } = updatesubcategorySchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { id } = req.params;

    // If sizes is not provided, it will not be updated
    const updateData = { ...req.body };
    if (!updateData.sizes) delete updateData.sizes;

    const updatedSubcategory = await Subcategory.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("category", "categoryname")
      .populate("sizes", "size");

    if (!updatedSubcategory)
      return res.status(404).json({ message: "Subcategory not found" });

    res.status(200).json({
      message: "Subcategory updated successfully",
      data: formatSubcategory(updatedSubcategory),
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get All Subcategories
const getallsubCategories = async (req, res) => {
  try {
    const subcategories = await Subcategory.find()
      .populate("category", "categoryname")
      .populate("sizes", "size")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Subcategories fetched successfully",
      data: subcategories.map(formatSubcategory),
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get Subcategory By ID
const getsubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const subcategory = await Subcategory.findById(id)
      .populate("category", "categoryname")
      .populate("sizes", "size");

    if (!subcategory)
      return res.status(404).json({ message: "Subcategory not found" });

    res.status(200).json({
      message: "Subcategory fetched successfully",
      data: formatSubcategory(subcategory),
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete Subcategory
const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSubcategory = await Subcategory.findByIdAndDelete(id)
      .populate("category", "categoryname")
      .populate("sizes", "size");

    if (!deletedSubcategory)
      return res.status(404).json({ message: "Subcategory not found" });

    res.status(200).json({
      message: "Subcategory deleted successfully",
      data: formatSubcategory(deletedSubcategory),
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createsubcategory,
  getallsubCategories,
  getsubcategoryById,
  updatesubcategory,
  deleteSubcategory,
};
