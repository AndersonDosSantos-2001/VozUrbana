import { useNavigate } from 'react-router-dom';
import {
  X,
  UserPlus,
  LogIn,
  BarChart3,
  Megaphone,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  LayoutList,
  Home,
  User,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LogoVozUrbana } from './LogoVozUrbana';

export function SidebarMenu({ aberto, aoFechar }) {
  const navigate = useNavigate();
  const {
    usuario,
    estaAutenticado,
    isGestor,
    precisaCompletarCpf,
    abrirModalCpf,
    logout,
  } = useAuth();

  if (!aberto) return null;

  function irPara(rota) {
    aoFechar();
    navigate(rota);
  }

  function executarLogout() {
    logout();
    aoFechar();
    navigate('/');
  }

  function abrirConfiguracoes() {
    aoFechar();
    if (precisaCompletarCpf) {
      abrirModalCpf();
    } else {
      navigate('/login?aba=perfil');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-slate-950/60 backdrop-blur-xs transition-opacity"
      onClick={aoFechar}
    >
      <div
        className="w-full max-w-[430px] h-full flex justify-end pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <aside
          aria-label="Menu lateral de navegação"
          className="w-[82%] max-w-[340px] h-full bg-urbano text-white shadow-2xl flex flex-col justify-between p-5 pointer-events-auto animate-in slide-in-from-right duration-200"
        >
          {/* Topo do Menu Lateral */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <LogoVozUrbana tema="escuro" tamanho="sm" />
              <button
                type="button"
                onClick={aoFechar}
                aria-label="Fechar menu"
                className="p-2 rounded-full hover:bg-urbano-claro transition-colors"
              >
                <X className="w-5 h-5 text-slate-300" />
              </button>
            </div>

            {/* 1. MODO VISITANTE (Deslogado) */}
            {!estaAutenticado && (
              <div className="mt-6 space-y-3">
                <div className="bg-urbano-escuro/60 rounded-xl p-4 border border-slate-700/80 mb-4">
                  <p className="font-display font-bold text-sm text-white">
                    Bem-vindo ao Voz Urbana
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    Participe da zeladoria da sua cidade registrando ou apoiando ocorrências.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => irPara('/login?modo=cadastro')}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-coral hover:bg-coral-hover text-white font-display font-bold text-sm shadow-md transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Criar Conta
                </button>

                <button
                  type="button"
                  onClick={() => irPara('/login')}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-urbano-claro hover:bg-slate-600 text-white font-display font-semibold text-sm transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Entrar
                </button>

                <div className="pt-3 border-t border-slate-700/80 mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => irPara('/')}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-urbano-claro text-slate-100 font-medium text-sm transition-colors"
                  >
                    <Home className="w-5 h-5 text-coral" />
                    Feed da Cidade
                  </button>

                  <button
                    type="button"
                    onClick={() => irPara('/graficos')}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-urbano-claro text-slate-100 font-medium text-sm transition-colors"
                  >
                    <BarChart3 className="w-5 h-5 text-coral" />
                    Gráfico de Denúncias
                  </button>
                </div>
              </div>
            )}

            {/* 2. MODO CIDADÃO LOGADO (perfil === 'CIDADAO') */}
            {estaAutenticado && !isGestor && (
              <div className="mt-5">
                <div className="bg-urbano-escuro/80 rounded-xl p-4 border border-slate-700 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-coral/20 border border-coral flex items-center justify-center text-coral font-display font-bold text-base shrink-0">
                      {usuario?.nome?.charAt(0)?.toUpperCase() || <User className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-sm text-white truncate">
                        {usuario?.nome}
                      </p>
                      <p className="text-xs text-slate-300 truncate">{usuario?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-700 text-slate-200 rounded-full">
                        Cidadão
                      </span>
                    </div>
                  </div>

                  {precisaCompletarCpf && (
                    <button
                      type="button"
                      onClick={() => {
                        aoFechar();
                        abrirModalCpf();
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-status-pendente/20 border border-status-pendente text-amber-300 text-xs font-semibold hover:bg-status-pendente/30 transition-colors"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Completar CPF pendente
                    </button>
                  )}
                </div>

                <nav className="space-y-2">
                  <button
                    type="button"
                    onClick={() => irPara('/nova-denuncia')}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-coral hover:bg-coral-hover text-white font-display font-bold text-sm shadow-md transition-colors"
                  >
                    <Megaphone className="w-5 h-5" />
                    Nova Denúncia
                  </button>

                  <button
                    type="button"
                    onClick={() => irPara('/minhas-denuncias')}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-urbano-claro text-slate-100 font-medium text-sm transition-colors"
                  >
                    <FileText className="w-5 h-5 text-coral" />
                    Minhas Denúncias
                  </button>

                  <button
                    type="button"
                    onClick={() => irPara('/graficos')}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-urbano-claro text-slate-100 font-medium text-sm transition-colors"
                  >
                    <BarChart3 className="w-5 h-5 text-coral" />
                    Gráfico de Denúncias
                  </button>

                  <button
                    type="button"
                    onClick={abrirConfiguracoes}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-urbano-claro text-slate-100 font-medium text-sm transition-colors"
                  >
                    <Settings className="w-5 h-5 text-slate-300" />
                    Configurações
                  </button>
                </nav>
              </div>
            )}

            {/* 3. MODO GESTOR DA PREFEITURA (perfil === 'GESTOR') */}
            {estaAutenticado && isGestor && (
              <div className="mt-5">
                <div className="bg-urbano-escuro rounded-xl p-4 border border-coral/60 mb-5 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-coral flex items-center justify-center text-white shadow-md shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-display font-bold bg-coral text-white">
                        Gestor - Prefeitura
                      </span>
                      <p className="font-display font-bold text-sm text-white truncate mt-1">
                        {usuario?.nome}
                      </p>
                      <p className="text-xs text-slate-300 truncate">{usuario?.email}</p>
                    </div>
                  </div>
                </div>

                <nav className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => irPara('/gabinete/triagem')}
                    className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl bg-coral hover:bg-coral-hover text-white font-display font-bold text-sm shadow-lg transition-colors"
                  >
                    <LayoutList className="w-5 h-5 shrink-0" />
                    Painel de Triagem (Gabinete)
                  </button>

                  <button
                    type="button"
                    onClick={() => irPara('/graficos')}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-urbano-claro text-slate-100 font-medium text-sm transition-colors"
                  >
                    <BarChart3 className="w-5 h-5 text-coral" />
                    Dashboard Geral
                  </button>

                  <button
                    type="button"
                    onClick={() => irPara('/')}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-urbano-claro text-slate-100 font-medium text-sm transition-colors"
                  >
                    <Home className="w-5 h-5 text-coral" />
                    Feed da Cidade
                  </button>

                  <button
                    type="button"
                    onClick={abrirConfiguracoes}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-urbano-claro text-slate-100 font-medium text-sm transition-colors"
                  >
                    <Settings className="w-5 h-5 text-slate-300" />
                    Configurações
                  </button>
                </nav>
              </div>
            )}
          </div>

          {/* Rodapé do Menu Lateral */}
          <div className="pt-4 border-t border-slate-700">
            {estaAutenticado ? (
              <button
                type="button"
                onClick={executarLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 font-display font-semibold text-sm border border-red-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            ) : (
              <p className="text-[11px] text-center text-slate-400">
                vozUrbana • Zeladoria Pública Municipal
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default SidebarMenu;
