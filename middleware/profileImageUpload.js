const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const multer = require("multer");

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const profileUploadDirectory = path.join(__dirname, "..", "public", "uploads", "profile");
const imageExtensions = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

fs.mkdirSync(profileUploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination(request, file, callback) {
    callback(null, profileUploadDirectory);
  },
  filename(request, file, callback) {
    const extension = imageExtensions[file.mimetype];
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_PROFILE_IMAGE_SIZE,
    files: 1,
  },
  fileFilter(request, file, callback) {
    if (!imageExtensions[file.mimetype]) {
      callback(new Error("Only JPG, PNG, GIF, and WebP image files are allowed."));
      return;
    }

    callback(null, true);
  },
});

function handleProfileImageUpload(request, response, next) {
  upload.single("avatarFile")(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    request.profileImageUploadError = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
      ? "Your profile picture must be no larger than 5 MB."
      : error.message || "Your profile picture could not be uploaded.";
    next();
  });
}

function getUploadedProfileImagePath(request) {
  return request.file ? `uploads/profile/${request.file.filename}` : "";
}

async function removeUploadedProfileImage(imagePath) {
  const relativePath = String(imagePath || "").replaceAll("\\", "/");
  const uploadPrefix = "uploads/profile/";

  if (!relativePath.startsWith(uploadPrefix)) return;

  const filename = relativePath.slice(uploadPrefix.length);
  if (!filename || filename !== path.basename(filename)) return;

  try {
    await fs.promises.unlink(path.join(profileUploadDirectory, filename));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

module.exports = {
  getUploadedProfileImagePath,
  handleProfileImageUpload,
  removeUploadedProfileImage,
};
