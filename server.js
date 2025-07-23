import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cloudinary from "cloudinary";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import notificationRoute from "./routes/notification.route.js";
import { connectDB } from "./db/connectDB.js";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import admin from "./firebase/index.js";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "https://twitter-client-three.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/messages", messageRoute);

app.get("/", (req, res) => {
  res.json({ message: "✅ Server is running successfully" });
});

connectDB().then(() => {
  server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
  });
});

const onlineUsers = new Map();

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 Connected:", socket.id);
    socket.on("authenticate", async (token) => {
      try {
        const decodedUser = await admin.auth().verifyIdToken(token);
        socket.user = decodedUser;
        const userId = decodedUser.uid;
        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId).add(socket.id);
      } catch (err) {
        console.log("Authentication failed:", err.message);
        socket.disconnect();
      }
    });

    socket.on("send_message", ({ recipientId, message, messageId }) => {
      const sender = socket.user;
      if (!sender) return;
      const recipientSockets = onlineUsers.get(recipientId);
      if (!recipientSockets) return;
      for (const sockId of recipientSockets) {
        io.to(sockId).emit("receive_message", {
          message,
          sender: sender.uid,
          messageId,
          timestamp: new Date().toISOString(),
          status: "delivered",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
      for (const [userId, sockets] of onlineUsers.entries()) {
        if (sockets.delete(socket.id) && sockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
    });
  });
};
