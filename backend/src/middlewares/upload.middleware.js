const multer = require('multer');
const path = require('path');

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error('Only image files are allowed (jpg, jpeg, png, webp)'), false);
  }
  cb(null, true);
};

// Upload ke memory untuk nanti upload ke Supabase
const makeUpload = () => {
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  }).any();

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      // Normalisasi: ambil file dengan fieldname apapun, assign ke req.file
      if (req.files && req.files.length > 0) {
        req.file = req.files[0];
      }

      next();
    });
  };
};

const uploadLogo = makeUpload();
const uploadProductImage = makeUpload();

module.exports = { uploadLogo, uploadProductImage };
