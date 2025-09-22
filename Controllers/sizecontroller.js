const Size = require("../Models/sizemodel");
const Joi = require("joi");

// ✅ Joi Validation Schemas
const createSizeSchema = Joi.object({
  size: Joi.string().trim().min(1).max(20).required().messages({
    "string.empty": "Size is required",
    "string.min": "Size must be at least 1 character",
    "string.max": "Size must be less than or equal to 20 characters",
  }),
});

const updateSizeSchema = Joi.object({
  size: Joi.string().trim().min(1).max(20).messages({
    "string.min": "Size must be at least 1 character",
    "string.max": "Size must be less than or equal to 20 characters",
  }),
});

// ✅ Add Size
const addSize = async (req, res) => {
  try {
    const { error } = createSizeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { size } = req.body;

    const existingSize = await Size.findOne({ size });
    if (existingSize) {
      return res.status(409).json({ message: "Size already exists" });
    }

    const newSize = new Size({ size });
    await newSize.save();

    res.status(201).json({
      message: "Size added successfully",
      data: newSize,
    });
  } catch (err) {
    console.error("Add Size Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get All Sizes
const getAllSizes = async (req, res) => {
  try {
    const sizes = await Size.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: "Sizes fetched successfully",
      data: sizes,
    });
  } catch (err) {
    console.error("Get Sizes Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get Size By ID
const getSizeById = async (req, res) => {
  try {
    const { id } = req.params;

    const size = await Size.findById(id);
    if (!size) {
      return res.status(404).json({ message: "Size not found" });
    }

    res.status(200).json({
      message: "Size fetched successfully",
      data: size,
    });
  } catch (err) {
    console.error("Get Size By ID Error:", err);
    res.status(500).json({ message: "Internal server error" });
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
    const { size } = req.body;

    const existingSize = await Size.findOne({ size });
    if (existingSize && existingSize._id.toString() !== id) {
      return res.status(409).json({ message: "Size already exists" });
    }

    const updatedSize = await Size.findByIdAndUpdate(
      id,
      { size },
      { new: true, runValidators: true }
    );

    if (!updatedSize) {
      return res.status(404).json({ message: "Size not found" });
    }

    res.status(200).json({
      message: "Size updated successfully",
      data: updatedSize,
    });
  } catch (err) {
    console.error("Update Size Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Delete Size
const deleteSize = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSize = await Size.findByIdAndDelete(id);
    if (!deletedSize) {
      return res.status(404).json({ message: "Size not found" });
    }

    res.status(200).json({
      message: "Size deleted successfully",
      data: deletedSize,
    });
  } catch (err) {
    console.error("Delete Size Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Exports
module.exports = {
  addSize,
  getAllSizes,
  getSizeById,
  updateSize,
  deleteSize,
};
