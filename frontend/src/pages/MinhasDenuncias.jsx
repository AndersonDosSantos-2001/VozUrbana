import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Megaphone,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { CardDenuncia } from '../components/denuncia/CardDenuncia';

export function MinhasDenuncias() {
  const navigate = useNavigate();
  const { estaAutenticado } = useAuth();

  const [denuncias, setDenuncias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abaFiltro, setAbaFiltro] = useState('TODAS'); // 'TODAS' | 'CRIADAS' | 'APOIADAS'
  const [apoiandoId, setApoiandoId] = useState(null);

  // Estado do Modal de Edição (apenas quando pode_editar_excluir === true)
  const [denunciaEmEdicao, setDenunciaEmEdicao] = useState(null);
  const [editCategoriaId, setEditCategoriaId] = useState('');
  const [editEndereco, setEditEndereco] = useState('');
  const [editBairro, setEditBairro] = useState('');
  const [editObservacao, setEditObservacao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState('');

  const carregarMinhasDenuncias = useCallback(async () => {
    if (!estaAutenticado) {
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro('');

      const [resMinhas, resCategorias] = await Promise.all([
        api.get('/denuncias/minhas'),
        api.get('/categorias'),
      ]);

      setDenuncias(Array.isArray(resMinhas.data) ? resMinhas.data : []);
      if (Array.isArray(resCategorias.data)) {
        setCategorias(resCategorias.data);
      }
    } catch (err) {
      setErro(
        err.response?.data?.erro ||
          'Não foi possível carregar suas denúncias no momento.'
      );
    } finally {
      setCarregando(false);
    }
  }, [estaAutenticado]);

  useEffect(() => {
    carregarMinhasDenuncias();
  }, [carregarMinhasDenuncias]);

  async function handleAlternarApoio(denuncia) {
    try {
      setApoiandoId(denuncia.id);
      const { data } = await api.post(`/denuncias/${denuncia.id}/apoiar`);

      setDenuncias((lista) =>
        lista.map((item) =>
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
      alert(err.response?.data?.erro || 'Erro ao atualizar apoio.');
    } finally {
      setApoiandoId(null);
    }
  }

  function abrirModalEdicao(denuncia) {
    if (!denuncia.pode_editar_excluir) return;
    setDenunciaEmEdicao(denuncia);
    setEditCategoriaId(String(denuncia.categoria_id || denuncia.categoria?.id || ''));
    setEditEndereco(denuncia.endereco_aproximado || '');
    setEditBairro(denuncia.bairro || '');
    setEditObservacao(denuncia.observacao || '');
    setErroEdicao('');
  }

  async function handleSalvarEdicao(e) {
    e.preventDefault();
    if (!denunciaEmEdicao) return;

    setErroEdicao('');
    try {
      setSalvandoEdicao(true);
      const { data } = await api.put(`/denuncias/${denunciaEmEdicao.id}`, {
        categoria_id: Number(editCategoriaId),
        endereco_aproximado: editEndereco.trim(),
        bairro: editBairro.trim(),
        observacao: editObservacao.trim(),
      });

      setDenuncias((lista) =>
        lista.map((item) => (item.id === denunciaEmEdicao.id ? data : item))
      );
      setDenunciaEmEdicao(null);
    } catch (err) {
      setErroEdicao(
        err.response?.data?.erro || 'Não foi possível salvar as alterações.'
      );
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function handleExcluirDenuncia(denuncia) {
    if (!denuncia.pode_editar_excluir) return;

    const confirmou = window.confirm(
      'Tem certeza que deseja apagar esta denúncia? Esta ação é permanente.'
    );
    if (!confirmou) return;

    try {
      await api.delete(`/denuncias/${denuncia.id}`);
      setDenuncias((lista) => lista.filter((item) => item.id !== denuncia.id));
    } catch (err) {
      alert(
        err.response?.data?.erro ||
          'Não foi possível excluir a denúncia.'
      );
    }
  }

  if (!estaAutenticado) {
    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
        <div className="bg-superficie-card rounded-2xl p-6 border border-superficie-borda shadow-xs space-y-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-coral-suave text-coral flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-base text-urbano-escuro">
            Acompanhe Suas Solicitações
          </h2>
          <p className="text-xs text-slate-500">
            Entre na sua conta para visualizar o status das denúncias que você criou ou apoiou e ler a resposta da Prefeitura.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-full bg-coral text-white font-display font-bold text-xs shadow-md"
          >
            Entrar na Minha Conta
          </button>
        </div>
      </div>
    );
  }

  const denunciasFiltradas = denuncias.filter((d) => {
    if (abaFiltro === 'CRIADAS') return Boolean(d.is_autor);
    if (abaFiltro === 'APOIADAS') return !d.is_autor;
    return true;
  });

  const totalCriadas = denuncias.filter((d) => d.is_autor).length;
  const totalApoiadas = denuncias.filter((d) => !d.is_autor).length;

  return (
    <div className="flex-1 p-4 pb-8 space-y-4">
      {/* Breadcrumb */}
      <div className="text-[11px] font-display font-bold tracking-wider uppercase text-slate-400">
        HOME &gt; MINHAS DENÚNCIAS
      </div>

      {/* Cabeçalho e Filtros Rápidos (Todas / Criadas / Apoiadas) */}
      <div className="bg-superficie-card rounded-2xl p-4 shadow-xs border border-superficie-borda space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-extrabold text-base text-urbano-escuro">
              Minhas Denúncias
            </h1>
            <p className="text-xs text-slate-500">
              Acompanhe o status e as respostas oficiais da Prefeitura
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/nova-denuncia')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-coral hover:bg-coral-hover text-white font-display font-bold text-xs shadow-xs transition-colors"
          >
            <Megaphone className="w-3.5 h-3.5" />
            Nova
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 bg-superficie-fundo p-1 rounded-xl border border-superficie-borda">
          <button
            type="button"
            onClick={() => setAbaFiltro('TODAS')}
            className={`py-2 rounded-lg font-display font-bold text-xs transition-all ${
              abaFiltro === 'TODAS'
                ? 'bg-urbano text-white shadow-2xs'
                : 'text-slate-500 hover:text-urbano'
            }`}
          >
            Todas ({denuncias.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaFiltro('CRIADAS')}
            className={`py-2 rounded-lg font-display font-bold text-xs transition-all ${
              abaFiltro === 'CRIADAS'
                ? 'bg-coral text-white shadow-2xs'
                : 'text-slate-500 hover:text-urbano'
            }`}
          >
            Criadas ({totalCriadas})
          </button>
          <button
            type="button"
            onClick={() => setAbaFiltro('APOIADAS')}
            className={`py-2 rounded-lg font-display font-bold text-xs transition-all ${
              abaFiltro === 'APOIADAS'
                ? 'bg-urbano text-white shadow-2xs'
                : 'text-slate-500 hover:text-urbano'
            }`}
          >
            Apoiando ({totalApoiadas})
          </button>
        </div>
      </div>

      {/* Lista de Cards */}
      {carregando ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="bg-superficie-card rounded-2xl p-4 border border-superficie-borda space-y-3 animate-pulse"
            >
              <div className="h-36 bg-slate-200 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-12 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : erro ? (
        <div className="bg-superficie-card rounded-2xl p-6 border border-superficie-borda text-center space-y-3">
          <p className="text-xs text-status-rejeitado font-medium">{erro}</p>
          <button
            type="button"
            onClick={carregarMinhasDenuncias}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-urbano text-white text-xs font-display font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recarregar
          </button>
        </div>
      ) : denunciasFiltradas.length === 0 ? (
        <div className="bg-superficie-card rounded-2xl p-8 border border-superficie-borda text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-urbano flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-sm text-urbano-escuro">
            Nenhum registro nesta categoria
          </h3>
          <p className="text-xs text-slate-500 max-w-[260px] mx-auto">
            Você ainda não possui denúncias listadas neste filtro. Registre uma nova ocorrência ou apoie relatos no Feed!
          </p>
          <button
            type="button"
            onClick={() => navigate('/nova-denuncia')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-coral text-white text-xs font-display font-bold shadow-sm"
          >
            Registrar Nova Denúncia
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {denunciasFiltradas.map((denuncia) => (
            <CardDenuncia
              key={denuncia.id}
              denuncia={denuncia}
              modo="minhas"
              aoAlternarApoio={handleAlternarApoio}
              aoEditar={abrirModalEdicao}
              aoExcluir={handleExcluirDenuncia}
              apoiandoEmProgresso={apoiandoId === denuncia.id}
            />
          ))}
        </div>
      )}

      {/* Modal de Edição de Denúncia (Apenas Autor + Status PENDENTE) */}
      {denunciaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-[395px] bg-superficie-card rounded-2xl shadow-2xl border border-superficie-borda p-5 relative">
            <button
              type="button"
              onClick={() => setDenunciaEmEdicao(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-bold text-base text-urbano-escuro mb-1">
              Editar Minha Denúncia
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Alteração permitida enquanto o status estiver como <strong>Pendente</strong>.
            </p>

            {erroEdicao && (
              <div className="mb-3 p-3 rounded-xl bg-status-rejeitadoBg text-status-rejeitado text-xs font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erroEdicao}</span>
              </div>
            )}

            <form onSubmit={handleSalvarEdicao} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-urbano mb-1">
                  Categoria
                </label>
                <select
                  value={editCategoriaId}
                  onChange={(e) => setEditCategoriaId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro"
                  required
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-urbano mb-1">
                  Endereço Aproximado
                </label>
                <input
                  type="text"
                  value={editEndereco}
                  onChange={(e) => setEditEndereco(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-urbano mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={editBairro}
                  onChange={(e) => setEditBairro(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-urbano mb-1">
                  Observação
                </label>
                <textarea
                  rows={3}
                  value={editObservacao}
                  onChange={(e) => setEditObservacao(e.target.value)}
                  className="w-full p-3 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDenunciaEmEdicao(null)}
                  className="flex-1 py-2.5 rounded-full border border-superficie-borda text-xs font-display font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-coral hover:bg-coral-hover text-white text-xs font-display font-bold shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MinhasDenuncias;
