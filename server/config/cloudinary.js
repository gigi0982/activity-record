const cloudinary = require('cloudinary').v2;

// 配置 Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary 配置成功');
} else {
  console.log('Cloudinary 測試模式 - 跳過配置（缺少環境變數）');
}

// 上傳照片到 Cloudinary
async function uploadToCloudinary(file, options = {}) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('測試模式：跳過 Cloudinary 上傳');
      return { public_id: 'test-photo', secure_url: 'https://via.placeholder.com/300x200?text=Test+Photo' };
    }

    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'activity-photos', // 將照片放在特定資料夾
      resource_type: 'auto',
      ...options
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary 上傳錯誤:', error);
    throw error;
  }
}

// 從 buffer 上傳（適用於 Vercel serverless）
async function uploadBufferToCloudinary(buffer, originalName, options = {}) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('測試模式：跳過 Cloudinary 上傳');
      return { 
        public_id: `test-photo-${Date.now()}`, 
        secure_url: 'https://via.placeholder.com/300x200?text=Test+Photo' 
      };
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        folder: 'activity-photos',
        resource_type: 'auto',
        public_id: `activity-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ...options
      }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            width: result.width,
            height: result.height
          });
        }
      }).end(buffer);
    });
  } catch (error) {
    console.error('Cloudinary buffer 上傳錯誤:', error);
    throw error;
  }
}

// 刪除照片
async function deleteFromCloudinary(publicId) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('測試模式：跳過 Cloudinary 刪除');
      return { result: 'ok' };
    }

    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary 刪除錯誤:', error);
    throw error;
  }
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary
};