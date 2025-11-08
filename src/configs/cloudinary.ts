import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dckjlmw8p',
  api_key: process.env.CLOUDINARY_API_KEY || '823632555699146',
  api_secret:
    process.env.CLOUDINARY_API_SECRET || 'f_8p_kOIMsN9bKfkRhWNEKh_pGY',
});

export default cloudinary;
