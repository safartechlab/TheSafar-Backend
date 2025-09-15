const Size = require("../Models/sizemodel");
const Joi = require("joi");

// ✅ Validation Schemas
const createSizeSchema = Joi.object({
  size: Joi.string().min(1).required(),
  subcategoryID: Joi.string().length(24).hex().required(),
});

const updateSizeSchema = Joi.object({
  size: Joi.string().min(1).optional(),
  subcategoryID: Joi.string().length(24).hex().optional(),
});

// ✅ Create Size
const addSize = async (req, res) => {
  try {
    const { error } = createSizeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { size, subcategoryID } = req.body;

    const existingSize = await Size.findOne({ size, subcategoryID });
    if (existingSize) {
      return res.status(400).json({ message: "Size already exists for this subcategory" });
    }

    const newSize = new Size({ size, subcategoryID });
    await newSize.save();

    const populated = await newSize.populate("subcategoryID", "subcategory");

    res.status(201).json({
      message: "Size added successfully",
      data: {
        _id: populated._id,
        size: populated.size,
        subcategory: populated.subcategoryID?.subcategory || "Unknown",
        subcategoryID: populated.subcategoryID?._id || null,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get All Sizes
const getAllSizes = async (req, res) => {
  try {
    const sizes = await Size.find()
      .populate("subcategoryID", "subcategory")
      .sort({ createdAt: -1 });

    const formatted = sizes.map((s) => ({
      _id: s._id,
      size: s.size,
      subcategory: s.subcategoryID?.subcategory || "Unknown",
      subcategoryID: s.subcategoryID?._id || null,
    }));

    res.status(200).json({
      message: "Sizes fetched successfully",
      data: formatted,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get Size By ID
const getSizeById = async (req, res) => {
  try {
    const { id } = req.params;
    const size = await Size.findById(id).populate("subcategoryID", "subcategory");

    if (!size) {
      return res.status(404).json({ message: "Size not found" });
    }

    res.status(200).json({
      message: "Size fetched successfully",
      data: {
        _id: size._id,
        size: size.size,
        subcategory: size.subcategoryID?.subcategory || "Unknown",
        subcategoryID: size.subcategoryID?._id || null,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update Size
const updateSize = async (req, res) => {
  try {
    const { error } = updateSizeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { id } = req.params;

    const updatedSize = await Size.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate("subcategoryID", "subcategory");

    if (!updatedSize) {
      return res.status(404).json({ message: "Size not found" });
    }

    res.status(200).json({
      message: "Size updated successfully",
      data: {
        _id: updatedSize._id,
        size: updatedSize.size,
        subcategory: updatedSize.subcategoryID?.subcategory || "Unknown",
        subcategoryID: updatedSize.subcategoryID?._id || null,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete Size
const deleteSize = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSize = await Size.findByIdAndDelete(id).populate("subcategoryID", "subcategory");

    if (!deletedSize) {
      return res.status(404).json({ message: "Size not found" });
    }

    res.status(200).json({
      message: "Size deleted successfully",
      data: {
        _id: deletedSize._id,
        size: deletedSize.size,
        subcategory: deletedSize.subcategoryID?.subcategory || "Unknown",
        subcategoryID: deletedSize.subcategoryID?._id || null,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addSize,
  getAllSizes,
  getSizeById,
  updateSize,
  deleteSize,
};
