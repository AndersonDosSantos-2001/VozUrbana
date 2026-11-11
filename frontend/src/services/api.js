import axios from 'axios';

export const STORAGE_KEY_TOKEN = '@vozUrbana:token';
export const STORAGE_KEY_USUARIO = '@vozUrbana:usuario';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api',
  timeout: 15000,
});

// Interceptor de Requisição: injeta automaticamente o Token JWT no header Authorization
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Resposta: limpa sessão local caso o token expire (401 em rotas protegidas)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const urlRequisicao = error.config?.url || '';
    const isRotaLogin =
      urlRequisicao.includes('/auth/login') ||
      urlRequisicao.includes('/auth/register') ||
      urlRequisicao.includes('/auth/google');

    if (error.response?.status === 401 && !isRotaLogin) {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USUARIO);
      window.dispatchEvent(new CustomEvent('vozurbana:sessao-expirada'));
    }

    return Promise.reject(error);
  }
);

export default api;
