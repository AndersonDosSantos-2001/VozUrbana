import { Heart, AlertTriangle, MapPin, X, ArrowRight } from 'lucide-react';
import { formatarDistanciaTexto } from './CardDenuncia';

/**
 * Modal exibido quando o sistema detecta uma denúncia ativa da mesma categoria
 * num raio <= 40 metros (Decisão Arquitetural 03).
 */
export function ModalDuplicata({
  aberto,
  denunciasProximas = [],
  aoApoiarExistente,
  aoContinuarNova,
  aoFechar,
  apoiando = false,
}) {
  if (!aberto || !denunciasProximas.length) return null;

  const principal = denunciasProximas[0];
  const distanciaFormatada =
    formatarDistanciaTexto(principal.distancia_km) || 'a menos de 40m';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-[395px] bg-superficie-card rounded-2xl shadow-2xl border border-superficie-borda p-5 relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={aoFechar || aoContinuarNova}
          aria-label="Fechar alerta"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho do Alerta */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-status-pendenteBg text-status-pendente flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-coral">
              Ocorrência Próxima Detectada
            </span>
            <h3 className="font-display font-bold text-base text-urbano-escuro">
              Já existe relato neste local!
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-3.5">
          Encontramos uma denúncia em aberto da mesma categoria a{' '}
          <strong className="text-urbano">{distanciaFormatada}</strong>. Apoiar uma
          denúncia existente aumenta a prioridade dela na fila do Gabinete da Prefeitura!
        </p>

        {/* Card Resumo da Denúncia Existente */}
        <div className="rounded-xl border border-superficie-borda bg-superficie-fundo overflow-hidden mb-4">
          {principal.imagem_url && (
            <img
              src={principal.imagem_url}
              alt={principal.categoria?.nome || 'Denúncia próxima'}
              className="w-full h-32 object-cover"
            />
          )}
          <div className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display font-bold text-xs text-urbano-escuro truncate">
                {principal.categoria?.nome || 'Mesma Categoria'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-coral-suave text-coral text-[11px] font-display font-bold shrink-0">
                <Heart className="w-3 h-3 fill-coral text-coral" />
                {principal.total_apoios ?? 1} apoios
              </span>
            </div>

            <p className="text-xs text-slate-600 flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-coral shrink-0" />
              {principal.endereco_aproximado} ({principal.bairro})
            </p>

            {principal.observacao && (
              <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                &ldquo;{principal.observacao}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Botões de Decisão */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={apoiando}
            onClick={() => aoApoiarExistente(principal)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-display font-bold text-xs shadow-md transition-colors"
          >
            <Heart className="w-4 h-4 fill-white" />
            {apoiando
              ? 'Registrando seu apoio...'
              : 'Apoiar Denúncia Existente (+1)'}
          </button>

          <button
            type="button"
            disabled={apoiando}
            onClick={aoContinuarNova}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full border border-superficie-borda bg-white hover:bg-slate-50 text-slate-600 font-display font-semibold text-xs transition-colors"
          >
            <span>Continuar mesmo assim</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalDuplicata;
