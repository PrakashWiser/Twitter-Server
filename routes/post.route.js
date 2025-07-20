  import express from "express";
  import protectRoute from "../middleware/protectRoute.js";
  import {
    getAllPost,
    createPost,
    deletePost,
    createComment,
    likeUnlikePost,
    getLikedPosts,
    getFollowingPosts,
    getUserPost,
  } from "../controllers/post.controller.js";
  const router = express.Router();
  router.get("/all", protectRoute, getAllPost);
  router.get("/following", protectRoute, getFollowingPosts);
  router.post("/create", protectRoute, createPost);
  router.post("/comment/:id", protectRoute, createComment);
  router.post("/like/:id", protectRoute, likeUnlikePost);
  router.get("/user/:username", protectRoute, getUserPost);
  router.delete("/:id", protectRoute, deletePost);
  router.get("/likes/:id", protectRoute, getLikedPosts);

  export default router;    
