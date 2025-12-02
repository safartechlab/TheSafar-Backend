const Message = require("../Models/messagemodel");
const { Sendmail } = require("../Utilities/nodemailer");

// Create a new message
const createMessage = async (req, res) => {
  try {
    const { name, email, contact, message } = req.body;

    // Simple validation
    if (!name || !email || !contact || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newMessage = new Message({ name, email, contact, message });
    const savedMessage = await newMessage.save();

    res.status(201).json(savedMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single message by ID
const getMessageById = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });
    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a message by ID
const updateMessage = async (req, res) => {
  try {
    const updatedMessage = await Message.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedMessage)
      return res.status(404).json({ error: "Message not found" });
    res.status(200).json(updatedMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Deleting message ID:", id);

    const deletedMsg = await Message.findByIdAndDelete(id);

    if (!deletedMsg) {
      return res.status(404).json({ error: "Message not found" });
    }

    return res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("❌ Delete Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const replyToUser = async (req, res) => {
  try {
    const {
      messageId,
      replyMessage,
      subject = "Reply from Support",
    } = req.body;

    const userMessage = await Message.findById(messageId);
    if (!userMessage) {
      return res.status(404).json({ error: "Message not found" });
    }

    const htmlContent = `
      <p>Hi ${userMessage.name},</p>
      <p>${replyMessage}</p>
      <p>Regards,<br/>Safar Team</p>
    `;

    // Use the utility instead of transporter directly
    await Sendmail(userMessage.email, subject, htmlContent);

    userMessage.reply = replyMessage;
    await userMessage.save();

    res.status(200).json({ message: "Reply sent successfully!" });
  } catch (err) {
    console.error("Reply error:", err);
    res.status(500).json({ error: "Failed to send reply" });
  }
};

module.exports = {
  createMessage,
  getAllMessages,
  updateMessage,
  deleteMessage,
  getMessageById,
  replyToUser,
};
