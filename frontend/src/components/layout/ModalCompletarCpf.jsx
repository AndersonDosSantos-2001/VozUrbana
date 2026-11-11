import { useState } from 'react';
import { ShieldAlert, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Formata dinamicamente um CPF no padrão 000.000.000-00 enquanto o usuário digita.
 */
export function aplicarMascaraCpf(valor) {
  const apenasNumeros = String(valor || '')
    .replace(/\D/g, '')
    .slice(0, 11);

  if (apenasNumeros.length <= 3) return apenasNumeros;
  if (apenasNumeros.length <= 6) {
    return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3)}`;
  }
  if (apenasNumeros.length <= 9) {
    return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6)}`;
  }
  return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6, 9)}-${apenasNumeros.slice(9, 11)}`;
}

export function ModalCompletarCpf({ aberto, aoFechar, aoConcluir }) {
  const { completarCpf, usuario } = useAuth();
  const [cpf, setCpf] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!aberto) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length !== 11) {
      setErro('Informe um CPF válido com 11 dígitos.');
      return;
    }

    try {
      setEnviando(true);
      await completarCpf(cpf);
      setCpf('');
      if (aoConcluir) aoConcluir();
    } catch (err) {
      setErro(
        err.response?.data?.erro || 'Não foi possível validar e salvar o CPF informado.'
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-[390px] bg-superficie-card rounded-2xl shadow-2xl border border-superficie-borda p-6 relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-coral-suave text-coral flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-urbano-escuro">
              Complete seu Cadastro
            </h3>
            <p className="text-xs text-slate-500">
              Identificação cívica obrigatória (RF01)
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          Olá{usuario?.nome ? `, ${usuario.nome.split(' ')[0]}` : ''}! Para garantir a autenticidade
          das solicitações enviadas ao Gabinete da Prefeitura, informe seu <strong>CPF</strong> antes
          de registrar sua primeira denúncia.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="cpf-complementar"
              className="block text-xs font-semibold text-urbano mb-1.5"
            >
              CPF do Cidadão
            </label>
            <input
              id="cpf-complementar"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(aplicarMascaraCpf(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-superficie-borda bg-superficie-fundo text-sm text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              required
            />
          </div>

          {erro && (
            <div className="p-3 rounded-xl bg-status-rejeitadoBg text-status-rejeitado text-xs font-medium">
              {erro}
            </div>
          )}

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={aoFechar}
              className="flex-1 py-2.5 px-4 rounded-full border border-superficie-borda text-xs font-display font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Agora não
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white text-xs font-display font-bold shadow-md transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {enviando ? 'Salvando...' : 'Salvar CPF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalCompletarCpf;
