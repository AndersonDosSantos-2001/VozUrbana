import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone,
  BarChart3,
  SlidersHorizontal,
  ChevronDown,
  Search,
  RefreshCw,
  MapPin,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LogoVozUrbana } from '../components/layout/LogoVozUrbana';
import { CardDenuncia } from '../components/denuncia/CardDenuncia';

const OPCOES_ORDENACAO = [
  { valor: 'mais_recentes', rotulo: 'Mais Recentes' },
  { valor: 'mais_curtidas', rotulo: 'Mais Curtidas' },
  { valor: 'menor_distancia', rotulo: 'Menor Distância' },
  { valor: 'maior_distancia', rotulo: 'Maior Distância' },
];

const OPCOES_STATUS = [
  { valor: 'TODOS', rotulo: 'Todos os Status' },
  { valor: 'PENDENTE', rotulo: 'Pendente' },
  { valor: 'EM_ANALISE', rotulo: 'Em Análise' },
  { valor: 'EM_ANDAMENTO', rotulo: 'Em Andamento' },
  { valor: 'RESOLVIDO', rotulo: 'Resolvido' },
];

export function HomeFeed() {
  const navigate = useNavigate();
  const { estaAutenticado } = useAuth();

  const [denuncias, setDenuncias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [bairrosDisponiveis, setBairrosDisponiveis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [apoiandoId, setApoiandoId] = useState(null);

  // Filtros do Feed
  const [painelFiltroAberto, setPainelFiltroAberto] = useState(false);
  const [ordenar, setOrdenar] = useState('mais_recentes');
  const [categoriaId, setCategoriaId] = useState('');
  const [bairroFiltro, setBairroFiltro] = useState('TODOS');
  const [statusFiltro, setStatusFiltro] = useState('TODOS');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [gpsUsuario, setGpsUsuario] = useState(null);

  // Tenta obter GPS silenciosamente para calcular distancia_km nos cards do Feed
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsUsuario({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
      },
      () => {
        // Segue sem coordenadas caso o visitante não autorize
      },
      { timeout: 6000, maximumAge: 60000 }
    );
  }, []);

  // Carrega categorias e bairros para os seletores de filtro
  useEffect(() => {
    async function carregarMetadados() {
      try {
        const [resCat, resBairros] = await Promise.allSettled([
          api.get('/categorias'),
          api.get('/dashboard/bairros'),
        ]);

        if (resCat.status === 'fulfilled' && Array.isArray(resCat.value.data)) {
          setCategorias(resCat.value.data);
        }
        if (resBairros.status === 'fulfilled' && Array.isArray(resBairros.value.data)) {
          setBairrosDisponiveis(resBairros.value.data);
        }
      } catch {
        // Ignora falha silenciosa de metadados secundários
      }
    }
    carregarMetadados();
  }, []);

  const carregarFeed = useCallback(async () => {
    try {
      setCarregando(true);
      setErro('');

      const params = {
        ordenar,
      };

      if (gpsUsuario?.lat && gpsUsuario?.lng) {
        params.lat = gpsUsuario.lat;
        params.lng = gpsUsuario.lng;
      }
      if (categoriaId) params.categoria_id = categoriaId;
      if (bairroFiltro && bairroFiltro !== 'TODOS') params.bairro = bairroFiltro;
      if (statusFiltro && statusFiltro !== 'TODOS') params.status = statusFiltro;
      if (buscaTexto.trim()) params.busca = buscaTexto.trim();

      const { data } = await api.get('/denuncias', { params });
      setDenuncias(Array.isArray(data) ? data : []);
    } catch (err) {
      setErro(
        err.response?.data?.erro ||
          'Não foi possível carregar o feed de denúncias no momento.'
      );
    } finally {
      setCarregando(false);
    }
  }, [ordenar, gpsUsuario, categoriaId, bairroFiltro, statusFiltro, buscaTexto]);

  useEffect(() => {
    carregarFeed();
  }, [carregarFeed]);

  async function handleAlternarApoio(denuncia) {
    if (!estaAutenticado) {
      navigate('/login');
      return;
    }

    try {
      setApoiandoId(denuncia.id);
      const { data } = await api.post(`/denuncias/${denuncia.id}/apoiar`);

      setDenuncias((listaAtual) =>
        listaAtual.map((item) =>
          item.id === denuncia.id
            ? {
                ...item,
                apoiado_pelo_usuario: data.apoiado,
                total_apoios: data.total_apoios,
              }
            : item
        )
      );
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao registrar apoio na denúncia.');
    } finally {
      setApoiandoId(null);
    }
  }

  function limparFiltros() {
    setOrdenar('mais_recentes');
    setCategoriaId('');
    setBairroFiltro('TODOS');
    setStatusFiltro('TODOS');
    setBuscaTexto('');
  }

  const possuiFiltrosAtivos =
    ordenar !== 'mais_recentes' ||
    categoriaId !== '' ||
    bairroFiltro !== 'TODOS' ||
    statusFiltro !== 'TODOS' ||
    buscaTexto.trim() !== '';

  return (
    <div className="flex-1 p-4 pb-8 space-y-4">
      {/* 1. HERO CARD SUPERIOR */}
      <section className="bg-superficie-card rounded-2xl p-5 shadow-xs border border-superficie-borda text-center">
        <div className="flex justify-center mb-3">
          <LogoVozUrbana tema="claro" tamanho="lg" />
        </div>
        <p className="text-xs text-slate-500 mb-4 max-w-[310px] mx-auto">
          Relate problemas na sua rua ou apoie solicitações dos seus vizinhos para priorizar melhorias.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/nova-denuncia')}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-coral hover:bg-coral-hover text-white font-display font-bold text-sm shadow-md transition-all active:scale-98"
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span>Denunciar</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/graficos')}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-urbano hover:bg-urbano-claro text-white font-display font-bold text-sm shadow-md transition-all active:scale-98"
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-coral" />
            <span>Gráfico</span>
          </button>
        </div>
      </section>

      {/* 2. BARRA DO FEED DE DENÚNCIAS + BOTÃO FILTRO ▼ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-base text-urbano-escuro">
              Feed de Denúncias
            </h2>
            <p className="text-[11px] text-slate-500">
              {denuncias.length}{' '}
              {denuncias.length === 1 ? 'ocorrência listada' : 'ocorrências listadas'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPainelFiltroAberto((aberto) => !aberto)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-display font-bold border transition-colors ${
              painelFiltroAberto || possuiFiltrosAtivos
                ? 'bg-urbano text-white border-urbano'
                : 'bg-white text-urbano border-superficie-borda hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-coral" />
            <span>filtro</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                painelFiltroAberto ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Painel Retrátil de Filtros Combináveis */}
        {painelFiltroAberto && (
          <div className="bg-superficie-card rounded-2xl p-4 shadow-sm border border-superficie-borda space-y-3 animate-in fade-in duration-150">
            {/* Busca por Rua ou Observação */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar rua, bairro ou palavra-chave..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
              />
              {buscaTexto && (
                <button
                  type="button"
                  onClick={() => setBuscaTexto('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Ordenação Rápida em Pílulas */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                Ordenar por:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {OPCOES_ORDENACAO.map((op) => (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => setOrdenar(op.valor)}
                    className={`py-2 px-3 rounded-xl text-xs font-display font-bold border transition-colors ${
                      ordenar === op.valor
                        ? 'bg-coral text-white border-coral shadow-2xs'
                        : 'bg-superficie-fundo text-slate-600 border-superficie-borda hover:border-slate-300'
                    }`}
                  >
                    {op.rotulo}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletores de Categoria, Bairro e Status */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Categoria
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
                >
                  <option value="">Todas</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Bairro
                </label>
                <select
                  value={bairroFiltro}
                  onChange={(e) => setBairroFiltro(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
                >
                  <option value="TODOS">Todos os Bairros</option>
                  {bairrosDisponiveis.map((b) => (
                    <option key={b.bairro} value={b.bairro}>
                      {b.bairro} ({b.total_denuncias})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="flex-1 px-2.5 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
              >
                {OPCOES_STATUS.map((st) => (
                  <option key={st.valor} value={st.valor}>
                    {st.rotulo}
                  </option>
                ))}
              </select>

              {possuiFiltrosAtivos && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="px-3 py-2 rounded-xl text-xs font-display font-semibold text-coral hover:bg-coral-suave/50 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Listagem de Cards do Feed */}
        {carregando ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-superficie-card rounded-2xl border border-superficie-borda p-4 space-y-3 animate-pulse"
              >
                <div className="h-36 bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : erro ? (
          <div className="bg-superficie-card rounded-2xl p-6 border border-superficie-borda text-center space-y-3">
            <p className="text-xs text-status-rejeitado font-medium">{erro}</p>
            <button
              type="button"
              onClick={carregarFeed}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-urbano text-white text-xs font-display font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar Novamente
            </button>
          </div>
        ) : denuncias.length === 0 ? (
          <div className="bg-superficie-card rounded-2xl p-8 border border-superficie-borda text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-coral-suave text-coral flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-sm text-urbano-escuro">
              Nenhuma denúncia encontrada
            </h3>
            <p className="text-xs text-slate-500 max-w-[260px] mx-auto">
              {possuiFiltrosAtivos
                ? 'Tente ajustar ou limpar os filtros selecionados para ver mais relatos.'
                : 'Seja o primeiro a registrar uma solicitação de zeladoria na sua região!'}
            </p>
            <button
              type="button"
              onClick={() =>
                possuiFiltrosAtivos ? limparFiltros() : navigate('/nova-denuncia')
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-coral hover:bg-coral-hover text-white text-xs font-display font-bold shadow-sm transition-colors"
            >
              {possuiFiltrosAtivos ? 'Limpar Filtros' : 'Registrar Denúncia'}
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {denuncias.map((denuncia) => (
              <CardDenuncia
                key={denuncia.id}
                denuncia={denuncia}
                modo="feed"
                aoAlternarApoio={handleAlternarApoio}
                apoiandoEmProgresso={apoiandoId === denuncia.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default HomeFeed;
