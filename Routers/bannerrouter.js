const express = require("express");
const upload = require("../Utilities/upload");
const router = express.Router();
const {
  bannerupload,
  updatebanner,
  getallbanners,
  deletebanner
} = require("../Controllers/bannercontroller");

router.post("/addbanner", upload.array("bannerimage", 5), bannerupload);
router.put("/updatebanner/:id", upload.array("bannerimage", 5), updatebanner);
router.get("/getbanners",getallbanners);
router.delete("/deletebanner/:id", deletebanner);

module.exports = router;
