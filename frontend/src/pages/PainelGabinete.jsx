import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { CardDenuncia } from '../components/denuncia/CardDenuncia';

export function PainelGabinete() {
  const navigate = useNavigate();
  const { estaAutenticado, isGestor } = useAuth();

  const [denuncias, setDenuncias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Filtros e ordenação da fila de triagem
  const [ordenar, setOrdenar] = useState('prioridade'); // 'prioridade' | 'antiguidade' | 'mais_recentes'
  const [statusFiltro, setStatusFiltro] = useState('TODOS');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');

  const carregarFilaTriagem = useCallback(async () => {
    if (!estaAutenticado || !isGestor) {
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro('');

      const params = { ordenar };
      if (statusFiltro && statusFiltro !== 'TODOS') {
        params.status = statusFiltro;
      }
      if (categoriaFiltro) {
        params.categoria_id = categoriaFiltro;
      }
      if (buscaTexto.trim()) {
        params.busca = buscaTexto.trim();
      }

      const [resFila, resCats] = await Promise.all([
        api.get('/gabinete/denuncias', { params }),
        api.get('/categorias'),
      ]);

      setDenuncias(Array.isArray(resFila.data) ? resFila.data : []);
      if (Array.isArray(resCats.data)) {
        setCategorias(resCats.data);
      }
    } catch (err) {
      setErro(
        err.response?.data?.erro ||
          'Não foi possível carregar a fila de triagem do Gabinete.'
      );
    } finally {
      setCarregando(false);
    }
  }, [estaAutenticado, isGestor, ordenar, statusFiltro, categoriaFiltro, buscaTexto]);

  useEffect(() => {
    carregarFilaTriagem();
  }, [carregarFilaTriagem]);

  // Proteção visual RBAC (além da proteção criptográfica no backend via gestorMiddleware)
  if (!estaAutenticado || !isGestor) {
    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
        <div className="bg-superficie-card rounded-2xl p-6 border border-superficie-borda shadow-xs space-y-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-status-rejeitadoBg text-status-rejeitado flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-base text-urbano-escuro">
            Acesso Restrito ao Gabinete da Prefeitura
          </h2>
          <p className="text-xs text-slate-500">
            Esta área é exclusiva para servidores autenticados com perfil{' '}
            <strong>GESTOR</strong>.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-full bg-urbano text-white font-display font-bold text-xs shadow-md"
          >
            Autenticar como Gestor
          </button>
        </div>
      </div>
    );
  }

  // Cálculo dos 3 KPIs de Triagem
  const totalPendentes = denuncias.filter((d) => d.status === 'PENDENTE').length;
  const totalEmAnalise = denuncias.filter(
    (d) => d.status === 'EM_ANALISE' || d.status === 'EM_ANDAMENTO'
  ).length;
  const totalResolvidas = denuncias.filter((d) => d.status === 'RESOLVIDO').length;

  function abrirDespacho(denuncia) {
    navigate(`/gabinete/denuncias/${denuncia.id}`, {
      state: { denuncia },
    });
  }

  return (
    <div className="flex-1 p-4 pb-8 space-y-4">
      {/* 1. CABEÇALHO DE CONTEXTO: Breadcrumb + Pílula Modo Gestor */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-display font-bold tracking-wider uppercase text-slate-400">
          HOME &gt; TRIAGEM
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral text-white text-[11px] font-display font-bold shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          Modo Gestor
        </span>
      </div>

      {/* 2. BLOCO DE KPIs (3 Cards Coloridos Lado a Lado) */}
      <section className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() =>
            setStatusFiltro((atual) => (atual === 'PENDENTE' ? 'TODOS' : 'PENDENTE'))
          }
          className={`rounded-2xl p-3.5 text-left text-white shadow-md transition-transform active:scale-95 ${
            statusFiltro === 'PENDENTE' ? 'ring-2 ring-urbano ring-offset-2' : ''
          }`}
          style={{ backgroundColor: '#F59E0B' }}
        >
          <span className="block text-[11px] font-display font-semibold opacity-95">
            Pendentes
          </span>
          <strong className="font-display font-extrabold text-2xl block mt-0.5">
            {totalPendentes}
          </strong>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFiltro((atual) =>
              atual === 'EM_ANALISE' ? 'TODOS' : 'EM_ANALISE'
            )
          }
          className={`rounded-2xl p-3.5 text-left text-white shadow-md transition-transform active:scale-95 ${
            statusFiltro === 'EM_ANALISE' ? 'ring-2 ring-urbano ring-offset-2' : ''
          }`}
          style={{ backgroundColor: '#2563EB' }}
        >
          <span className="block text-[11px] font-display font-semibold opacity-95">
            Em Análise
          </span>
          <strong className="font-display font-extrabold text-2xl block mt-0.5">
            {totalEmAnalise}
          </strong>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFiltro((atual) => (atual === 'RESOLVIDO' ? 'TODOS' : 'RESOLVIDO'))
          }
          className={`rounded-2xl p-3.5 text-left text-white shadow-md transition-transform active:scale-95 ${
            statusFiltro === 'RESOLVIDO' ? 'ring-2 ring-urbano ring-offset-2' : ''
          }`}
          style={{ backgroundColor: '#10B981' }}
        >
          <span className="block text-[11px] font-display font-semibold opacity-95">
            Resolvidas
          </span>
          <strong className="font-display font-extrabold text-2xl block mt-0.5">
            {totalResolvidas}
          </strong>
        </button>
      </section>

      {/* 3. BARRA DE ORDENAÇÃO E FILTROS DA FILA */}
      <section className="bg-superficie-card rounded-2xl p-3.5 shadow-xs border border-superficie-borda space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-display font-bold text-urbano">
            <ArrowUpDown className="w-4 h-4 text-coral shrink-0" />
            <span>Ordenar por:</span>
          </div>

          <select
            value={ordenar}
            onChange={(e) => setOrdenar(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs font-display font-bold text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="prioridade">Mais Apoiadas ▼</option>
            <option value="antiguidade">Mais Antigas (Fila)</option>
            <option value="mais_recentes">Mais Recentes</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="RESOLVIDO">Resolvidos</option>
            <option value="REJEITADO">Rejeitados</option>
          </select>

          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro"
          >
            <option value="">Todas as Categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por rua, bairro ou observação..."
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
      </section>

      {/* 4. LISTA DE CARDS DE TRIAGEM */}
      {carregando ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-superficie-card rounded-2xl p-4 border border-superficie-borda space-y-3 animate-pulse"
            >
              <div className="h-36 bg-slate-200 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-9 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : erro ? (
        <div className="bg-superficie-card rounded-2xl p-6 border border-superficie-borda text-center space-y-3">
          <p className="text-xs text-status-rejeitado font-medium">{erro}</p>
          <button
            type="button"
            onClick={carregarFilaTriagem}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-urbano text-white text-xs font-display font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recarregar Fila
          </button>
        </div>
      ) : denuncias.length === 0 ? (
        <div className="bg-superficie-card rounded-2xl p-8 border border-superficie-borda text-center space-y-2">
          <p className="font-display font-bold text-sm text-urbano-escuro">
            Nenhuma ocorrência na fila para este filtro
          </p>
          <p className="text-xs text-slate-500">
            Altere o seletor de status ou categoria acima para visualizar mais solicitações.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {denuncias.map((denuncia) => (
            <CardDenuncia
              key={denuncia.id}
              denuncia={denuncia}
              modo="triagem"
              aoGerenciarStatus={abrirDespacho}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PainelGabinete;
