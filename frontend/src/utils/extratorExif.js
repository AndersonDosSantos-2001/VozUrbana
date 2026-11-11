import exifr from 'exifr';

/**
 * Lê os metadados EXIF da imagem original (antes da compressão) procurando
 * coordenadas GPS de latitude e longitude.
 *
 * @param {File|Blob} arquivo Imagem selecionada pelo usuário
 * @returns {Promise<{ latitude: number, longitude: number, origem: 'EXIF' } | null>}
 */
export async function extrairCoordenadasExif(arquivo) {
  if (!arquivo) return null;

  try {
    const coordenadas = await exifr.gps(arquivo);

    if (
      coordenadas &&
      Number.isFinite(coordenadas.latitude) &&
      Number.isFinite(coordenadas.longitude)
    ) {
      return {
        latitude: Number(coordenadas.latitude.toFixed(7)),
        longitude: Number(coordenadas.longitude.toFixed(7)),
        origem: 'EXIF',
      };
    }

    return null;
  } catch (err) {
    console.warn('[EXIF] Imagem sem metadados GPS ou formato não suportado:', err?.message);
    return null;
  }
}

export default extrairCoordenadasExif;
