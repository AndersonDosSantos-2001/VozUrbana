import { useState, useCallback } from 'react';
import { extrairCoordenadasExif } from '../utils/extratorExif';
import { buscarEnderecoPorCoordenadas } from '../services/nominatimService';

// Coordenada padrão inicial caso o dispositivo/navegador negue o GPS (Jaboatão / Recife - PE)
export const COORDENADAS_PADRAO = {
  latitude: -8.112345,
  longitude: -35.015432,
};

/**
 * Hook que encapsula a cascata híbrida de localização (Decisão Arquitetural 01):
 * 1) Tentativa 1: Leitura EXIF da foto da Galeria antes de comprimir
 * 2) Tentativa 2: GPS nativo do navegador (navigator.geolocation)
 * 3) Geocodificação reversa via Nominatim (OpenStreetMap) para rua e bairro
 */
export function useGeolocalizacao() {
  const [coordenadas, setCoordenadas] = useState(COORDENADAS_PADRAO);
  const [origemLocalizacao, setOrigemLocalizacao] = useState('PADRAO');
  const [enderecoAproximado, setEnderecoAproximado] = useState('');
  const [bairro, setBairro] = useState('');
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false);
  const [avisoLocalizacao, setAvisoLocalizacao] = useState('');

  /**
   * Atualiza rua e bairro consultando o Nominatim para uma coordenada (lat, lng).
   */
  const atualizarEnderecoReverso = useCallback(async (lat, lng, origem = 'MAPA') => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;

    setCoordenadas({ latitude: latNum, longitude: lngNum });
    setOrigemLocalizacao(origem);
    setBuscandoLocalizacao(true);

    try {
      const resultado = await buscarEnderecoPorCoordenadas(latNum, lngNum);
      if (resultado.endereco_aproximado) {
        setEnderecoAproximado(resultado.endereco_aproximado);
      }
      if (resultado.bairro) {
        setBairro(resultado.bairro);
      }
      return resultado;
    } finally {
      setBuscandoLocalizacao(false);
    }
  }, []);

  /**
   * Solicita o GPS atual do navegador (navigator.geolocation.getCurrentPosition).
   */
  const obterGpsDispositivo = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setAvisoLocalizacao(
          'Seu navegador não suporta geolocalização automática. Ajuste o pino no mapa abaixo.'
        );
        atualizarEnderecoReverso(
          COORDENADAS_PADRAO.latitude,
          COORDENADAS_PADRAO.longitude,
          'PADRAO'
        ).then(resolve);
        return;
      }

      setBuscandoLocalizacao(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(7));
          const lng = Number(pos.coords.longitude.toFixed(7));
          setAvisoLocalizacao('');
          const dados = await atualizarEnderecoReverso(lat, lng, 'GPS');
          resolve({ latitude: lat, longitude: lng, ...dados });
        },
        async () => {
          setAvisoLocalizacao(
            'Permissão de GPS não concedida. Confirme ou arraste o pino no mapa para indicar o local.'
          );
          const dados = await atualizarEnderecoReverso(
            COORDENADAS_PADRAO.latitude,
            COORDENADAS_PADRAO.longitude,
            'PADRAO'
          );
          resolve({
            latitude: COORDENADAS_PADRAO.latitude,
            longitude: COORDENADAS_PADRAO.longitude,
            ...dados,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000,
        }
      );
    });
  }, [atualizarEnderecoReverso]);

  /**
   * Executa a cascata híbrida ao anexar uma imagem:
   * 1. Tenta extrair EXIF GPS da foto original;
   * 2. Se não possuir EXIF, aciona o GPS do dispositivo.
   */
  const detectarLocalizacaoPorMidia = useCallback(
    async (arquivoImagem) => {
      setBuscandoLocalizacao(true);
      setAvisoLocalizacao('');

      const exif = await extrairCoordenadasExif(arquivoImagem);
      if (exif) {
        const dados = await atualizarEnderecoReverso(
          exif.latitude,
          exif.longitude,
          'EXIF'
        );
        return {
          latitude: exif.latitude,
          longitude: exif.longitude,
          origem: 'EXIF',
          ...dados,
        };
      }

      return obterGpsDispositivo();
    },
    [atualizarEnderecoReverso, obterGpsDispositivo]
  );

  return {
    coordenadas,
    setCoordenadas,
    origemLocalizacao,
    enderecoAproximado,
    setEnderecoAproximado,
    bairro,
    setBairro,
    buscandoLocalizacao,
    avisoLocalizacao,
    obterGpsDispositivo,
    detectarLocalizacaoPorMidia,
    atualizarEnderecoReverso,
  };
}

export default useGeolocalizacao;
