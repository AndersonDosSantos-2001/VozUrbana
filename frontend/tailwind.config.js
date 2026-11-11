/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        urbano: {
          DEFAULT: '#1E293B', // Azul Urbano (Header, Menu Lateral, Botões Secundários)
          escuro: '#0F172A',  // Títulos principais
          claro: '#334155',   // Hover institucional
        },
        coral: {
          DEFAULT: '#EA580C', // Coral Cívico (Megafone, Botões CTA Principais, Coração Ativo)
          hover: '#C2410C',   // Hover do botão principal
          suave: '#FFEDD5',   // Fundo de destaque leve
        },
        superficie: {
          fundo: '#F8FAFC',   // Cinza Gelo (Fundo geral do app)
          card: '#FFFFFF',    // Branco Puro (Cards e Containers)
          borda: '#E2E8F0',   // Bordas sutis de cards e inputs
        },
        status: {
          pendente: '#F59E0B',     // Âmbar Alerta
          pendenteBg: '#FEF3C7',
          analise: '#2563EB',      // Azul Progresso
          analiseBg: '#DBEAFE',
          resolvido: '#10B981',    // Verde Zeladoria
          resolvidoBg: '#D1FAE5',
          rejeitado: '#EF4444',    // Vermelho Arquivado/Rejeitado
          rejeitadoBg: '#FEE2E2',
        },
      },
    },
  },
  plugins: [],
};
