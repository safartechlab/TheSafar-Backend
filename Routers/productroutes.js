const express = require("express");
const upload = require("../Utilities/upload");
const router = express.Router();
const {
addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../Controllers/productcontroller");

router.post("/addproduct", upload.array("images", 5), addProduct);
router.put("/updateproduct/:id",upload.array("images", 5), updateProduct);
router.get("/getproduct/:id", getProductById);
router.get("/getallproduct", getAllProducts);
router.delete("/deleteproduct/:id", deleteProduct);

module.exports = router;
