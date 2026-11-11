import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LogoVozUrbana } from '../components/layout/LogoVozUrbana';
import {
  ModalCompletarCpf,
  aplicarMascaraCpf,
} from '../components/layout/ModalCompletarCpf';

export function LoginCadastro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    usuario,
    estaAutenticado,
    isGestor,
    precisaCompletarCpf,
    modalCpfAberto,
    abrirModalCpf,
    fecharModalCpf,
    login,
    cadastrar,
    loginComGoogle,
    logout,
  } = useAuth();

  const modoUrl = searchParams.get('modo');
  const abaPerfil = searchParams.get('aba') === 'perfil';

  const [abaAtiva, setAbaAtiva] = useState(
    modoUrl === 'cadastro' ? 'cadastro' : 'login'
  );

  // Estado do formulário de Login
  const [credencial, setCredencial] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);

  // Estado do formulário de Cadastro
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');
  const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);

  // Feedbacks
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregandoSubmit, setCarregandoSubmit] = useState(false);

  useEffect(() => {
    if (modoUrl === 'cadastro') {
      setAbaAtiva('cadastro');
    } else if (modoUrl === 'login') {
      setAbaAtiva('login');
    }
    setErro('');
    setSucesso('');
  }, [modoUrl]);

  async function handleSubmitLogin(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!credencial.trim() || !senhaLogin) {
      setErro('Preencha seu e-mail ou CPF e sua senha.');
      return;
    }

    try {
      setCarregandoSubmit(true);
      const resposta = await login(credencial, senhaLogin);

      if (resposta.precisa_completar_cpf) {
        abrirModalCpf();
        return;
      }

      if (resposta.usuario?.perfil === 'GESTOR') {
        navigate('/gabinete/triagem');
      } else {
        navigate('/');
      }
    } catch (err) {
      setErro(
        err.response?.data?.erro ||
          'Não foi possível entrar. Verifique seu e-mail/CPF e senha.'
      );
    } finally {
      setCarregandoSubmit(false);
    }
  }

  async function handleSubmitCadastro(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!nome.trim() || !cpf.trim() || !email.trim() || !senhaCadastro) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setCarregandoSubmit(true);
      await cadastrar({
        nome: nome.trim(),
        email: email.trim(),
        cpf,
        senha: senhaCadastro,
      });

      navigate('/');
    } catch (err) {
      setErro(
        err.response?.data?.erro ||
          'Não foi possível concluir o cadastro. Verifique os dados informados.'
      );
    } finally {
      setCarregandoSubmit(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setErro('');
    setSucesso('');

    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setErro('Não foi possível obter a credencial do Google.');
      return;
    }

    try {
      setCarregandoSubmit(true);
      const dados = await loginComGoogle(idToken);
      if (dados.precisa_completar_cpf) {
        abrirModalCpf();
        return;
      }
      if (dados.usuario?.perfil === 'GESTOR') {
        navigate('/gabinete/triagem');
      } else {
        navigate('/');
      }
    } catch (err) {
      setErro(
        err.response?.data?.erro || 'Falha ao autenticar com o Google no servidor.'
      );
    } finally {
      setCarregandoSubmit(false);
    }
  }

  function preencherGestorDemo() {
    setAbaAtiva('login');
    setCredencial('gabinete@vozurbana.gov.br');
    setSenhaLogin('Prefeitura@2026');
    setErro('');
  }

  // Visão de Configurações / Perfil quando o usuário já está logado e acessou Configurações
  if (estaAutenticado && abaPerfil) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <div className="text-[11px] font-display font-bold tracking-wider uppercase text-slate-400">
          HOME &gt; CONFIGURAÇÕES DA CONTA
        </div>

        <div className="bg-superficie-card rounded-2xl p-5 shadow-xs border border-superficie-borda space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-urbano text-white flex items-center justify-center font-display font-extrabold text-xl">
              {usuario?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-display font-bold ${
                  isGestor
                    ? 'bg-coral text-white'
                    : 'bg-slate-100 text-urbano'
                }`}
              >
                {isGestor ? 'Gestor - Prefeitura' : 'Cidadão'}
              </span>
              <h2 className="font-display font-bold text-lg text-urbano-escuro truncate mt-0.5">
                {usuario?.nome}
              </h2>
              <p className="text-xs text-slate-500 truncate">{usuario?.email}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-superficie-fundo border border-superficie-borda flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">
                CPF Vinculado
              </p>
              <p className="text-sm font-medium text-urbano-escuro mt-0.5">
                {usuario?.cpf ? aplicarMascaraCpf(usuario.cpf) : 'Não informado'}
              </p>
            </div>

            {precisaCompletarCpf ? (
              <button
                type="button"
                onClick={abrirModalCpf}
                className="px-3.5 py-2 rounded-full bg-coral hover:bg-coral-hover text-white text-xs font-display font-bold transition-colors"
              >
                Completar CPF
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-resolvido">
                <CheckCircle2 className="w-4 h-4" />
                Verificado
              </span>
            )}
          </div>

          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-3 rounded-full bg-urbano hover:bg-urbano-claro text-white font-display font-bold text-xs transition-colors"
            >
              Ir para o Feed
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex-1 py-3 rounded-full border border-status-rejeitado text-status-rejeitado hover:bg-status-rejeitadoBg font-display font-bold text-xs transition-colors"
            >
              Encerrar Sessão
            </button>
          </div>
        </div>

        <ModalCompletarCpf
          aberto={modalCpfAberto}
          aoFechar={fecharModalCpf}
          aoConcluir={() => setSucesso('CPF salvo com sucesso!')}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-4 pb-6">
      <div>
        {/* Breadcrumb */}
        <div className="text-[11px] font-display font-bold tracking-wider uppercase text-slate-400 mb-3">
          HOME &gt; {abaAtiva === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
        </div>

        {/* Card Hero Identidade Visual */}
        <div className="bg-superficie-card rounded-2xl p-5 shadow-xs border border-superficie-borda text-center mb-4">
          <div className="flex justify-center mb-2">
            <LogoVozUrbana tema="claro" tamanho="lg" />
          </div>
          <p className="text-xs text-slate-500 max-w-[290px] mx-auto">
            Conectando você à zeladoria da sua cidade de forma rápida, transparente e geolocalizada.
          </p>

          {/* Seletor de Abas (Entrar / Criar Conta) */}
          <div className="grid grid-cols-2 gap-1.5 bg-superficie-fundo p-1.5 rounded-xl border border-superficie-borda mt-5">
            <button
              type="button"
              onClick={() => {
                setAbaAtiva('login');
                setErro('');
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-display font-bold text-xs transition-all ${
                abaAtiva === 'login'
                  ? 'bg-urbano text-white shadow-xs'
                  : 'text-slate-500 hover:text-urbano'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Entrar
            </button>

            <button
              type="button"
              onClick={() => {
                setAbaAtiva('cadastro');
                setErro('');
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-display font-bold text-xs transition-all ${
                abaAtiva === 'cadastro'
                  ? 'bg-coral text-white shadow-xs'
                  : 'text-slate-500 hover:text-urbano'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Criar Conta
            </button>
          </div>
        </div>

        {/* Mensagens de Erro ou Sucesso */}
        {erro && (
          <div className="mb-4 p-3.5 rounded-xl bg-status-rejeitadoBg border border-status-rejeitado/30 text-status-rejeitado text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="mb-4 p-3.5 rounded-xl bg-status-resolvidoBg border border-status-resolvido/30 text-status-resolvido text-xs font-medium flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* FORMULÁRIO 1: LOGIN (E-mail ou CPF + Senha) */}
        {abaAtiva === 'login' && (
          <div className="bg-superficie-card rounded-2xl p-5 shadow-xs border border-superficie-borda space-y-4">
            <form onSubmit={handleSubmitLogin} className="space-y-3.5">
              <div>
                <label
                  htmlFor="login-credencial"
                  className="block text-xs font-semibold text-urbano mb-1.5"
                >
                  E-mail ou CPF
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-credencial"
                    type="text"
                    placeholder="seu@email.com ou 000.000.000-00"
                    value={credencial}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Se começar apenas com números/pontos, aplica máscara de CPF automaticamente
                      if (/^[\d.-]+$/.test(val) && !val.includes('@')) {
                        setCredencial(aplicarMascaraCpf(val));
                      } else {
                        setCredencial(val);
                      }
                    }}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-superficie-borda bg-superficie-fundo text-sm text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-senha"
                  className="block text-xs font-semibold text-urbano mb-1.5"
                >
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-senha"
                    type={mostrarSenhaLogin ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={senhaLogin}
                    onChange={(e) => setSenhaLogin(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-superficie-borda bg-superficie-fundo text-sm text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaLogin((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-urbano"
                    aria-label="Alternar visibilidade da senha"
                  >
                    {mostrarSenhaLogin ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={carregandoSubmit}
                className="w-full py-3.5 rounded-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-display font-bold text-sm shadow-md transition-colors mt-1"
              >
                {carregandoSubmit ? 'Autenticando...' : 'Entrar no Sistema'}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-superficie-borda" />
              <span className="shrink mx-3 text-[11px] font-medium text-slate-400 uppercase">
                ou continue com
              </span>
              <div className="grow border-t border-superficie-borda" />
            </div>

            {/* Botão Oficial Google Auth (@react-oauth/google) */}
            <div className="flex justify-center w-full overflow-hidden">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setErro('Não foi possível concluir o login com o Google.')
                }
                shape="pill"
                theme="outline"
                size="large"
                text="signin_with"
                locale="pt-BR"
                width="320"
              />
            </div>

            {/* Atalho Acadêmico para testar o Painel do Gestor */}
            <div className="pt-2 border-t border-superficie-borda">
              <button
                type="button"
                onClick={preencherGestorDemo}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-urbano text-[11px] font-semibold transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-coral" />
                Preencher credenciais de demonstração (Gabinete / GESTOR)
              </button>
            </div>
          </div>
        )}

        {/* FORMULÁRIO 2: CADASTRO TRADICIONAL (Nome + CPF + Email + Senha) */}
        {abaAtiva === 'cadastro' && (
          <div className="bg-superficie-card rounded-2xl p-5 shadow-xs border border-superficie-borda space-y-3.5">
            <form onSubmit={handleSubmitCadastro} className="space-y-3">
              <div>
                <label
                  htmlFor="cad-nome"
                  className="block text-xs font-semibold text-urbano mb-1"
                >
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="cad-nome"
                    type="text"
                    placeholder="Ex: Maria Oliveira"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-superficie-borda bg-superficie-fundo text-sm text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cad-cpf"
                  className="block text-xs font-semibold text-urbano mb-1"
                >
                  CPF
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="cad-cpf"
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(aplicarMascaraCpf(e.target.value))}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-superficie-borda bg-superficie-fundo text-sm text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cad-email"
                  className="block text-xs font-semibold text-urbano mb-1"
                >
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="cad-email"
                    type="email"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-superficie-borda bg-superficie-fundo text-sm text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cad-senha"
                  className="block text-xs font-semibold text-urbano mb-1"
                >
                  Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="cad-senha"
                    type={mostrarSenhaCadastro ? 'text' : 'password'}
                    placeholder="Crie uma senha segura"
                    value={senhaCadastro}
                    onChange={(e) => setSenhaCadastro(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-superficie-borda bg-superficie-fundo text-sm text-urbano-escuro focus:outline-none focus:ring-2 focus:ring-coral"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaCadastro((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-urbano"
                    aria-label="Alternar visibilidade da senha"
                  >
                    {mostrarSenhaCadastro ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={carregandoSubmit}
                className="w-full py-3.5 rounded-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-display font-bold text-sm shadow-md transition-colors mt-2"
              >
                {carregandoSubmit ? 'Criando conta...' : 'Criar Minha Conta Cidadã'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modal de Completar CPF (RF01 - Contas criadas via Google) */}
      <ModalCompletarCpf
        aberto={modalCpfAberto}
        aoFechar={fecharModalCpf}
        aoConcluir={() => navigate('/')}
      />
    </div>
  );
}

export default LoginCadastro;
