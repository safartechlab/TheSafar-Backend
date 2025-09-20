const Subcategory = require("../Models/subcategory");
const Joi = require("joi");

// ✅ Validation Schemas
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

// ✅ Create Subcategory
const createsubcategory = async (req, res) => {
  try {
    const { error } = createsubcategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { subcategory, category, sizes } = req.body;

    const existingSubcategory = await Subcategory.findOne({ subcategory });
    if (existingSubcategory) {
      return res.status(400).json({ message: "Subcategory already exists" });
    }

    const newSubcategory = new Subcategory({
      subcategory,
      category,
      sizes,
    });

    await newSubcategory.save();

    const populated = await newSubcategory.populate([
      { path: "category", select: "categoryname"},
      { path: "sizes", select: "sizename" },
    ]); 

    res.status(201).json({
      message: "Subcategory created successfully",
      data: {
        _id: populated._id,
        subcategory: populated.subcategory,
        category: populated.category?.categoryname || "Unknown",
        categoryID: populated.category?._id || null,
        sizes: populated.sizes?.map((s) => ({
          _id: s._id,
          sizename: s.sizename,
        })),
      },
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
      .populate("sizes", "sizename")
      .sort({ createdAt: -1 });

    const formatted = subcategories.map((sub) => ({
      _id: sub._id,
      subcategory: sub.subcategory,
      categoryID: sub.category?._id || null,
      category: sub.category?.categoryname || "Unknown",
      sizes: sub.sizes?.map((s) => ({
        _id: s._id,
        sizename: s.sizename,
      })),
    }));

    res.status(200).json({
      message: "Subcategories fetched successfully",
      data: formatted,
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
      .populate("sizes", "sizename");

    if (!subcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    res.status(200).json({
      message: "Subcategory fetched successfully",
      data: {
        _id: subcategory._id,
        subcategory: subcategory.subcategory,
        category: subcategory.category?.categoryname || "Unknown",
        categoryID: subcategory.category?._id || null,
        sizes: subcategory.sizes?.map((s) => ({
          _id: s._id,
          sizename: s.sizename,
        })),
      },
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
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    const updatedSubcategory = await Subcategory.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("category", "categoryname")
      .populate("sizes", "sizename");

    if (!updatedSubcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    res.status(200).json({
      message: "Subcategory updated successfully",
      data: {
        _id: updatedSubcategory._id,
        subcategory: updatedSubcategory.subcategory,
        category: updatedSubcategory.category?.categoryname || "Unknown",
        categoryID: updatedSubcategory.category?._id || null,
        sizes: updatedSubcategory.sizes?.map((s) => ({
          _id: s._id,
          sizename: s.sizename,
        })),
      },
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
      .populate("sizes", "sizename");

    if (!deletedSubcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    res.status(200).json({
      message: "Subcategory deleted successfully",
      data: {
        _id: deletedSubcategory._id,
        subcategory: deletedSubcategory.subcategory,
        category: deletedSubcategory.category?.categoryname || "Unknown",
        categoryID: deletedSubcategory.category?._id || null,
        sizes: deletedSubcategory.sizes?.map((s) => ({
          _id: s._id,
          sizename: s.sizename,
        })),
      },
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
