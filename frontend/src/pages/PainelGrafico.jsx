import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone,
  SlidersHorizontal,
  ChevronDown,
  PieChart as PieChartIcon,
  BarChart3,
  Heart,
  CheckCircle2,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { GraficoPizza } from '../components/dashboard/GraficoPizza';
import { GraficoColunas } from '../components/dashboard/GraficoColunas';

export function PainelGrafico() {
  const navigate = useNavigate();

  const [estatisticas, setEstatisticas] = useState(null);
  const [bairrosDisponiveis, setBairrosDisponiveis] = useState([]);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Controles de filtro e visualização
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [bairroSelecionado, setBairroSelecionado] = useState('TODOS');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('TODAS');
  const [statusSelecionado, setStatusSelecionado] = useState('TODOS');
  const [periodoDias, setPeriodoDias] = useState('');
  const [metricaAtiva, setMetricaAtiva] = useState('denuncias'); // 'denuncias' | 'curtidas'
  const [abaRanking, setAbaRanking] = useState('categorias'); // 'categorias' | 'bairros'

  useEffect(() => {
    async function carregarListasAuxiliares() {
      try {
        const [resBairros, resCats] = await Promise.allSettled([
          api.get('/dashboard/bairros'),
          api.get('/categorias'),
        ]);
        if (resBairros.status === 'fulfilled' && Array.isArray(resBairros.value.data)) {
          setBairrosDisponiveis(resBairros.value.data);
        }
        if (resCats.status === 'fulfilled' && Array.isArray(resCats.value.data)) {
          setCategoriasDisponiveis(resCats.value.data);
        }
      } catch {
        // Ignora erro de listas auxiliares
      }
    }
    carregarListasAuxiliares();
  }, []);

  const carregarEstatisticas = useCallback(async () => {
    try {
      setCarregando(true);
      setErro('');

      const params = {};
      if (bairroSelecionado && bairroSelecionado !== 'TODOS') {
        params.bairro = bairroSelecionado;
      }
      if (statusSelecionado && statusSelecionado !== 'TODOS') {
        params.status = statusSelecionado;
      }
      if (periodoDias) {
        params.periodo_dias = periodoDias;
      }

      const { data } = await api.get('/dashboard/estatisticas', { params });
      setEstatisticas(data);
    } catch (err) {
      setErro(
        err.response?.data?.erro ||
          'Não foi possível carregar as estatísticas do Dashboard.'
      );
    } finally {
      setCarregando(false);
    }
  }, [bairroSelecionado, statusSelecionado, periodoDias]);

  useEffect(() => {
    carregarEstatisticas();
  }, [carregarEstatisticas]);

  const resumoGeral = estatisticas?.resumo_geral || {
    total_denuncias: 0,
    total_apoios_acumulados: 0,
    taxa_resolucao_percentual: 0,
  };

  const categoriasBrutas = estatisticas?.por_categoria || [];
  const dadosPorCategoria =
    categoriaSelecionada === 'TODAS'
      ? categoriasBrutas
      : categoriasBrutas.filter(
          (c) => String(c.categoria_id) === String(categoriaSelecionada)
        );

  const areasCriticas = estatisticas?.areas_mais_criticas || [];
  const totalDenunciasBase = Math.max(1, Number(resumoGeral.total_denuncias) || 1);

  function limparFiltros() {
    setBairroSelecionado('TODOS');
    setCategoriaSelecionada('TODAS');
    setStatusSelecionado('TODOS');
    setPeriodoDias('');
    setMetricaAtiva('denuncias');
  }

  return (
    <div className="flex-1 p-4 pb-8 space-y-4">
      {/* 1. Breadcrumb */}
      <div className="text-[11px] font-display font-bold tracking-wider uppercase text-slate-400">
        HOME &gt; GRÁFICO DE DENÚNCIAS
      </div>

      {/* Resumo Rápido de Indicadores */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="bg-superficie-card rounded-2xl p-3 border border-superficie-borda shadow-2xs text-center">
          <span className="block text-[10px] font-semibold uppercase text-slate-400">
            Denúncias
          </span>
          <strong className="font-display font-extrabold text-lg text-urbano-escuro">
            {resumoGeral.total_denuncias}
          </strong>
        </div>

        <div className="bg-superficie-card rounded-2xl p-3 border border-superficie-borda shadow-2xs text-center">
          <span className="block text-[10px] font-semibold uppercase text-slate-400">
            Curtidas
          </span>
          <strong className="font-display font-extrabold text-lg text-coral inline-flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 fill-coral text-coral" />
            {resumoGeral.total_apoios_acumulados}
          </strong>
        </div>

        <div className="bg-superficie-card rounded-2xl p-3 border border-superficie-borda shadow-2xs text-center">
          <span className="block text-[10px] font-semibold uppercase text-slate-400">
            Resolução
          </span>
          <strong className="font-display font-extrabold text-lg text-status-resolvido inline-flex items-center gap-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {resumoGeral.taxa_resolucao_percentual}%
          </strong>
        </div>
      </section>

      {/* 2. CARD VISUAL DE GRÁFICOS (RECHARTS: ROSCA/PIZZA + COLUNAS) */}
      <section className="bg-superficie-card rounded-2xl p-4 shadow-xs border border-superficie-borda space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-display font-extrabold text-sm text-urbano-escuro">
              Panorama da Zeladoria Urbana
            </h1>
            <p className="text-[11px] text-slate-500">
              {bairroSelecionado !== 'TODOS'
                ? `Bairro filtrado: ${bairroSelecionado}`
                : 'Consolidado de toda a cidade'}
            </p>
          </div>

          {/* Alternador de Métrica (Por Volume vs Mais Curtidas) */}
          <div className="inline-flex bg-superficie-fundo p-1 rounded-xl border border-superficie-borda">
            <button
              type="button"
              onClick={() => setMetricaAtiva('denuncias')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-bold transition-colors ${
                metricaAtiva === 'denuncias'
                  ? 'bg-urbano text-white'
                  : 'text-slate-500 hover:text-urbano'
              }`}
            >
              Volume
            </button>
            <button
              type="button"
              onClick={() => setMetricaAtiva('curtidas')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-bold transition-colors ${
                metricaAtiva === 'curtidas'
                  ? 'bg-coral text-white'
                  : 'text-slate-500 hover:text-urbano'
              }`}
            >
              Curtidas
            </button>
          </div>
        </div>

        {carregando ? (
          <div className="h-52 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-3 border-coral border-t-transparent animate-spin" />
          </div>
        ) : erro ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-status-rejeitado">{erro}</p>
            <button
              type="button"
              onClick={carregarEstatisticas}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-urbano text-white text-xs font-display font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recarregar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 items-center pt-1">
            {/* Esquerda: Gráfico de Rosca / Pizza */}
            <div className="bg-superficie-fundo rounded-xl p-2 border border-superficie-borda/70">
              <div className="flex items-center gap-1 text-[11px] font-display font-bold text-urbano mb-1 px-1">
                <PieChartIcon className="w-3.5 h-3.5 text-coral" />
                <span>Proporção (%)</span>
              </div>
              <GraficoPizza dados={dadosPorCategoria} metrica={metricaAtiva} />
            </div>

            {/* Direita: Gráfico de Colunas */}
            <div className="bg-superficie-fundo rounded-xl p-2 border border-superficie-borda/70">
              <div className="flex items-center gap-1 text-[11px] font-display font-bold text-urbano mb-1 px-1">
                <BarChart3 className="w-3.5 h-3.5 text-coral" />
                <span>Comparativo</span>
              </div>
              <GraficoColunas dados={dadosPorCategoria} metrica={metricaAtiva} />
            </div>
          </div>
        )}
      </section>

      {/* 3. BARRA DE AÇÃO E FILTRO */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/nova-denuncia')}
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-coral hover:bg-coral-hover text-white font-display font-bold text-xs shadow-md transition-colors"
          >
            <Megaphone className="w-4 h-4" />
            Denunciar
          </button>

          <button
            type="button"
            onClick={() => setFiltroAberto((v) => !v)}
            className={`inline-flex items-center gap-1.5 py-2.5 px-4 rounded-full text-xs font-display font-bold border transition-colors ${
              filtroAberto
                ? 'bg-urbano text-white border-urbano'
                : 'bg-white text-urbano border-superficie-borda hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-coral" />
            <span>filtro</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                filtroAberto ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Painel de Filtros do Gráfico (Bairro, Categoria, Status, Período) */}
        {filtroAberto && (
          <div className="bg-superficie-card rounded-2xl p-4 shadow-sm border border-superficie-borda space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Filtrar por Bairro
                </label>
                <select
                  value={bairroSelecionado}
                  onChange={(e) => setBairroSelecionado(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro"
                >
                  <option value="TODOS">Todos os Bairros</option>
                  {bairrosDisponiveis.map((b) => (
                    <option key={b.bairro} value={b.bairro}>
                      {b.bairro} ({b.total_denuncias})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Filtrar por Categoria
                </label>
                <select
                  value={categoriaSelecionada}
                  onChange={(e) => setCategoriaSelecionada(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro"
                >
                  <option value="TODAS">Todas as Categorias</option>
                  {categoriasDisponiveis.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Status
                </label>
                <select
                  value={statusSelecionado}
                  onChange={(e) => setStatusSelecionado(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="PENDENTE">Pendentes</option>
                  <option value="EM_ANALISE">Em Análise</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="RESOLVIDO">Resolvidos</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Período
                </label>
                <select
                  value={periodoDias}
                  onChange={(e) => setPeriodoDias(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-superficie-borda bg-superficie-fundo text-xs text-urbano-escuro"
                >
                  <option value="">Todo o histórico</option>
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={limparFiltros}
                className="text-xs font-display font-bold text-coral hover:underline"
              >
                Restaurar filtros padrão
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. CARD "RANKING DAS DENÚNCIAS" (Barras de Progresso em %) */}
      <section className="bg-superficie-card rounded-2xl p-4 shadow-xs border border-superficie-borda space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-extrabold text-sm text-urbano-escuro">
            Ranking das denúncias
          </h2>

          <div className="inline-flex bg-superficie-fundo p-1 rounded-xl border border-superficie-borda">
            <button
              type="button"
              onClick={() => setAbaRanking('categorias')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-bold transition-colors ${
                abaRanking === 'categorias'
                  ? 'bg-urbano text-white'
                  : 'text-slate-500 hover:text-urbano'
              }`}
            >
              Categorias
            </button>
            <button
              type="button"
              onClick={() => setAbaRanking('bairros')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-bold transition-colors ${
                abaRanking === 'bairros'
                  ? 'bg-urbano text-white'
                  : 'text-slate-500 hover:text-urbano'
              }`}
            >
              Bairros
            </button>
          </div>
        </div>

        {abaRanking === 'categorias' ? (
          dadosPorCategoria.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Nenhuma categoria registrada para os filtros aplicados.
            </p>
          ) : (
            <div className="space-y-3">
              {dadosPorCategoria.map((item) => {
                const pct = Math.min(100, Math.round(Number(item.percentual) || 0));
                return (
                  <div key={item.categoria_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-bold text-urbano-escuro flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.cor_hex || '#EA580C' }}
                        />
                        {item.nome}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400">
                          {item.total_denuncias} relatos • ❤️ {item.total_curtidas}
                        </span>
                        <span className="font-display font-extrabold text-urbano-escuro w-10 text-right">
                          {pct}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(4, pct)}%`,
                          backgroundColor: item.cor_hex || '#EA580C',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : areasCriticas.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            Nenhum bairro registrado para os filtros aplicados.
          </p>
        ) : (
          <div className="space-y-3">
            {areasCriticas.map((area, index) => {
              const pctBairro = Math.min(
                100,
                Math.round((Number(area.total_denuncias) / totalDenunciasBase) * 100)
              );
              return (
                <div key={area.bairro} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setBairroSelecionado(area.bairro)}
                      className="font-display font-bold text-urbano-escuro hover:text-coral flex items-center gap-1.5 truncate text-left"
                    >
                      <MapPin className="w-3.5 h-3.5 text-coral shrink-0" />
                      <span>
                        {index + 1}º {area.bairro}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">
                        {area.total_denuncias} relatos • ❤️ {area.total_curtidas}
                      </span>
                      <span className="font-display font-extrabold text-urbano-escuro w-10 text-right">
                        {pctBairro}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-urbano transition-all duration-500"
                      style={{ width: `${Math.max(5, pctBairro)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default PainelGrafico;
