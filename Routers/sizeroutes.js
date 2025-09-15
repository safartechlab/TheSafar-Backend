const express = require("express");
const router = express.Router();
const {
  addSize,
  getAllSizes,
  getSizeById,
  updateSize,
  deleteSize,
} = require("../Controllers/sizecontroller");

router.post("/addsize",addSize);
router.put("/updatesize/:id", updateSize);
router.get("/getsize/:id", getSizeById);
router.get("/getallsize", getAllSizes);
router.delete("/deletesize/:id", deleteSize);

module.exports = router;
