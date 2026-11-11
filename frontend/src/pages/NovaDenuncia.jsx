import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Image as ImageIcon,
  Camera,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  LocateFixed,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useGeolocalizacao } from '../hooks/useGeolocalizacao';
import { comprimirImagem } from '../utils/compressorImagem';
import { MapaSeletor } from '../components/denuncia/MapaSeletor';
import { ModalDuplicata } from '../components/denuncia/ModalDuplicata';

export function NovaDenuncia() {
  const navigate = useNavigate();
  const {
    estaAutenticado,
    precisaCompletarCpf,
    abrirModalCpf,
  } = useAuth();

  const {
    coordenadas,
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
  } = useGeolocalizacao();

  const inputGaleriaRef = useRef(null);
  const inputCameraRef = useRef(null);

  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [observacao, setObservacao] = useState('');

  // Imagem e compressão
  const [arquivoImagem, setArquivoImagem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [infoCompressao, setInfoCompressao] = useState(null);
  const [processandoImagem, setProcessandoImagem] = useState(false);

  // Verificação de duplicidade (40m via Haversine)
  const [duplicatasProximas, setDuplicatasProximas] = useState([]);
  const [modalDuplicataAberto, setModalDuplicataAberto] = useState(false);
  const [duplicidadeIgnoradaChave, setDuplicidadeIgnoradaChave] = useState('');
  const [apoiandoDuplicata, setApoiandoDuplicata] = useState(false);

  // Submissão
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  // Carrega categorias e obtém localização GPS inicial
  useEffect(() => {
    async function inicializar() {
      try {
        const { data } = await api.get('/categorias');
        if (Array.isArray(data)) {
          setCategorias(data);
        }
      } catch {
        // Fallback visual caso a API ainda esteja subindo
      }
    }
    inicializar();
    obterGpsDispositivo();
  }, [obterGpsDispositivo]);

  // Limpa URL de preview ao desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Gatilho automático de verificação de duplicidade (Raio <= 40m)
  useEffect(() => {
    if (!estaAutenticado || !categoriaId || !coordenadas?.latitude || !coordenadas?.longitude) {
      return;
    }

    const chaveAtual = `${categoriaId}:${coordenadas.latitude.toFixed(5)}:${coordenadas.longitude.toFixed(5)}`;
    if (chaveAtual === duplicidadeIgnoradaChave) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/denuncias/verificar-duplicidade', {
          params: {
            lat: coordenadas.latitude,
            lng: coordenadas.longitude,
            categoria_id: categoriaId,
          },
        });

        if (data?.possui_duplicata && Array.isArray(data.denuncias_proximas) && data.denuncias_proximas.length > 0) {
          setDuplicatasProximas(data.denuncias_proximas);
          setModalDuplicataAberto(true);
        } else {
          setDuplicatasProximas([]);
          setModalDuplicataAberto(false);
        }
      } catch {
        // Silencia erro de verificação preventiva
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [estaAutenticado, categoriaId, coordenadas, duplicidadeIgnoradaChave]);

  /**
   * Fluxo Automático ao anexar foto (Galeria ou Câmera):
   * Passo A: extratorExif.js lê coordenadas GPS da imagem original antes de comprimir.
   * Passo B: Se não tiver EXIF, aciona navigator.geolocation.getCurrentPosition().
   * Passo C: Envia (lat, lng) para nominatimService.js e preenche rua e bairro.
   * Passo D: compressorImagem.js comprime a imagem para <= 300 KB.
   */
  async function handleSelecionarArquivo(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErro('');
    setProcessandoImagem(true);

    try {
      // Passos A, B e C: Detecta localização (EXIF -> GPS -> Nominatim) ANTES de comprimir
      await detectarLocalizacaoPorMidia(file);

      // Passo D: Comprime a imagem no navegador (Client-Side)
      const resultadoCompressao = await comprimirImagem(file);
      setArquivoImagem(resultadoCompressao.arquivoComprimido);
      setInfoCompressao({
        originalKb: resultadoCompressao.tamanhoOriginalKb,
        finalKb: resultadoCompressao.tamanhoFinalKb,
      });

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(resultadoCompressao.arquivoComprimido));
    } catch (err) {
      setErro(err.message || 'Erro ao processar a imagem selecionada.');
    } finally {
      setProcessandoImagem(false);
    }
  }

  function removerImagem() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setArquivoImagem(null);
    setPreviewUrl('');
    setInfoCompressao(null);
    if (inputGaleriaRef.current) inputGaleriaRef.current.value = '';
    if (inputCameraRef.current) inputCameraRef.current.value = '';
  }

  async function handleApoiarExistente(denunciaExistente) {
    if (!estaAutenticado) {
      navigate('/login');
      return;
    }

    try {
      setApoiandoDuplicata(true);
      if (!denunciaExistente.apoiado_pelo_usuario) {
        await api.post(`/denuncias/${denunciaExistente.id}/apoiar`);
      }
      setModalDuplicataAberto(false);
      navigate('/minhas-denuncias');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Não foi possível apoiar a denúncia existente.');
      setModalDuplicataAberto(false);
    } finally {
      setApoiandoDuplicata(false);
    }
  }

  function handleContinuarMesmoAssim() {
    const chaveAtual = `${categoriaId}:${coordenadas.latitude.toFixed(5)}:${coordenadas.longitude.toFixed(5)}`;
    setDuplicidadeIgnoradaChave(chaveAtual);
    setModalDuplicataAberto(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    if (!estaAutenticado) {
      navigate('/login');
      return;
    }

    if (precisaCompletarCpf) {
      abrirModalCpf();
      return;
    }

    if (!categoriaId) {
      setErro('Selecione a categoria do problema urbano.');
      return;
    }

    if (!enderecoAproximado.trim() || !bairro.trim()) {
      setErro('Confirme o endereço aproximado e o bairro da ocorrência.');
      return;
    }

    try {
      setEnviando(true);

      const formData = new FormData();
      formData.append('categoria_id', String(categoriaId));
      formData.append('latitude', String(coordenadas.latitude));
      formData.append('longitude', String(coordenadas.longitude));
      formData.append('endereco_aproximado', enderecoAproximado.trim());
      formData.append('bairro', bairro.trim());
      if (observacao.trim()) {
        formData.append('observacao', observacao.trim());
      }
      if (arquivoImagem) {
        formData.append('imagem', arquivoImagem);
      }

      await api.post('/denuncias', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      navigate('/minhas-denuncias');
    } catch (err) {
      if (err.response?.data?.precisa_completar_cpf) {
        abrirModalCpf();
      }
      setErro(
        err.response?.data?.erro ||
          'Não foi possível publicar a denúncia. Verifique os dados e tente novamente.'
      );
    } finally {
      setEnviando(false);
    }
  }

  if (!estaAutenticado) {
    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
        <div className="bg-superficie-card rounded-2xl p-6 border border-superficie-borda shadow-xs space-y-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-coral-suave text-coral flex items-center justify-center mx-auto">
            <MapPin className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-base text-urbano-escuro">
            Identifique-se para Registrar uma Denúncia
          </h2>
          <p className="text-xs text-slate-500">
            Para acompanhar o andamento e receber a resposta oficial da prefeitura, entre na sua conta ou cadastre-se rapidamente.
          </p>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="py-3 rounded-full bg-urbano text-white font-display font-bold text-xs"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => navigate('/login?modo=cadastro')}
              className="py-3 rounded-full bg-coral text-white font-display font-bold text-xs"
            >
              Criar Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 pb-8 space-y-4">
      {/* 1. Breadcrumb */}
      <div className="text-[11px] font-display font-bold tracking-wider uppercase text-slate-400">
        HOME &gt; DENÚNCIA
      </div>

      {erro && (
        <div className="p-3.5 rounded-xl bg-status-rejeitadoBg border border-status-rejeitado/30 text-status-rejeitado text-xs font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 2. CAPTURA DE MÍDIA (Galeria / Câmera) */}
        <section className="bg-superficie-card rounded-2xl p-4 shadow-xs border border-superficie-borda space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-sm text-urbano-escuro">
              1. Foto da Ocorrência (Opcional)
            </h2>
            {infoCompressao && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-resolvidoBg text-emerald-800 text-[10px] font-semibold">
                <Sparkles className="w-3 h-3" />
                Otimizada ({infoCompressao.finalKb} KB)
              </span>
            )}
          </div>

          {/* Inputs ocultos para Galeria e Câmera */}
          <input
            ref={inputGaleriaRef}
            type="file"
            accept="image/*"
            onChange={handleSelecionarArquivo}
            className="hidden"
          />
          <input
            ref={inputCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleSelecionarArquivo}
            className="hidden"
          />

          {!previewUrl ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={processandoImagem}
                onClick={() => inputGaleriaRef.current?.click()}
                className="h-28 rounded-2xl border-2 border-dashed border-superficie-borda hover:border-coral bg-superficie-fundo hover:bg-coral-suave/25 flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-urbano text-white flex items-center justify-center shadow-xs">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="font-display font-bold text-xs text-urbano-escuro">
                  Galeria
                </span>
              </button>

              <button
                type="button"
                disabled={processandoImagem}
                onClick={() => inputCameraRef.current?.click()}
                className="h-28 rounded-2xl border-2 border-dashed border-superficie-borda hover:border-coral bg-superficie-fundo hover:bg-coral-suave/25 flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-coral text-white flex items-center justify-center shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="font-display font-bold text-xs text-urbano-escuro">
                  Câmera
                </span>
              </button>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-superficie-borda">
              <img
                src={previewUrl}
                alt="Pré-visualização da denúncia"
                className="w-full h-44 object-cover"
              />
              <button
                type="button"
                onClick={removerImagem}
                className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-display font-semibold backdrop-blur-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                Trocar Foto
              </button>
            </div>
          )}

          {processandoImagem && (
            <div className="flex items-center gap-2 text-xs text-coral font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Lendo metadados GPS (EXIF) e comprimindo imagem...</span>
            </div>
          )}
        </section>

        {/* 3. SELETOR DE CATEGORIA */}
        <section className="bg-superficie-card rounded-2xl p-4 shadow-xs border border-superficie-borda space-y-2">
          <label
            htmlFor="select-categoria"
            className="block font-display font-bold text-sm text-urbano-escuro"
          >
            2. Categoria do Problema *
          </label>
          <select
            id="select-categoria"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl border border-superficie-borda bg-superficie-fundo text-sm text-urbano-escuro font-medium focus:outline-none focus:ring-2 focus:ring-coral"
            required
          >
            <option value="">Selecione o tipo de ocorrência...</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </section>

        {/* 4. BLOCO DE CONFIRMAÇÃO VISUAL DE LOCALIZAÇÃO (MINI-MAPA LEAFLET + NOMINATIM) */}
        <section className="bg-superficie-card rounded-2xl p-4 shadow-xs border border-superficie-borda space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-bold text-sm text-urbano-escuro">
                3. Localização da Ocorrência *
              </h2>
              <p className="text-[11px] text-slate-500">
                Toque no mapa ou arraste o pino coral para ajustar o ponto exato.
              </p>
            </div>

            <button
              type="button"
              onClick={obterGpsDispositivo}
              disabled={buscandoLocalizacao}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-superficie-fundo hover:bg-slate-200/70 border border-superficie-borda text-[11px] font-display font-bold text-urbano shrink-0 transition-colors"
            >
              <LocateFixed className="w-3.5 h-3.5 text-coral" />
              Usar meu GPS
            </button>
          </div>

          {/* Badge de Origem da Coordenada (EXIF / GPS / MAPA) */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-superficie-fundo border border-superficie-borda text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-status-resolvido shrink-0" />
              Origem:{' '}
              <strong className="text-urbano">
                {origemLocalizacao === 'EXIF'
                  ? 'Metadados EXIF da Foto'
                  : origemLocalizacao === 'GPS'
                    ? 'GPS do Dispositivo'
                    : origemLocalizacao === 'MAPA'
                      ? 'Ajustado no Mapa'
                      : 'Localização Inicial'}
              </strong>
            </span>
            {buscandoLocalizacao && (
              <span className="inline-flex items-center gap-1 text-[11px] text-coral font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Buscando rua...
              </span>
            )}
          </div>

          {avisoLocalizacao && (
            <p className="text-[11px] text-amber-700 bg-status-pendenteBg/70 px-3 py-2 rounded-xl border border-status-pendente/30">
              {avisoLocalizacao}
            </p>
          )}

          <MapaSeletor
            latitude={coordenadas.latitude}
            longitude={coordenadas.longitude}
            aoAlterarCoordenadas={(lat, lng) => atualizarEnderecoReverso(lat, lng, 'MAPA')}
            interativo={true}
            alturaClasse="h-48"
          />

          {/* Resumo Visual do Endereço Confirmado + Campos Editáveis */}
          <div className="p-3 rounded-xl bg-coral-suave/40 border border-coral/20 text-xs text-urbano-escuro">
            <span className="font-display font-bold text-coral block mb-0.5">
              Endereço confirmado:
            </span>
            <span>
              {enderecoAproximado || 'Selecione no mapa'} —{' '}
              <strong>Bairro: {bairro || 'Não informado'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            <div>
              <label
                htmlFor="input-endereco"
                className="block text-[11px] font-semibold text-slate-500 mb-1"
              >
                Rua e Número Aproximado
              </label>
              <input
                id="input-endereco"
                type="text"
                placeholder="Ex: Av. Barreto de Menezes, 450"
                value={enderecoAproximado}
                onChange={(e) => setEnderecoAproximado(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
                required
              />
            </div>

            <div>
              <label
                htmlFor="input-bairro"
                className="block text-[11px] font-semibold text-slate-500 mb-1"
              >
                Bairro
              </label>
              <input
                id="input-bairro"
                type="text"
                placeholder="Ex: Prazeres"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
                required
              />
            </div>
          </div>
        </section>

        {/* 5. CAMPO OBSERVAÇÃO */}
        <section className="bg-superficie-card rounded-2xl p-4 shadow-xs border border-superficie-borda space-y-2">
          <label
            htmlFor="textarea-observacao"
            className="block font-display font-bold text-sm text-urbano-escuro"
          >
            4. Observação / Ponto de Referência
          </label>
          <textarea
            id="textarea-observacao"
            rows={3}
            placeholder="Descreva detalhes do problema (ex: cratera aberta na faixa da direita próximo à parada de ônibus)..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full p-3 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
        </section>

        {/* 6. BOTÃO PUBLICAR DENÚNCIA */}
        <button
          type="submit"
          disabled={enviando || processandoImagem}
          className="bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-display font-bold text-sm rounded-full w-full py-3.5 shadow-lg transition-all active:scale-98"
        >
          {enviando ? 'Publicando Denúncia...' : 'Publicar Denúncia'}
        </button>
      </form>

      {/* Modal de Prevenção de Duplicidade num raio <= 40m */}
      <ModalDuplicata
        aberto={modalDuplicataAberto}
        denunciasProximas={duplicatasProximas}
        aoApoiarExistente={handleApoiarExistente}
        aoContinuarNova={handleContinuarMesmoAssim}
        aoFechar={handleContinuarMesmoAssim}
        apoiando={apoiandoDuplicata}
      />
    </div>
  );
}

export default NovaDenuncia;
