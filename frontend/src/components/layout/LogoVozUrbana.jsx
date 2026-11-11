export function LogoVozUrbana({ tema = 'claro', tamanho = 'md' }) {
  const corLinha = tema === 'escuro' ? '#FFFFFF' : '#1E293B';
  const alturaSvg = tamanho === 'sm' ? 'h-8' : tamanho === 'lg' ? 'h-16' : 'h-10';

  return (
    <div className="inline-flex items-center gap-2 select-none">
      <svg
        className={`${alturaSvg} w-auto`}
        viewBox="0 0 260 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Megafone em Coral Cívico */}
        <path
          d="M18 36C11.3726 36 6 41.3726 6 48C6 54.6274 11.3726 60 18 60H32L37 80C37.6 82.4 39.8 84 42.2 84H46C49.3 84 51.8 80.9 51 77.7L46.5 60H48L78 76V20L48 36H18Z"
          fill="#EA580C"
        />
        <path
          d="M83 39C86.5 41.5 86.5 54.5 83 57"
          stroke="#EA580C"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Onda Sonora desenhando os Prédios da Cidade */}
        <path
          d="M92 48H110V24H128V62H136V14H158V52H166V30H184V48H202L207 38L213 58L220 32L226 54L231 48H248"
          stroke={corLinha}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Tipografia Integrada */}
        <text
          x="92"
          y="82"
          fill={corLinha}
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontWeight="800"
          fontSize="24"
          letterSpacing="-0.5"
        >
          Voz Urbana
        </text>
      </svg>
    </div>
  );
}

export default LogoVozUrbana;
