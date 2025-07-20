import User from "../model/user.model.js";
import cloudinary from "cloudinary";
import Post from "../model/postmodel.js";
import Notification from "../model/notification.js";

export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body;
    const userId = req.user?._id.toString();
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "user not found" });
    }
    if (!text && !img) {
      return res.status(400).json({ error: "Post must have text or img" });
    }
    if (img) {
      const uploadResponse = await cloudinary.uploader.upload(img);
      img = uploadResponse.secure_url;
    }
    const newPost = new Post({
      user: userId,
      text,
      img,
    });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
};

export const createComment = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;
    if (!text) {
      return res.status(400).json({ error: "Comment is requried" });
    }
    const post = await Post.findOne({ _id: postId });
    if (!post) {
      return res.status(404).json({ error: "Post is not found" });
    }
    const comment = {
      user: userId,
      text,
    };
    post.comments.push(comment);
    await post.save();
    const newNotification = new Notification({
      type: "comment",
      from: userId,
      to: postId,
    });
    await newNotification.save();
    res.status(200).json(post);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server error" });
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: postId } = req.params;
    const post = await Post.findOne({ _id: postId });
    if (!post) {
      return res.status(404).json({ error: "Post is not found" });
    }
    const userLikedPost = post.like.includes(userId);
    if (userLikedPost) {
      await Post.updateOne({ _id: postId }, { $pull: { like: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });
      const updateLike = post.like.filter(
        (id) => id.toString() !== userId.toString()
      );
      res.status(200).json(updateLike);
    } else {
      post.like.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await post.save();
      const newNotification = new Notification({
        type: "like",
        from: userId,
        to: post.user,
      });
      await newNotification.save();
      const updateLikes = post.like;
      return res.status(200).json(updateLikes);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findOne({ _id: id });
    if (!post) {
      return res.status(404).json({ error: "Post Not found" });
    }
    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You Are not authrorized to deleted this post" });
    }
    if (post.img) {
      const imgId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }
    await Post.findByIdAndDelete({ _id: id });
    return res.status(200).json({ message: "Post deleted Sucessfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server error" });
  }
};

export const getAllPost = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password -email -following -followers -bio -link",
      })
      .populate({
        path: "comments.user",
        select: "-password -email -following -followers -bio -link",
      })
      .lean();

    if (!posts.length) {
      return res.status(200).json([]);
    }

    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLikedPosts = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: "User Not found" });
    }
    const likedPosts = await Post.find({
      _id: { $in: user.likedPosts },
    })
      .populate({
        path: "user",
        select: "-password -email -following -followers -bio -link",
      })
      .populate({
        path: "comments.user",
        select: "-password -email -following -followers -bio -link",
      });
    res.status(200).json(likedPosts);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId);
    const user = await User.findById({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: "User Not found" });
    }
    const following = user.following;
    const feedPost = await Post.find({
      user: { $in: following },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password ",
      });
    res.status(200).json(feedPost);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserPost = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({
      userName: username,
    });
    if (!user) {
      return res.status(404).json({ error: "User Not found" });
    }
    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate({ path: "user", select: "-password" })
      .populate({ path: "comments.user", select: "-password" });
    res.status(200).json(posts);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
