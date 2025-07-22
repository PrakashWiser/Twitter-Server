import User from "../model/user.model.js";
import Message from "../model/message.js";

export const sendMessage = async (req, res) => {
  try {
    const { message, recipient } = req.body;

    if (
      !message ||
      !recipient ||
      typeof message !== "string" ||
      message.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        error: "Message and recipient are required",
      });
    }

    const sender = req.user?._id;
    if (!sender) {
      return res.status(401).json({
        success: false,
        error: "Sender not authenticated",
      });
    }

    const recipientUser = await User.findOne({ userName: recipient });

    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        error: "Recipient not found",
      });
    }

    const newMessage = new Message({
      sender,
      recipient: recipientUser._id,
      message,
      timestamp: new Date(),
    });

    await newMessage.save();
    return res.status(200).json({ success: true, message: "Message sent!" });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send message",
    });
  }
};

export const getMessageHistory = async (req, res) => {
  try {
    const { recipient } = req.query;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        error: "Recipient username is required",
      });
    }

    const sender = req.user?._id;
    if (!sender) {
      return res.status(401).json({
        success: false,
        error: "Sender not authenticated",
      });
    }

    const recipientUser = await User.findOne({ userName: recipient });

    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        error: "Recipient not found",
      });
    }

    const messages = await Message.find({
      $or: [
        { sender, recipient: recipientUser._id },
        { sender: recipientUser._id, recipient: sender },
      ],
    })
      .select("message sender recipient timestamp")
      .sort({ timestamp: 1 })
      .exec();

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching message history:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch message history",
    });
  }
};
