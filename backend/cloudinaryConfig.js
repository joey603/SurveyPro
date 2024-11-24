// cloudinaryConfig.js
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'survey_media', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'mov'], // Allowed file formats
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
