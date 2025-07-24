import mongoose from "mongoose";
import Message from "../model/message.js";
import admin from "../firebase/index.js";

export const socketHandler = (io, onlineUsers) => {
  io.on("connection", (socket) => {
    console.log("🔌 Connected:", socket.id);

    socket.on("authenticate", async (token) => {
      try {
        const decodedUser = await admin.auth().verifyIdToken(token);
        socket.user = decodedUser;
        const userId = decodedUser.uid;
        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId).add(socket.id);
        console.log(
          `User ${userId} connected. Online users:`,
          Array.from(onlineUsers.keys())
        );
      } catch (err) {
        console.log("Authentication failed:", err.message);
        socket.disconnect();
      }
    });

    socket.on("send_message", async ({ recipientId, message, messageId }) => {
      console.log("Received send_message:", {
        recipientId,
        message,
        messageId,
      });
      const sender = socket.user;
      if (!sender) {
        socket.emit("error", { message: "User not authenticated" });
        console.log("Error: User not authenticated");
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        socket.emit("error", { message: "Invalid message ID" });
        console.log("Error: Invalid message ID", messageId);
        return;
      }
      const recipientSockets = onlineUsers.get(recipientId);
      if (!recipientSockets) {
        socket.emit("error", { message: "Recipient is offline or not found" });
        console.log("Error: Recipient offline or not found", recipientId);
        return;
      }
      console.log(
        "Sending to recipient sockets:",
        Array.from(recipientSockets)
      );
      for (const sockId of recipientSockets) {
        io.to(sockId).emit("receive_message", {
          message,
          sender: sender.uid,
          messageId,
          timestamp: new Date().toISOString(),
          status: "delivered",
        });
      }
      try {
        const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { status: "delivered" },
          { new: true }
        );
        console.log("Updated message status:", updatedMessage);
      } catch (err) {
        console.error("Failed to update message status:", err);
        socket.emit("error", { message: "Failed to update message status" });
      }
    });

    socket.on("message_read", async ({ messageId }) => {
      try {
        const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { status: "read" },
          { new: true }
        );
        console.log("Message marked as read:", updatedMessage);
        const senderSockets = onlineUsers.get(socket.user.uid);
        if (senderSockets) {
          for (const sockId of senderSockets) {
            io.to(sockId).emit("message_status_updated", {
              messageId,
              status: "read",
            });
          }
        }
      } catch (err) {
        console.error("Failed to update read status:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
      for (const [userId, sockets] of onlineUsers.entries()) {
        if (sockets.delete(socket.id) && sockets.size === 0) {
          onlineUsers.delete(userId);
          console.log(`User ${userId} is now offline`);
        }
      }
    });
  });
};
