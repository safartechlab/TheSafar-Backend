const Banner = require("../Models/bannermodel");

// Upload Banner
const bannerupload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Banner image is required" });
    }

    const banners = req.files.map((file) => ({
      filename: file.filename,
      filepath: file.path,
    }));

    const newbanner = new Banner({
      bannerimage: banners,
    });

    await newbanner.save();

    res.status(201).json({
      message: "Banner uploaded successfully",
      data: newbanner,
    });
  } catch (error) {
    console.error("Upload Banner Error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update Banner
const updatebanner = async (req, res) => {
  try {
    const { id } = req.params;
    const updateBanner = { ...req.body };

    if (req.files && req.files.length > 0) {
      updateBanner.bannerimage = req.files.map((file) => ({
        filename: file.filename,
        filepath: file.path,
      }));
    }

    const updatedBanner = await Banner.findByIdAndUpdate(id, updateBanner, {
      new: true,
      runValidators: true,
    });

    if (!updatedBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({
      message: "Banner updated successfully",
      data: updatedBanner,
    });
  } catch (error) {
    console.error("Update Banner Error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get All Banners
const getallbanners = async (req, res) => {
  try {
    const banners = await Banner.find();
    if (!banners || banners.length === 0) {
      return res.status(404).json({ message: "No banners found" });
    }
    res.status(200).json(banners);
  } catch (error) {
    console.error("Error fetching banners:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const deletebanner = async(req,res)=>{
     try {
    const { id } = req.params;

    const deletedBanner = await Banner.findByIdAndDelete(id);
    if (!deletedBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({
      message: "Banner deleted successfully",
    });
  } catch (err) {
    console.error("Delete Banner Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = { bannerupload, updatebanner, getallbanners,deletebanner };
