import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';
import { LogoVozUrbana } from './LogoVozUrbana';

export function Header({ aoAbrirMenu }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';

  function voltarPagina() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }

  return (
    <header className="bg-urbano h-16 px-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Esquerda: Botão Voltar nas telas internas ou espaçador invisível na Home */}
      <div className="w-10 flex items-center justify-start">
        {!isHome ? (
          <button
            type="button"
            onClick={voltarPagina}
            aria-label="Voltar"
            className="p-2 -ml-2 rounded-full hover:bg-urbano-claro transition-colors focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
        ) : (
          <span className="w-6 h-6 block" aria-hidden="true" />
        )}
      </div>

      {/* Centro: Logotipo clicável que leva para a Home */}
      <Link
        to="/"
        aria-label="Ir para a página inicial do Voz Urbana"
        className="flex items-center justify-center focus:outline-none"
      >
        <LogoVozUrbana tema="escuro" tamanho="sm" />
      </Link>

      {/* Direita: Botão Hambúrguer que abre o SidebarMenu */}
      <div className="w-10 flex items-center justify-end">
        <button
          type="button"
          onClick={aoAbrirMenu}
          aria-label="Abrir menu de navegação"
          className="p-2 -mr-2 rounded-full hover:bg-urbano-claro transition-colors focus:outline-none focus:ring-2 focus:ring-coral"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
      </div>
    </header>
  );
}

export default Header;
