const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const deleteFileFromCloudinary = async (publicId) => {
  try {
    console.log('Starting deletion in Cloudinary for:', publicId);
    
    // Vérifier si le fichier existe
    try {
      await cloudinary.api.resource(publicId);
      console.log('Resource found in Cloudinary');
    } catch (error) {
      console.log('Resource not found in Cloudinary:', error.message);
      return { result: 'not_found' };
    }

    // Tenter la suppression avec différents types de ressources
    let result;
    try {
      result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true
      });
    } catch (error) {
      console.log('Failed with image type, trying video...');
      try {
        result = await cloudinary.uploader.destroy(publicId, {
          resource_type: 'video',
          invalidate: true
        });
      } catch (secondError) {
        console.log('Failed with video type as well:', secondError);
        throw new Error('Failed to delete resource with both image and video types');
      }
    }
    
    console.log('Deletion result:', result);
    return result;
  } catch (error) {
    console.error('Error in deleteFileFromCloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  deleteFileFromCloudinary,
  uploadFileToCloudinary: async (filePath, folder = "uploads") => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: "auto",
      });
      return result;
    } catch (error) {
      console.error("Cloudinary upload error:", error.message);
      throw new Error("Failed to upload to Cloudinary.");
    }
  }
};