const express = require("express");
const router = express.Router();
const {
  createMessage,
  getAllMessages,
  updateMessage,
  deleteMessage,
  getMessageById,
} = require("../Controllers/messagecontroller");

const { Auth } = require("../middleware/requireauth");

// Create a new message
router.post("/sendmessage", Auth, createMessage);

// Get all messages
router.get("/getmessage", Auth, getAllMessages);

// Get a single message by ID
router.get("/getsinglemessage/:id", Auth, getMessageById);

// Update a message by ID
router.put("/updatemessage/:id", Auth, updateMessage);

// Delete a message by ID
router.delete("/deletmessage/:id", Auth, deleteMessage);

module.exports = router;
