// Avatar upload middleware.
//
// Dual mode:
//   - If Cloudinary env vars are present (CLOUDINARY_CLOUD_NAME +
//     CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET, OR a single
//     CLOUDINARY_URL=cloudinary://...), files go to Cloudinary.
//   - Otherwise, files are written to backend/uploads/avatars/ on the local disk.
//
// We use multer's memoryStorage in cloud mode (file lives as a Buffer on
// req.file.buffer) and diskStorage in local mode (file lives on disk and
// req.file.filename is set). The controller checks `useCloudinary` to know
// which path to take.

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

const AVATARS_DIR = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

// Auto-configure Cloudinary if credentials are present. The SDK reads
// CLOUDINARY_URL automatically; we explicitly call config() if the three
// separate vars are set instead.
const hasUrl = !!process.env.CLOUDINARY_URL;
const hasParts =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;
const useCloudinary = hasUrl || hasParts;

if (hasParts) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// Choose storage based on mode.
const storage = useCloudinary
  ? multer.memoryStorage() // file kept in RAM as Buffer
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
      filename: (req, file, cb) => {
        const userId = req.user?.user_id || "anon";
        const ext = path.extname(file.originalname).toLowerCase() || ".png";
        cb(null, `user-${userId}-${Date.now()}${ext}`);
      },
    });

const fileFilter = (_req, file, cb) => {
  // Allow common image formats. SVG is intentionally excluded for security
  // (it can carry executable script payloads).
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/heic",
    "image/heif",
    "image/avif",
  ];
  // Some platforms hand us blank/octet-stream MIME types — fall back to extension.
  const allowedExt = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i;

  if (allowedMimes.includes(file.mimetype) || allowedExt.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP, GIF, BMP, HEIC, or AVIF images are allowed."));
  }
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cap
}).single("avatar");

// Pipe a Buffer to Cloudinary's upload_stream and resolve with the result.
function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

module.exports = {
  uploadAvatar,
  AVATARS_DIR,
  useCloudinary,
  cloudinary,
  uploadBufferToCloudinary,
};
