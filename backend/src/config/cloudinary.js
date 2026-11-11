const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configuração da SDK do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LIMITE_TAMANHO_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_MIME_PERMITIDOS = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

// Configuração do Multer em memória (memoryStorage) com limite de 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: LIMITE_TAMANHO_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (TIPOS_MIME_PERMITIDOS.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de imagem inválido. Envie arquivos JPG, PNG ou WEBP.'));
    }
  },
});

/**
 * Faz o upload de um Buffer de imagem (req.file.buffer) para o Cloudinary na pasta voz_urbana/denuncias.
 *
 * @param {Buffer} fileBuffer Buffer do arquivo recebido pelo Multer
 * @param {string} [pasta='voz_urbana/denuncias'] Pasta de destino no Cloudinary
 * @returns {Promise<{ imagem_url: string, imagem_public_id: string }>}
 */
function uploadImagemBuffer(fileBuffer, pasta = 'voz_urbana/denuncias') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: pasta,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        return resolve({
          imagem_url: result.secure_url,
          imagem_public_id: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Remove uma imagem do Cloudinary a partir de seu public_id.
 *
 * @param {string} publicId
 * @returns {Promise<void>}
 */
async function deletarImagemCloudinary(publicId) {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn(`[Cloudinary] Aviso ao remover imagem (${publicId}):`, err.message);
  }
}

module.exports = {
  cloudinary,
  upload,
  uploadImagemBuffer,
  deletarImagemCloudinary,
};
