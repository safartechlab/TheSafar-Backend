const express = require("express");
const router = express.Router();
const {
  createsubcategory,
  getallsubCategories,
  getsubcategoryById,
  updatesubcategory,
  deleteSubcategory,
} = require("../Controllers/subcategorycontroller");

router.post("/addsubcategory",createsubcategory);
router.put("/updatesubcategory/:id", updatesubcategory);
router.get("/getsubcategory/:id", getsubcategoryById);
router.get("/getallsubcategory", getallsubCategories);
router.delete("/deletesubcategory/:id", deleteSubcategory);

module.exports = router;
