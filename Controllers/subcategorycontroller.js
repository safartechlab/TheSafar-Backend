const Subcategory = require("../Models/subcategory");
const Joi = require("joi");

// ✅ Validation Schemas
const createsubcategorySchema = Joi.object({
  subcategory: Joi.string().min(2).required(),
  categoryID: Joi.string().length(24).hex().required(),
});

const updatesubcategorySchema = Joi.object({
  subcategory: Joi.string().min(2).optional(),
  categoryID: Joi.string().length(24).hex().optional(),
});

// ✅ Create Subcategory
const createsubcategory = async (req, res) => {
  try {
    const { error } = createsubcategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { subcategory, categoryID } = req.body;

    const existingSubcategory = await Subcategory.findOne({ subcategory });
    if (existingSubcategory) {
      return res.status(400).json({ message: "Subcategory already exists" });
    }

    const newSubcategory = new Subcategory({
      subcategory,
      categoryID,
    });

    await newSubcategory.save();

    const populated = await newSubcategory.populate(
      "categoryID",
      "categoryname"
    );

    res.status(201).json({
      message: "Subcategory created successfully",
      data: {
        category: populated.categoryID?.categoryname || "Unknown",
        subcategory: populated.subcategory,
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
      .populate("categoryID", "categoryname") // populate only categoryname
      .sort({ createdAt: -1 });

    // format response
    const formatted = subcategories.map((sub) => ({
      subcategory: sub.subcategory,
      category: sub.categoryID?.categoryname || "Unknown", // ✅ fixed
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
    const subcategory = await Subcategory.findById(id).populate(
      "categoryID",
      "categoryname"
    );

    if (!subcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    res.status(200).json({
      message: "Subcategory fetched successfully",
      data: {
        _id: subcategory._id, // include id for reference
        subcategory: subcategory.subcategory,
        category: subcategory.categoryID?.categoryname || "Unknown", // ✅ fixed
        categoryID: subcategory.categoryID?._id || null, // optional, useful for frontend updates
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
    ).populate("categoryID", "categoryname"); // ✅ only fetch category name

    if (!updatedSubcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    // ✅ clean response
    res.status(200).json({
      message: "Subcategory updated successfully",
      data: {
        _id: updatedSubcategory._id,
        subcategory: updatedSubcategory.subcategory,
        category: updatedSubcategory.categoryID?.categoryname || "Unknown",
        categoryID: updatedSubcategory.categoryID?._id || null, // optional
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

    // Find and delete while populating category
    const deletedSubcategory = await Subcategory.findByIdAndDelete(id).populate(
      "categoryID",
      "categoryname"
    );

    if (!deletedSubcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    res.status(200).json({
      message: "Subcategory deleted successfully",
      data: {
        _id: deletedSubcategory._id,
        subcategory: deletedSubcategory.subcategory,
        category: deletedSubcategory.categoryID?.categoryname || "Unknown",
        categoryID: deletedSubcategory.categoryID?._id || null,
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
