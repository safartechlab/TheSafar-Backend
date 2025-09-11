const express = require("express");
const upload = require("../Utilities/upload");
const router = express.Router();
const {
  createcategory,
  getallCategories,
  getcategoryById,
  updatecategory,
  deletecategory,
} = require("../Controllers/categorycontroller");

router.post("/addcategory",upload.single("categoryimage"), createcategory);
router.put("/updatecategory/:id",upload.single("categoryimage"), updatecategory);
router.get("/getcategory/:id", getcategoryById);
router.get("/getallcategory", getallCategories);
router.delete("/deletecategory/:id", deletecategory);

module.exports = router;
