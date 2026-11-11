import {
  Heart,
  MapPin,
  Pencil,
  Trash2,
  MessageSquareQuote,
  Settings2,
  Clock,
  AlertTriangle,
  LightbulbOff,
  Droplets,
  Trash,
  Construction,
} from 'lucide-react';

const MAPA_STATUS = {
  PENDENTE: {
    rotulo: 'Pendente',
    classes: 'bg-status-pendenteBg text-amber-800 border-status-pendente/40',
    ponto: 'bg-status-pendente',
  },
  EM_ANALISE: {
    rotulo: 'Em Análise',
    classes: 'bg-status-analiseBg text-status-analise border-status-analise/40',
    ponto: 'bg-status-analise',
  },
  EM_ANDAMENTO: {
    rotulo: 'Em Andamento',
    classes: 'bg-status-analiseBg text-status-analise border-status-analise/40',
    ponto: 'bg-status-analise',
  },
  RESOLVIDO: {
    rotulo: 'Resolvido',
    classes: 'bg-status-resolvidoBg text-emerald-800 border-status-resolvido/40',
    ponto: 'bg-status-resolvido',
  },
  REJEITADO: {
    rotulo: 'Rejeitado',
    classes: 'bg-status-rejeitadoBg text-status-rejeitado border-status-rejeitado/40',
    ponto: 'bg-status-rejeitado',
  },
};

export function renderizarIconeCategoria(iconeNome, className = 'w-5 h-5') {
  switch (iconeNome) {
    case 'road':
      return <Construction className={className} />;
    case 'lightbulb-off':
      return <LightbulbOff className={className} />;
    case 'droplet-off':
      return <Droplets className={className} />;
    case 'trash-2':
      return <Trash className={className} />;
    default:
      return <AlertTriangle className={className} />;
  }
}

export function formatarDistanciaTexto(distanciaKm) {
  if (distanciaKm === null || distanciaKm === undefined || Number.isNaN(Number(distanciaKm))) {
    return null;
  }

  const valorKm = Number(distanciaKm);
  if (valorKm < 1) {
    const metros = Math.max(5, Math.round(valorKm * 1000));
    return `a ${metros}m`;
  }

  return `a ${valorKm.toFixed(1)}km`;
}

export function formatarDataRelativa(dataIso) {
  if (!dataIso) return '';
  try {
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '';
  }
}

/**
 * Card Universal de Denúncia reutilizável em 3 contextos:
 * - modo === 'feed'    (Tela HomeFeed)
 * - modo === 'minhas'  (Tela MinhasDenuncias)
 * - modo === 'triagem' (Tela PainelGabinete - Exclusivo GESTOR)
 */
export function CardDenuncia({
  denuncia,
  modo = 'feed',
  aoAlternarApoio,
  aoEditar,
  aoExcluir,
  aoGerenciarStatus,
  apoiandoEmProgresso = false,
}) {
  if (!denuncia) return null;

  const configStatus = MAPA_STATUS[denuncia.status] || MAPA_STATUS.PENDENTE;
  const corCategoria = denuncia.categoria?.cor_hex || '#EA580C';
  const nomeCategoria = denuncia.categoria?.nome || 'Ocorrência Urbana';
  const distanciaTexto = formatarDistanciaTexto(denuncia.distancia_km);
  const dataFormatada = formatarDataRelativa(denuncia.created_at);
  const apoiado = Boolean(denuncia.apoiado_pelo_usuario);

  return (
    <article className="bg-superficie-card rounded-2xl shadow-xs border border-superficie-borda overflow-hidden transition-shadow hover:shadow-md">
      {/* Topo da Imagem + Botão Flutuante de Apoio */}
      <div className="relative">
        {denuncia.imagem_url ? (
          <img
            src={denuncia.imagem_url}
            alt={nomeCategoria}
            loading="lazy"
            className="h-44 w-full object-cover rounded-t-xl bg-slate-100"
          />
        ) : (
          <div
            className="h-32 w-full rounded-t-xl flex flex-col items-center justify-center gap-1.5 px-4 text-center"
            style={{
              background: `linear-gradient(135deg, ${corCategoria}18 0%, ${corCategoria}35 100%)`,
            }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: corCategoria }}
            >
              {renderizarIconeCategoria(denuncia.categoria?.icone, 'w-5 h-5')}
            </div>
            <span className="text-[11px] font-medium text-slate-600">
              Relato registrado sem foto anexada
            </span>
          </div>
        )}

        {/* Botão Flutuante de Coração / Apoios */}
        <button
          type="button"
          disabled={apoiandoEmProgresso}
          onClick={() => aoAlternarApoio && aoAlternarApoio(denuncia)}
          aria-label={apoiado ? 'Remover apoio desta denúncia' : 'Apoiar esta denúncia'}
          className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-bold shadow-md backdrop-blur-md transition-transform active:scale-95 ${
            apoiado
              ? 'bg-white text-coral border border-coral/30'
              : 'bg-white/95 text-urbano hover:bg-white border border-slate-200'
          }`}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              apoiado ? 'fill-coral text-coral' : 'text-slate-500'
            }`}
          />
          <span>{denuncia.total_apoios ?? 1}</span>
        </button>

        {/* Data no canto superior esquerdo */}
        {dataFormatada && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-urbano/80 backdrop-blur-xs text-white text-[10px] font-medium">
            <Clock className="w-3 h-3 text-coral" />
            {dataFormatada}
          </span>
        )}
      </div>

      {/* Corpo do Card */}
      <div className="p-4 space-y-2.5">
        {/* Cabeçalho: Categoria + Pílula de Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: corCategoria }}
            />
            <h3 className="font-display font-bold text-sm text-urbano-escuro truncate">
              {nomeCategoria}
            </h3>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-display font-bold border shrink-0 ${configStatus.classes}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${configStatus.ponto}`} />
            {configStatus.rotulo}
          </span>
        </div>

        {/* Subtítulo Local: Bairro + Distância */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-1 text-urbano font-semibold">
            <MapPin className="w-3.5 h-3.5 text-coral shrink-0" />
            {denuncia.bairro}
          </span>
          {distanciaTexto && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-coral font-semibold">{distanciaTexto}</span>
            </>
          )}
        </div>

        {/* Endereço Aproximado e Observação do Cidadão */}
        <p className="text-xs text-slate-500 truncate">
          {denuncia.endereco_aproximado}
        </p>

        {denuncia.observacao && (
          <p className="text-xs text-urbano-escuro leading-relaxed line-clamp-3 bg-superficie-fundo p-2.5 rounded-xl border border-superficie-borda/70">
            {denuncia.observacao}
          </p>
        )}

        {/* RODAPÉ DINÂMICO 1: MODO FEED */}
        {modo === 'feed' && denuncia.resposta_prefeitura && (
          <div className="mt-2 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <p className="font-display font-bold text-[11px] text-urbano flex items-center gap-1">
              <MessageSquareQuote className="w-3.5 h-3.5 text-coral" />
              Resposta da Prefeitura:
            </p>
            <p className="text-slate-600 mt-0.5 line-clamp-2">
              {denuncia.resposta_prefeitura}
            </p>
          </div>
        )}

        {/* RODAPÉ DINÂMICO 2: MODO MINHAS DENÚNCIAS */}
        {modo === 'minhas' && (
          <div className="pt-2 space-y-2.5 border-t border-superficie-borda">
            {/* Box cinza claro: Resposta da Prefeitura */}
            {denuncia.resposta_prefeitura ? (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200/90 space-y-1">
                <p className="font-display font-bold text-[11px] text-urbano flex items-center gap-1.5">
                  <MessageSquareQuote className="w-4 h-4 text-coral shrink-0" />
                  Resposta da Prefeitura
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {denuncia.resposta_prefeitura}
                </p>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 flex items-center gap-1.5">
                <MessageSquareQuote className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                Aguardando parecer oficial do Gabinete da Prefeitura.
              </div>
            )}

            {/* Trava Dupla Visual (RF02): Botões Editar e Apagar apenas se pode_editar_excluir === true */}
            {denuncia.pode_editar_excluir ? (
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => aoEditar && aoEditar(denuncia)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-coral hover:bg-coral-hover text-white font-display font-bold text-xs shadow-xs transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => aoExcluir && aoExcluir(denuncia)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-urbano hover:bg-urbano-claro text-white font-display font-bold text-xs shadow-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Apagar
                </button>
              </div>
            ) : !denuncia.is_autor ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-coral-suave/60 border border-coral/20">
                <span className="text-xs font-display font-bold text-coral flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-coral text-coral" />
                  Apoiando esta denúncia
                </span>
                <span className="text-[11px] text-slate-600">
                  Autor: {denuncia.autor?.nome?.split(' ')[0] || 'Cidadão'}
                </span>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200/70 text-[11px] text-status-analise font-medium">
                Denúncia em triagem/concluída pela prefeitura (edição bloqueada para preservar o histórico).
              </div>
            )}
          </div>
        )}

        {/* RODAPÉ DINÂMICO 3: MODO TRIAGEM (Visão do Gabinete - GESTOR) */}
        {modo === 'triagem' && (
          <div className="pt-2.5 space-y-2.5 border-t border-superficie-borda">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-display font-bold text-coral">
                <Heart className="w-4 h-4 fill-coral text-coral" />
                {denuncia.total_apoios ?? 1}{' '}
                {Number(denuncia.total_apoios) === 1 ? 'apoiador' : 'apoiadores'}
              </span>
              {denuncia.autor?.nome && (
                <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                  Relator: {denuncia.autor.nome}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => aoGerenciarStatus && aoGerenciarStatus(denuncia)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-urbano hover:bg-urbano-claro text-white font-display font-bold text-xs shadow-sm transition-colors"
            >
              <Settings2 className="w-4 h-4 text-coral" />
              Gerenciar Status
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default CardDenuncia;
