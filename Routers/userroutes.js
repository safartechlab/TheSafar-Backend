const express = require("express");
const router = express.Router();
const { mailsend } = require("../Controllers/mailcontroller");
const {
  signup,
  login,
  updateuser,
  getuserById,
  getallusers,
  authverify,
  forgotPassword,
  resetPassword,
  verifyOtp,
  deleteUser
} = require("../Controllers/usercontroller");
const { Auth } = require("../middleware/requireauth");

router.post("/signup", signup);
router.put("/updateduser/:id", updateuser);
router.post("/login", login);
router.get("/getuser/:id", getuserById);  
router.get("/getallusers", getallusers);
router.post("/authverify", Auth, authverify);
router.post("/sendmail", mailsend);
router.post("/forgotpassword", forgotPassword);
router.post("/resetpassword", resetPassword);
router.post("/verifyotp", verifyOtp);
router.delete("/deleteacount/:id", deleteUser)

module.exports = router;
