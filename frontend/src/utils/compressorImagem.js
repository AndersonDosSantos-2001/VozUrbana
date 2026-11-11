import imageCompression from 'browser-image-compression';

/**
 * Comprime e redimensiona a imagem no navegador (Client-Side) após a leitura do EXIF,
 * garantindo envio rápido para o Cloudinary (máx. 1280px e ~150KB a 300KB).
 *
 * @param {File} arquivoOriginal Arquivo de imagem original
 * @returns {Promise<{ arquivoComprimido: File, tamanhoOriginalKb: number, tamanhoFinalKb: number }>}
 */
export async function comprimirImagem(arquivoOriginal) {
  if (!arquivoOriginal) {
    throw new Error('Nenhum arquivo de imagem informado para compressão.');
  }

  const tamanhoOriginalKb = Math.round(arquivoOriginal.size / 1024);

  const opcoes = {
    maxSizeMB: 0.28, // ~285 KB (dentro da faixa 150 KB - 300 KB)
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.82,
  };

  try {
    const blobComprimido = await imageCompression(arquivoOriginal, opcoes);

    const nomeBase = (arquivoOriginal.name || 'denuncia').replace(/\.[^/.]+$/, '');
    const arquivoComprimido = new File([blobComprimido], `${nomeBase}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    const tamanhoFinalKb = Math.round(arquivoComprimido.size / 1024);

    return {
      arquivoComprimido,
      tamanhoOriginalKb,
      tamanhoFinalKb,
    };
  } catch (err) {
    console.warn('[Compressor] Falha ao comprimir imagem, usando arquivo original:', err?.message);
    return {
      arquivoComprimido: arquivoOriginal,
      tamanhoOriginalKb,
      tamanhoFinalKb: tamanhoOriginalKb,
    };
  }
}

export default comprimirImagem;
