import axios from 'axios';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Consulta a API de Geocodificação Reversa do OpenStreetMap (Nominatim)
 * para extrair automaticamente a rua/número (endereco_aproximado) e o bairro.
 *
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @returns {Promise<{ endereco_aproximado: string, bairro: string, cidade: string, display_name: string }>}
 */
export async function buscarEnderecoPorCoordenadas(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return {
      endereco_aproximado: '',
      bairro: '',
      cidade: '',
      display_name: '',
    };
  }

  try {
    const { data } = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        format: 'json',
        lat: latNum,
        lon: lngNum,
        addressdetails: 1,
        'accept-language': 'pt-BR',
      },
      timeout: 8000,
    });

    const addr = data?.address || {};

    const logradouro =
      addr.road ||
      addr.pedestrian ||
      addr.footway ||
      addr.street ||
      addr.path ||
      addr.residential ||
      addr.Amenity ||
      '';

    const numero = addr.house_number ? `, ${addr.house_number}` : ', S/N';

    const bairroExtraido =
      addr.suburb ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.city_district ||
      addr.district ||
      addr.borough ||
      addr.village ||
      addr.town ||
      'Centro';

    const cidadeExtraida =
      addr.city || addr.town || addr.municipality || addr.county || '';

    const enderecoFormatado = logradouro
      ? `${logradouro}${numero}`
      : data?.display_name
        ? String(data.display_name).split(',').slice(0, 2).join(',').trim()
        : `Coordenada (${latNum.toFixed(5)}, ${lngNum.toFixed(5)})`;

    return {
      endereco_aproximado: enderecoFormatado.slice(0, 250),
      bairro: String(bairroExtraido).trim().slice(0, 100),
      cidade: String(cidadeExtraida).trim(),
      display_name: data?.display_name || enderecoFormatado,
    };
  } catch (err) {
    console.warn('[Nominatim] Aviso ao consultar endereço reverso:', err?.message);
    return {
      endereco_aproximado: `Localização GPS (${latNum.toFixed(5)}, ${lngNum.toFixed(5)})`,
      bairro: 'Centro',
      cidade: '',
      display_name: '',
    };
  }
}

export default {
  buscarEnderecoPorCoordenadas,
};
