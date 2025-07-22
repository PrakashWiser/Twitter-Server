import express from "express";
import {
  getMessageHistory,
  sendMessage,
} from "../controllers/messageController.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();
router.post("/send", protectRoute, sendMessage);
router.get("/history", protectRoute, getMessageHistory); 

export default router;
