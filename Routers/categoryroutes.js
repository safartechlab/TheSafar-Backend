const express = require("express");
const upload = require("../Utilities/upload");
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../Controllers/categorycontroller");

router.post("/addcategory",upload.single("categoryimage"), createCategory);
router.put("/updatecategory/:id",upload.single("categoryimage"), updateCategory);
router.get("/getcategory/:id", getCategoryById);
router.get("/getallcategory", getAllCategories);
router.delete("/deletecategory/:id", deleteCategory);

module.exports = router;
