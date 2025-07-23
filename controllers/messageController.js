import User from "../model/user.model.js";
import Message from "../model/message.js";

export const sendMessage = async (req, res) => {
  try {
    const { message, recipient } = req.body;
    const senderId = req.user?._id;

    if (!senderId || !recipient || !message?.trim()) {
      return res.status(400).json({ success: false, error: "Invalid data." });
    }

    const recipientUser = await User.findOne({ userName: recipient });
    if (!recipientUser) {
      return res
        .status(404)
        .json({ success: false, error: "Recipient not found." });
    }

    const newMessage = await Message.create({
      sender: senderId,
      recipient: recipientUser._id,
      message,
      timestamp: new Date(),
      status: "sent",
    });

    res
      .status(200)
      .json({ success: true, message: "Message sent", data: newMessage });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getMessageHistory = async (req, res) => {
  try {
    const senderId = req.user?._id;
    const { recipient } = req.query;

    if (!senderId || !recipient) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request." });
    }

    const recipientUser = await User.findOne({ userName: recipient });
    if (!recipientUser) {
      return res
        .status(404)
        .json({ success: false, error: "Recipient not found." });
    }

    const messages = await Message.find({
      $or: [
        { sender: senderId, recipient: recipientUser._id },
        { sender: recipientUser._id, recipient: senderId },
      ],
    }).sort({ timestamp: 1 });

    res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error("Fetch history error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
