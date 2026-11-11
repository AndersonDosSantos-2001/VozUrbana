const Sequelize = require('sequelize');

const RAIO_TERRA_KM = 6371;

/**
 * Converte distância de metros para quilômetros.
 * @param {number} metros
 * @returns {number}
 */
function converterMetrosParaKm(metros) {
  const valor = Number(metros);
  if (!Number.isFinite(valor) || valor < 0) return 0;
  return valor / 1000;
}

/**
 * Gera a expressão SQL da Fórmula de Haversine retornando a distância em quilômetros (km).
 * Utiliza LEAST(1.0, GREATEST(-1.0, ...)) dentro do ACOS(...) para evitar erro de ponto
 * flutuante ("input is out of range") no PostgreSQL quando a coordenada é idêntica (distância = 0).
 *
 * @param {number|string} lat Latitude de referência em graus decimais
 * @param {number|string} lng Longitude de referência em graus decimais
 * @param {string} [tabelaAlias='Denuncia'] Nome ou alias da tabela na consulta Sequelize
 * @returns {string} Expressão SQL segura
 */
function gerarExpressaoHaversineKm(lat, lng, tabelaAlias = 'Denuncia') {
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    throw new Error('Coordenadas inválidas para cálculo da Fórmula de Haversine.');
  }

  const aliasLimpo = String(tabelaAlias).replace(/[^a-zA-Z0-9_]/g, '');

  return `(
    ${RAIO_TERRA_KM} * ACOS(
      LEAST(1.0, GREATEST(-1.0,
        COS(RADIANS(${latNum})) * COS(RADIANS(CAST("${aliasLimpo}"."latitude" AS DOUBLE PRECISION))) *
        COS(RADIANS(CAST("${aliasLimpo}"."longitude" AS DOUBLE PRECISION)) - RADIANS(${lngNum})) +
        SIN(RADIANS(${latNum})) * SIN(RADIANS(CAST("${aliasLimpo}"."latitude" AS DOUBLE PRECISION)))
      ))
    )
  )`;
}

/**
 * Retorna um objeto Sequelize.literal com a expressão SQL de Haversine em quilômetros.
 *
 * @param {number|string} lat
 * @param {number|string} lng
 * @param {string} [tabelaAlias='Denuncia']
 * @returns {import('sequelize').Utils.Literal}
 */
function gerarLiteralHaversineKm(lat, lng, tabelaAlias = 'Denuncia') {
  return Sequelize.literal(gerarExpressaoHaversineKm(lat, lng, tabelaAlias));
}

/**
 * Calcula a distância Haversine em JavaScript puro (em km), útil para formatação e testes.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
function calcularDistanciaHaversineKm(lat1, lng1, lat2, lng2) {
  const paraRadianos = (graus) => (Number(graus) * Math.PI) / 180;

  const rLat1 = paraRadianos(lat1);
  const rLat2 = paraRadianos(lat2);
  const dLng = paraRadianos(lng2) - paraRadianos(lng1);

  const cosenoInterno =
    Math.cos(rLat1) * Math.cos(rLat2) * Math.cos(dLng) +
    Math.sin(rLat1) * Math.sin(rLat2);

  // Mesmo clamp LEAST(1.0, GREATEST(-1.0, ...)) usado no PostgreSQL
  const valorLimitado = Math.min(1.0, Math.max(-1.0, cosenoInterno));
  return RAIO_TERRA_KM * Math.acos(valorLimitado);
}

module.exports = {
  RAIO_TERRA_KM,
  converterMetrosParaKm,
  gerarExpressaoHaversineKm,
  gerarLiteralHaversineKm,
  calcularDistanciaHaversineKm,
};
