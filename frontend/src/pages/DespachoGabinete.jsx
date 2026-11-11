import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Heart,
  MapPin,
  User,
  ZoomIn,
  X,
  Check,
  MessageSquareQuote,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { MapaSeletor } from '../components/denuncia/MapaSeletor';
import { renderizarIconeCategoria } from '../components/denuncia/CardDenuncia';

const OPCOES_STATUS_PILULA = [
  {
    valor: 'PENDENTE',
    rotulo: 'Pendente',
    corAtiva: 'bg-status-pendente text-white border-status-pendente',
  },
  {
    valor: 'EM_ANALISE',
    rotulo: 'Em Análise',
    corAtiva: 'bg-status-analise text-white border-status-analise',
  },
  {
    valor: 'EM_ANDAMENTO',
    rotulo: 'Em Andamento',
    corAtiva: 'bg-blue-700 text-white border-blue-700',
  },
  {
    valor: 'RESOLVIDO',
    rotulo: 'Resolvido',
    corAtiva: 'bg-status-resolvido text-white border-status-resolvido',
  },
  {
    valor: 'REJEITADO',
    rotulo: 'Rejeitado',
    corAtiva: 'bg-status-rejeitado text-white border-status-rejeitado',
  },
];

const RESPOSTAS_RAPIDAS = [
  'A equipe técnica da Secretaria de Infraestrutura foi acionada e realizou vistoria no local.',
  'Serviço programado no cronograma de manutenção preventiva desta semana.',
  'Reparo concluído com sucesso pela equipe de zeladoria municipal. Agradecemos a colaboração!',
];

export function DespachoGabinete() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { estaAutenticado, isGestor } = useAuth();

  const [denuncia, setDenuncia] = useState(location.state?.denuncia || null);
  const [statusSelecionado, setStatusSelecionado] = useState(
    location.state?.denuncia?.status || 'EM_ANALISE'
  );
  const [respostaPrefeitura, setRespostaPrefeitura] = useState(
    location.state?.denuncia?.resposta_prefeitura || ''
  );

  const [carregando, setCarregando] = useState(!location.state?.denuncia);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [fotoAmpliadaAberta, setFotoAmpliadaAberta] = useState(false);

  useEffect(() => {
    async function buscarDetalhes() {
      if (!estaAutenticado || !isGestor) {
        setCarregando(false);
        return;
      }

      try {
        setCarregando(true);
        const { data } = await api.get('/gabinete/denuncias');
        const encontrada = Array.isArray(data)
          ? data.find((item) => Number(item.id) === Number(id))
          : null;

        if (encontrada) {
          setDenuncia(encontrada);
          setStatusSelecionado(encontrada.status);
          setRespostaPrefeitura(encontrada.resposta_prefeitura || '');
        } else if (!denuncia) {
          setErro('Denúncia não localizada na fila de triagem.');
        }
      } catch (err) {
        if (!denuncia) {
          setErro(
            err.response?.data?.erro ||
              'Erro ao carregar os detalhes da ocorrência.'
          );
        }
      } finally {
        setCarregando(false);
      }
    }

    buscarDetalhes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, estaAutenticado, isGestor]);

  if (!estaAutenticado || !isGestor) {
    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
        <div className="bg-superficie-card rounded-2xl p-6 border border-superficie-borda shadow-xs space-y-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-status-rejeitadoBg text-status-rejeitado flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-base text-urbano-escuro">
            Acesso Exclusivo do Gabinete
          </h2>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-full bg-urbano text-white font-display font-bold text-xs"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  async function handleSalvarDespacho(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');

    try {
      setSalvando(true);
      const { data } = await api.patch(`/gabinete/denuncias/${id}/status`, {
        status: statusSelecionado,
        resposta_prefeitura: respostaPrefeitura.trim() || null,
      });

      if (data?.denuncia) {
        setDenuncia(data.denuncia);
      }
      setSucesso('Despacho oficial salvo com sucesso!');

      setTimeout(() => {
        navigate('/gabinete/triagem');
      }, 900);
    } catch (err) {
      setErro(
        err.response?.data?.erro ||
          'Não foi possível salvar o despacho da prefeitura.'
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <div className="h-36 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!denuncia) {
    return (
      <div className="flex-1 p-4 text-center space-y-3">
        <p className="text-xs text-status-rejeitado font-medium">
          {erro || 'Denúncia não encontrada.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/gabinete/triagem')}
          className="px-5 py-2.5 rounded-full bg-urbano text-white text-xs font-display font-bold"
        >
          Voltar para a Fila de Triagem
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 pb-8 space-y-4">
      {/* 1. Breadcrumb + Badge Modo Gestor */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-display font-bold tracking-wider uppercase text-slate-400">
          TRIAGEM &gt; ATUALIZAR STATUS
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-coral text-white text-[10px] font-display font-bold">
          <ShieldCheck className="w-3 h-3" />
          Protocolo #{denuncia.id}
        </span>
      </div>

      {erro && (
        <div className="p-3.5 rounded-xl bg-status-rejeitadoBg border border-status-rejeitado/30 text-status-rejeitado text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {sucesso && (
        <div className="p-3.5 rounded-xl bg-status-resolvidoBg border border-status-resolvido/30 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      {/* 2. EVIDÊNCIAS LADO A LADO (Miniatura da Foto + Mini-Mapa com Pino Exato) */}
      <section className="grid grid-cols-2 gap-3">
        {/* Esquerda: Miniatura da Foto (Clicável para ampliar) */}
        <div className="bg-superficie-card rounded-2xl p-2 border border-superficie-borda shadow-2xs flex flex-col">
          <span className="text-[10px] font-display font-bold uppercase text-slate-400 px-1 mb-1">
            Foto do Relato
          </span>
          {denuncia.imagem_url ? (
            <button
              type="button"
              onClick={() => setFotoAmpliadaAberta(true)}
              className="relative flex-1 h-36 w-full rounded-xl overflow-hidden group"
            >
              <img
                src={denuncia.imagem_url}
                alt={denuncia.categoria?.nome || 'Evidência'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/75 text-white text-[10px] font-semibold backdrop-blur-xs">
                <ZoomIn className="w-3 h-3 text-coral" />
                Ampliar
              </span>
            </button>
          ) : (
            <div className="flex-1 h-36 rounded-xl bg-superficie-fundo border border-dashed border-superficie-borda flex flex-col items-center justify-center p-3 text-center gap-1.5">
              <div
                className="w-9 h-9 rounded-xl text-white flex items-center justify-center"
                style={{
                  backgroundColor: denuncia.categoria?.cor_hex || '#EA580C',
                }}
              >
                {renderizarIconeCategoria(denuncia.categoria?.icone, 'w-4 h-4')}
              </div>
              <span className="text-[11px] text-slate-400">
                Sem imagem anexada
              </span>
            </div>
          )}
        </div>

        {/* Direita: Mini-Mapa com Pino Exato */}
        <div className="bg-superficie-card rounded-2xl p-2 border border-superficie-borda shadow-2xs flex flex-col">
          <span className="text-[10px] font-display font-bold uppercase text-slate-400 px-1 mb-1">
            Localização GPS
          </span>
          <MapaSeletor
            latitude={Number(denuncia.latitude)}
            longitude={Number(denuncia.longitude)}
            interativo={false}
            alturaClasse="h-36"
          />
        </div>
      </section>

      {/* 3. DADOS DO RELATO */}
      <section className="bg-superficie-card rounded-2xl p-4 shadow-xs border border-superficie-borda space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display font-bold text-white"
            style={{ backgroundColor: denuncia.categoria?.cor_hex || '#1E293B' }}
          >
            {denuncia.categoria?.nome || 'Zeladoria Urbana'}
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-coral-suave text-coral text-xs font-display font-bold">
            <Heart className="w-3.5 h-3.5 fill-coral text-coral" />
            {denuncia.total_apoios ?? 1}{' '}
            {Number(denuncia.total_apoios) === 1 ? 'apoiador' : 'apoiadores'}
          </span>
        </div>

        <div className="text-xs space-y-1 pt-1">
          <p className="font-semibold text-urbano-escuro flex items-start gap-1.5">
            <MapPin className="w-4 h-4 text-coral shrink-0 mt-0.5" />
            <span>
              {denuncia.endereco_aproximado} — <strong>{denuncia.bairro}</strong>
            </span>
          </p>

          {denuncia.autor && (
            <p className="text-slate-500 flex items-center gap-1.5 pl-0.5">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Cidadão relator: <strong>{denuncia.autor.nome}</strong>
                {denuncia.autor.cpf ? ` (CPF: ${denuncia.autor.cpf})` : ''}
              </span>
            </p>
          )}
        </div>

        {denuncia.observacao && (
          <div className="p-3 rounded-xl bg-superficie-fundo border border-superficie-borda text-xs text-urbano-escuro">
            <span className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
              Relato do Cidadão:
            </span>
            {denuncia.observacao}
          </div>
        )}
      </section>

      {/* 4. FORMULÁRIO DE DESPACHO (Seletor de Status em Pílulas + Resposta Oficial) */}
      <form onSubmit={handleSalvarDespacho} className="space-y-4">
        <section className="bg-superficie-card rounded-2xl p-4 shadow-xs border border-superficie-borda space-y-3">
          <h2 className="font-display font-bold text-sm text-urbano-escuro">
            1. Selecionar Novo Status
          </h2>

          <div className="flex flex-wrap gap-2">
            {OPCOES_STATUS_PILULA.map((op) => {
              const ativo = statusSelecionado === op.valor;
              return (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => setStatusSelecionado(op.valor)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-display font-bold border transition-all ${
                    ativo
                      ? `${op.corAtiva} shadow-sm scale-[1.02]`
                      : 'bg-superficie-fundo text-slate-600 border-superficie-borda hover:border-slate-300'
                  }`}
                >
                  {ativo && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>{op.rotulo}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-superficie-card rounded-2xl p-4 shadow-xs border border-superficie-borda space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="textarea-resposta-prefeitura"
              className="font-display font-bold text-sm text-urbano-escuro flex items-center gap-1.5"
            >
              <MessageSquareQuote className="w-4 h-4 text-coral" />
              <span>2. Resposta Oficial da Prefeitura</span>
            </label>
          </div>

          <textarea
            id="textarea-resposta-prefeitura"
            rows={4}
            placeholder="Digite o parecer técnico ou posicionamento oficial que ficará visível para o cidadão autor e para todos os moradores apoiadores..."
            value={respostaPrefeitura}
            onChange={(e) => setRespostaPrefeitura(e.target.value)}
            className="w-full p-3 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro leading-relaxed focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />

          {/* Modelos rápidos para agilizar o despacho */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-semibold uppercase text-slate-400">
              Sugestões rápidas de resposta:
            </span>
            <div className="flex flex-col gap-1.5">
              {RESPOSTAS_RAPIDAS.map((textoModelo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRespostaPrefeitura(textoModelo)}
                  className="text-left text-[11px] text-slate-600 hover:text-urbano bg-superficie-fundo hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-superficie-borda transition-colors truncate"
                >
                  + &ldquo;{textoModelo}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={salvando}
          className="bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-display font-bold text-sm rounded-full w-full py-3.5 shadow-lg transition-all active:scale-98"
        >
          {salvando ? 'Salvando Despacho...' : 'Salvar Despacho'}
        </button>
      </form>

      {/* Lightbox de Ampliação da Foto */}
      {fotoAmpliadaAberta && denuncia.imagem_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          onClick={() => setFotoAmpliadaAberta(false)}
        >
          <div className="relative max-w-[410px] w-full">
            <button
              type="button"
              onClick={() => setFotoAmpliadaAberta(false)}
              className="absolute -top-11 right-0 p-2 rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={denuncia.imagem_url}
              alt="Evidência ampliada"
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DespachoGabinete;
