import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary';

export const multerCloudinaryOptions = {
  storage: new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: 'templates',
      resource_type: 'auto',
    }),
  }),
};
