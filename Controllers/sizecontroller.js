const Size = require("../Models/sizemodel");
const Joi = require("joi");

// ✅ Validation Schemas
const createSizeSchema = Joi.object({
  size: Joi.string().min(1).required(),
});

const updateSizeSchema = Joi.object({
  size: Joi.string().min(1).optional(),
});

// ✅ Create Size
const addSize = async (req, res) => {
  try {
    const { error } = createSizeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { size } = req.body;

    const existingSize = await Size.findOne({ size });
    if (existingSize) {
      return res.status(400).json({ message: "Size already exists" });
    }

    const newSize = new Size({ size });
    await newSize.save();

    res.status(201).json({
      message: "Size added successfully",
      data: newSize,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
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
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
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
    });

    if (!updatedSize) {
      return res.status(404).json({ message: "Size not found" });
    }

    res.status(200).json({
      message: "Size updated successfully",
      data: updatedSize,
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

    const deletedSize = await Size.findByIdAndDelete(id);

    if (!deletedSize) {
      return res.status(404).json({ message: "Size not found" });
    }

    res.status(200).json({
      message: "Size deleted successfully",
      data: deletedSize,
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
