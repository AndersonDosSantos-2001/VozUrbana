import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { STORAGE_KEY_TOKEN, STORAGE_KEY_USUARIO } from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_USUARIO);
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY_TOKEN) || null);
  const [carregando, setCarregando] = useState(true);
  const [modalCpfAberto, setModalCpfAberto] = useState(false);

  const salvarSessao = useCallback((novoToken, dadosUsuario) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, novoToken);
    localStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(dadosUsuario));
    setToken(novoToken);
    setUsuario(dadosUsuario);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USUARIO);
    setToken(null);
    setUsuario(null);
    setModalCpfAberto(false);
  }, []);

  // Sincroniza e valida a sessão salva ao abrir o aplicativo
  useEffect(() => {
    let ativo = true;

    async function validarSessaoInicial() {
      const tokenSalvo = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (!tokenSalvo) {
        if (ativo) setCarregando(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (ativo && data?.usuario) {
          setUsuario(data.usuario);
          localStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(data.usuario));
          if (data.precisa_completar_cpf) {
            setModalCpfAberto(true);
          }
        }
      } catch {
        if (ativo) logout();
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    validarSessaoInicial();

    const tratarSessaoExpirada = () => logout();
    window.addEventListener('vozurbana:sessao-expirada', tratarSessaoExpirada);

    return () => {
      ativo = false;
      window.removeEventListener('vozurbana:sessao-expirada', tratarSessaoExpirada);
    };
  }, [logout]);

  /**
   * Realiza login por E-mail ou CPF + Senha.
   */
  async function login(credencial, senha) {
    const texto = String(credencial || '').trim();
    const payload = texto.includes('@')
      ? { email: texto, senha }
      : { cpf: texto, senha };

    const { data } = await api.post('/auth/login', payload);
    salvarSessao(data.token, data.usuario);

    if (data.precisa_completar_cpf) {
      setModalCpfAberto(true);
    }

    return data;
  }

  /**
   * Realiza cadastro tradicional (Nome + CPF + Email + Senha).
   */
  async function cadastrar({ nome, email, cpf, senha }) {
    const { data } = await api.post('/auth/register', {
      nome,
      email,
      cpf,
      senha,
    });
    salvarSessao(data.token, data.usuario);
    return data;
  }

  /**
   * Realiza login ou cadastro via Google OAuth2 (idToken).
   */
  async function loginComGoogle(idToken) {
    const { data } = await api.post('/auth/google', { idToken });
    salvarSessao(data.token, data.usuario);

    if (data.precisa_completar_cpf) {
      setModalCpfAberto(true);
    }

    return data;
  }

  /**
   * Salva o CPF de uma conta criada via Google (PATCH /api/usuarios/completar-cpf).
   */
  async function completarCpf(cpf) {
    const { data } = await api.patch('/usuarios/completar-cpf', { cpf });
    if (data?.usuario) {
      setUsuario(data.usuario);
      localStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(data.usuario));
    }
    setModalCpfAberto(false);
    return data;
  }

  const estaAutenticado = Boolean(token && usuario);
  const isGestor = usuario?.perfil === 'GESTOR';
  const isCidadao = usuario?.perfil === 'CIDADAO';
  const precisaCompletarCpf = Boolean(estaAutenticado && !usuario?.cpf);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        carregando,
        estaAutenticado,
        isGestor,
        isCidadao,
        precisaCompletarCpf,
        modalCpfAberto,
        setModalCpfAberto,
        abrirModalCpf: () => setModalCpfAberto(true),
        fecharModalCpf: () => setModalCpfAberto(false),
        login,
        cadastrar,
        loginComGoogle,
        completarCpf,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider />');
  }
  return context;
}

export default AuthContext;
