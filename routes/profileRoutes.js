const express = require("express");
const { requireLogin } = require("../middleware/auth");
const {
  getUploadedProfileImagePath,
  handleProfileImageUpload,
  removeUploadedProfileImage,
} = require("../middleware/profileImageUpload");
const {
  findUserByEmail,
  findUserById,
  updateUser,
} = require("../repositories/userRepository");
const {
  clearSessionCookie,
  deleteUserSessions,
} = require("../services/sessionService");
const { checkSecret, hashSecret } = require("../utils/security");

const avatarColors = ["#0d6efd", "#d63659", "#218739", "#f5a623", "#7c3aed", "#0891b2"];

function getProfileFormData(body) {
  const errors = {};
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const introduction = String(body.introduction || "").trim();
  const avatarColor = avatarColors.includes(body.avatarColor) ? body.avatarColor : avatarColors[0];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (fullName.length < 2 || fullName.length > 80) {
    errors.fullName = "Full name must be between 2 and 80 characters.";
  }

  if (!emailPattern.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (introduction.length > 300) {
    errors.introduction = "Introduction must be 300 characters or fewer.";
  }

  return { errors, fullName, email, introduction, avatarColor };
}

function getPasswordChangeData(body, currentUser) {
  const errors = {};
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!checkSecret(currentPassword, currentUser.passwordHash)) {
    errors.currentPassword = "Current password is incorrect.";
  }

  if (newPassword.length < 8) {
    errors.newPassword = "New password must be at least 8 characters.";
  }

  if (newPassword !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return { errors, newPassword };
}

function renderProfile(response, options) {
  response.status(options.status || 200).render("profile", {
    activePage: "",
    currentUser: options.currentUser,
    avatarColors,
    profileErrors: options.profileErrors || {},
    passwordErrors: options.passwordErrors || {},
    profileSaved: options.profileSaved || false,
    passwordSaved: options.passwordSaved || false,
  });
}

function createProfileRouter() {
  const router = express.Router();

  router.get("/profile", requireLogin, (request, response) => {
    renderProfile(response, { currentUser: request.currentUser });
  });

  router.post("/profile", requireLogin, handleProfileImageUpload, async (request, response) => {
    const database = request.app.locals.database;
    const formData = getProfileFormData(request.body);
    const existingUser = await findUserByEmail(database, formData.email);

    if (existingUser && existingUser.id !== request.currentUser.id) {
      formData.errors.email = "That email address is already in use by another account.";
    }

    if (request.profileImageUploadError) {
      formData.errors.avatarImage = request.profileImageUploadError;
    }

    if (Object.keys(formData.errors).length > 0) {
      renderProfile(response, {
        currentUser: {
          ...request.currentUser,
          avatarColor: formData.avatarColor,
          email: formData.email,
          fullName: formData.fullName,
          introduction: formData.introduction,
        },
        profileErrors: formData.errors,
        status: 400,
      });
      return;
    }

    const uploadedImagePath = getUploadedProfileImagePath(request);
    const removePhoto = request.body.removeAvatarImage === "on" && !uploadedImagePath;
    const changes = {
      avatarColor: formData.avatarColor,
      email: formData.email,
      fullName: formData.fullName,
      introduction: formData.introduction,
    };

    if (uploadedImagePath) {
      changes.avatarImage = uploadedImagePath;
    } else if (removePhoto) {
      changes.avatarImage = "";
    }

    if ((uploadedImagePath || removePhoto) && request.currentUser.avatarImage) {
      await removeUploadedProfileImage(request.currentUser.avatarImage);
    }

    const user = await updateUser(database, request.currentUser.id, changes);

    renderProfile(response, { currentUser: user, profileSaved: true });
  });

  router.post("/profile/password", requireLogin, async (request, response) => {
    const database = request.app.locals.database;
    const user = await findUserById(database, request.currentUser.id);
    const { errors, newPassword } = getPasswordChangeData(request.body, user);

    if (Object.keys(errors).length > 0) {
      renderProfile(response, {
        currentUser: user,
        passwordErrors: errors,
        status: 400,
      });
      return;
    }

    const updatedUser = await updateUser(database, user.id, {
      passwordHash: hashSecret(newPassword),
    });

    renderProfile(response, { currentUser: updatedUser, passwordSaved: true });
  });

  router.post("/profile/deactivate", requireLogin, async (request, response) => {
    const database = request.app.locals.database;
    await updateUser(database, request.currentUser.id, { status: "deactivated" });
    await deleteUserSessions(database, request.currentUser.id);
    clearSessionCookie(response);
    response.redirect("/login");
  });

  return router;
}

module.exports = { createProfileRouter };
