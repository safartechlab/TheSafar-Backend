const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  updateuser,
  getuserById,
  getallusers,
} = require("../Controllers/usercontroller");

router.post("/signup", signup);
router.put("/updateduser/:id", updateuser);
router.post("/login", login);
router.get("/getuser/:id", getuserById);
router.get("/getallusers", getallusers);

module.exports = router;
