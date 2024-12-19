const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFileToCloudinary = async (filePath, folder = "uploads") => {
  try {
      const result = await cloudinary.uploader.upload(filePath, {
          folder: folder,
          resource_type: "auto", // Permet de gérer automatiquement les types de fichiers, y compris les vidéos

      });
      return result;
  } catch (error) {
      console.error("Cloudinary upload error:", error.message);
      throw new Error("Failed to upload to Cloudinary.");
  }
};

const deleteFileFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted media with publicId: ${publicId}`);
  } catch (error) {
    console.error(`Error deleting media with publicId ${publicId}:`, error.message);
  }
};


module.exports = { cloudinary,deleteFileFromCloudinary, uploadFileToCloudinary };