import User from "../model/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "cloudinary";

import Notification from "../model/notification.js";
export const getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ userName: username });

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      error: "intrenel server error",
    });
  }
};

export const followUnFollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await User.findById(req.user._id);
    const userToModify = await User.findById(id);

    if (id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ error: "You can't follow/unfollow yourself" });
    }

    if (!userToModify || !currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      await User.findByIdAndUpdate(id, {
        $pull: { followers: req.user._id },
      });
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { following: id },
      });
      return res.status(200).json({ message: "Unfollowed successfully" });
    } else {
      await User.findByIdAndUpdate(id, {
        $push: { followers: req.user._id },
      });
      await User.findByIdAndUpdate(req.user._id, {
        $push: { following: id },
      });
      const newNotification = new Notification({
        type: "follow",
        from: req.user._id,
        to: userToModify._id,
      });
      await newNotification.save();
      return res.status(200).json({ message: "Followed successfully" });
    }
  } catch (error) {
    console.error("Follow/Unfollow error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getSuggestedUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const userFollowedBMe = await User.findById({ _id: userId }).select(
      "-password"
    );
    const users = await User.aggregate([
      {
        $match: {
          _id: {
            $ne: userId,
          },
        },
      },
      {
        $sample: {
          size: 10,
        },
      },
    ]);
    const filterUser = users.filter(
      (item) => !userFollowedBMe.following.includes(item._id)
    );
    const suggestedUser = filterUser.slice(0, 4);
    console.log(suggestedUser);
    suggestedUser.forEach((item) => (item.password = null));
    res.status(200).json(suggestedUser);
  } catch (error) {
    console.error("Suggested  error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      userName,
      fullName,
      email,
      currentPassword,
      newPassword,
      bio,
      link,
    } = req.body;

    let { profileImg, coverImg } = req.body;

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (
      (currentPassword && !newPassword) ||
      (!currentPassword && newPassword)
    ) {
      return res.status(400).json({
        error: "Please provide both the current password and new password",
      });
    }

    if (currentPassword && newPassword) {
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must have at least 6 characters" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    if (profileImg) {
      try {
        if (user.profileImg) {
          const oldId = user.profileImg.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(oldId);
        }
        const uploaded = await cloudinary.uploader.upload(profileImg);
        profileImg = uploaded.secure_url;
      } catch (err) {
        console.error("❌ Cloudinary profileImg error:", err);
        return res
          .status(400)
          .json({ error: "Failed to upload profile image" });
      }
    }

    if (coverImg) {
      try {
        if (user.coverImg) {
          const oldId = user.coverImg.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(oldId);
        }
        const uploaded = await cloudinary.uploader.upload(coverImg);
        coverImg = uploaded.secure_url;
      } catch (err) {
        console.error("❌ Cloudinary coverImg error:", err);
        return res.status(400).json({ error: "Failed to upload cover image" });
      }
    }

    user.userName = userName || user.userName;
    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.bio = bio || user.bio;
    user.link = link || user.link;
    user.profileImg = profileImg || user.profileImg;
    user.coverImg = coverImg || user.coverImg;

    await user.save();
    user.password = null;

    return res.status(200).json(user);
  } catch (error) {
    console.error("updateUser error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
