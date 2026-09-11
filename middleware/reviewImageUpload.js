const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const multer = require("multer");

const MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024;
const reviewUploadDirectory = path.join(__dirname, "..", "public", "uploads", "reviews");
const imageExtensions = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

fs.mkdirSync(reviewUploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination(request, file, callback) {
    callback(null, reviewUploadDirectory);
  },
  filename(request, file, callback) {
    const extension = imageExtensions[file.mimetype];
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_REVIEW_IMAGE_SIZE,
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

function handleReviewImageUpload(request, response, next) {
  upload.single("imageFile")(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    request.reviewImageUploadError = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
      ? "The review image must be no larger than 5 MB."
      : error.message || "The review image could not be uploaded.";
    next();
  });
}

function getUploadedReviewImagePath(request) {
  return request.file ? `uploads/reviews/${request.file.filename}` : "";
}

async function removeUploadedReviewImage(imagePath) {
  const relativePath = String(imagePath || "").replaceAll("\\", "/");
  const uploadPrefix = "uploads/reviews/";

  if (!relativePath.startsWith(uploadPrefix)) return;

  const filename = relativePath.slice(uploadPrefix.length);
  if (!filename || filename !== path.basename(filename)) return;

  try {
    await fs.promises.unlink(path.join(reviewUploadDirectory, filename));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

module.exports = {
  getUploadedReviewImagePath,
  handleReviewImageUpload,
  removeUploadedReviewImage,
};
