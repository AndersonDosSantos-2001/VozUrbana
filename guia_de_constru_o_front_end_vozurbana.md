# Guia de Construção do Front-end e Design System — vozUrbana

> **Escopo deste Documento:** Especificação visual (Design System) e guia de implementação sequencial do **Front-end (React + Vite + Tailwind CSS)** do projeto **vozUrbana**, alinhado aos wireframes de alta fidelidade aprovados e integrado aos contratos JSON do Back-end (`guia_construcao_backend.md`).

---

## 1. Design System e Identidade Visual Oficial

### 1.1. Tipografia (`index.html`)
Adicionar no `<head>` do arquivo `frontend/index.html` a importação das fontes **Plus Jakarta Sans** (títulos, botões e cabeçalhos) e **Inter** (corpo de texto, inputs, badges e gráficos):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
```

### 1.2. Paleta de Cores e Tokens no `tailwind.config.js`
Configurar o arquivo `frontend/tailwind.config.js` com os tokens oficiais da marca e cores semânticas de status:

```javascript
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
```

### 1.3. Componente Vetorial do Logotipo (`src/components/layout/LogoVozUrbana.jsx`)
Para garantir nitidez máxima em qualquer tela (e permitir copiar o SVG direto para o Figma), o logotipo oficial (Megafone em Coral Cívico `#EA580C` + Onda Sonora dos Prédios em Azul Urbano) deve ser implementado como um componente SVG reutilizável com suporte a tema claro (fundo branco) e tema escuro (Header `#1E293B`):

```jsx
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
        <path d="M83 39C86.5 41.5 86.5 54.5 83 57" stroke="#EA580C" strokeWidth="4" strokeLinecap="round" />

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
```

---

## 2. Preparação do Ambiente e Dependências (`frontend/`)

### 2.1. Instalação de Pacotes (Terminal Windows)
Na pasta `frontend/`, inicializar o projeto com Vite (`npm create vite@latest . -- --template react`) e instalar as bibliotecas enxutas:

* **Pacotes de Produção:**
  `npm install react-router-dom axios lucide-react exifr browser-image-compression leaflet react-leaflet recharts`
* **Pacotes de Estilização e Desenvolvimento:**
  `npm install -D tailwindcss postcss autoprefixer`
* **Importação do CSS do Leaflet (`index.html` ou `main.jsx`):**
  Importar `import 'leaflet/dist/leaflet.css';` no `src/main.jsx` para renderizar os blocos do mapa corretamente.

### 2.2. Variáveis de Ambiente (`frontend/.env.example`)
```env
VITE_API_URL=http://localhost:3333/api
VITE_GOOGLE_CLIENT_ID=seu_client_id_do_google_cloud.apps.googleusercontent.com
```

---

## 3. Padrão de Layout Mobile-First e Componentes Globais

### 3.1. Container Mobile-First (`AppShell`)
Como o **vozUrbana** é uma aplicação *Mobile-First* que será apresentada também em projetor/desktop na banca da faculdade, todas as telas devem ser envolvidas por um container centralizado que preserva a proporção mobile no computador:
* Classes padrão do wrapper: `min-h-screen bg-slate-900 flex justify-center`
* Classes da área útil do app: `w-full max-w-[430px] min-h-screen bg-superficie-fundo flex flex-col relative shadow-2xl overflow-x-hidden`

### 3.2. Cabeçalho Superior (`src/components/layout/Header.jsx`)
* Fundo `bg-urbano` (`#1E293B`), altura `h-16`, `px-4`, `flex items-center justify-between sticky top-0 z-30 shadow-md`.
* **Esquerda:** Botão `Voltar` (`<ArrowLeft className="text-white" />`) visível em todas as telas internas; na `Home`, exibe espaçador invisível para manter o logo perfeitamente centralizado.
* **Centro:** Componente `<LogoVozUrbana tema="escuro" tamanho="sm" />` clicável (leva para a `Home`).
* **Direita:** Botão Hambúrguer (`<Menu className="text-white" />`) que abre o `SidebarMenu.jsx`.

### 3.3. Menu Lateral Inteligente (`src/components/layout/SidebarMenu.jsx`)
Desliza sobre a tela (`fixed inset-0 z-50`) e adapta seus botões de acordo com o estado do `AuthContext`:
1. **Visitante (Deslogado):**
   * Botão `[Criar Conta]` e Botão `[Entrar]`.
   * Botão `[Gráfico de Denúncias]`.
2. **Cidadão Logado (`perfil === 'CIDADAO'`):**
   * Exibe Nome do Cidadão no topo.
   * Botões: `[Nova Denúncia]`, `[Minhas Denúncias]`, `[Gráfico de Denúncias]`, `[Configurações]` e `[Sair]`.
3. **Gestor da Prefeitura (`perfil === 'GESTOR'`):**
   * Exibe cabeçalho especial com avatar institucional e badge `Gestor - Prefeitura`.
   * Botão em destaque Coral (`bg-coral text-white`): **`[Painel de Triagem (Gabinete)]`**.
   * Botões secundários: `[Dashboard Geral]`, `[Feed da Cidade]`, `[Configurações]` e `[Sair]`.

### 3.4. Card Universal de Denúncia (`src/components/denuncia/CardDenuncia.jsx`)
Para evitar duplicação de código, um único componente `<CardDenuncia />` recebe a prop `modo` (`'feed'` | `'minhas'` | `'triagem'`):
* **Topo da Imagem:** Foto da denúncia (`h-44 w-full object-cover rounded-t-xl`) + Botão flutuante redondo no canto superior direito com o ícone `<Heart />` e o contador `total_apoios`. Se `apoiado_pelo_usuario === true`, o coração fica preenchido em `#EA580C`.
* **Cabeçalho do Corpo:** Título da Categoria + **Pílula de Status** lateral (`Pendente` em amarelo, `Em Análise` em azul, `Resolvido` em verde).
* **Subtítulo Local:** Tag com `Bairro` e `distancia_km` (ex: `📍 Centro • a 350m`).
* **Rodapé Dinâmico conforme a prop `modo`:**
  * Se `modo === 'feed'`: mostra apenas a descrição curta e o endereço.
  * Se `modo === 'minhas'`:
    * Exibe o box cinza claro **"Resposta da Prefeitura"** (caso `resposta_prefeitura` não seja nulo).
    * Se `pode_editar_excluir === true` (é o autor original e o status ainda é `PENDENTE`), renderiza os botões **`[Editar]`** (`bg-coral`) e **`[Apagar]`** (`bg-urbano`).
    * Se `is_autor === false`, exibe um selo discreto `❤️ Apoiando esta denúncia`.
  * Se `modo === 'triagem'` (Visão do Gabinete):
    * Destaca o número de apoiadores (`❤️ 124 apoiadores`) e renderiza o botão largo **`[Gerenciar Status]`** (`bg-urbano text-white w-full`).

---

## 4. Especificação das Telas do Cidadão (`src/pages/`)

### 4.1. `HomeFeed.jsx` (`/` — Tela Home)
* **Hero Card Superior:** Fundo branco com o `<LogoVozUrbana tema="claro" tamanho="lg" />` centralizado e dois botões lado a lado:
  * Botão **`[📢 Denunciar]`** (`bg-coral text-white`) $\rightarrow$ navega para `/nova-denuncia`.
  * Botão **`[📊 Gráfico]`** (`bg-urbano text-white`) $\rightarrow$ navega para `/graficos`.
* **Seção Feed de Denúncias:**
  * Barra com título `"Feed de Denúncias"` e botão `"filtro ▼"` que abre um seletor rápido de ordenação: *Mais Curtidas*, *Menor Distância*, *Maior Distância*, *Mais Recentes*, além de filtro por *Categoria* e *Bairro*.

### 4.2. `NovaDenuncia.jsx` (`/nova-denuncia` — Formulário Inteligente)
Segue fielmente o wireframe aprovado adicionando a inteligência de localização e prevenção de duplicatas:
1. **Breadcrumb:** `HOME > DENÚNCIA`.
2. **Captura de Mídia:** Dois botões quadrados grandes lado a lado:
   * **`[🖼️ Galeria]`**: `<input type="file" accept="image/*" />`.
   * **`[📷 Câmera]`**: `<input type="file" accept="image/*" capture="environment" />` (abre direto a câmera traseira no celular).
3. **Fluxo Automático de Localização + Compressão ao anexar foto:**
   * Passo A: `extratorExif.js` lê as coordenadas GPS da imagem original antes de comprimir.
   * Passo B: Se a foto não tiver EXIF, aciona `navigator.geolocation.getCurrentPosition()`.
   * Passo C: Envia `(lat, lng)` para `nominatimService.js` (`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`) e preenche automaticamente a rua (`endereco_aproximado`) e o `bairro`.
   * Passo D: `compressorImagem.js` comprime a imagem para $\le 300\text{ KB}$.
4. **Seletor de Categoria:** Dropdown arredondado com as categorias vindas de `GET /api/categorias`.
5. **Bloco de Confirmação Visual de Localização (Mini-Mapa):**
   * Exibe o mini-mapa `<MapaSeletor />` com pino arrastável e o texto `"Endereço confirmado: Rua ..., Bairro ..."` (permitindo editar caso o usuário esteja postando de casa uma foto antiga sem EXIF).
6. **Gatilho de Duplicidade ($40\text{ m}$):**
   * Assim que `categoria_id` e `(lat, lng)` estiverem preenchidos, consulta `GET /api/denuncias/verificar-duplicidade`. Se `possui_duplicata === true`, abre o `<ModalDuplicata />` oferecendo o botão **`[❤️ Apoiar Denúncia Existente (+1)]`** (que vincula a denúncia à tela *Minhas Denúncias* do usuário) ou `[Continuar mesmo assim]`.
7. **Campo Observação e Botão `[Publicar Denúncia]`** (`bg-coral rounded-full w-full py-3.5`).

### 4.3. `PainelGrafico.jsx` (`/graficos` — Tela de Gráfico de Denúncias)
1. **Breadcrumb:** `HOME > GRÁFICO DE DENÚNCIAS`.
2. **Card Visual de Gráficos (`Recharts`):**
   * Consome `GET /api/dashboard/estatisticas`.
   * Exibe o **Gráfico de Rosca/Pizza (`PieChart`)** e o **Gráfico de Colunas (`BarChart`)** usando as cores oficiais (`#1E293B`, `#EA580C`, `#64748B`, `#3B82F6`, `#10B981`).
3. **Barra de Ação e Filtro:** Botão rápido `[📢 Denunciar]` à esquerda e botão `filtro ▼` à direita (permitindo filtrar os gráficos por *Bairro*, *Mais Curtidas* ou *Status*).
4. **Card "Ranking das denúncias":**
   * Lista as categorias ou bairros mais críticos com barra de progresso horizontal colorida e a porcentagem exata ao lado (ex: `Buraco na Rua — 57%`).

---

## 5. Especificação das Telas Exclusivas da Prefeitura (`GESTOR`)

### 5.1. `PainelGabinete.jsx` (`/gabinete/triagem` — Painel de Triagem)
Acessível exclusivamente por usuários com `perfil === 'GESTOR'`:
1. **Cabeçalho de Contexto:** Breadcrumb `HOME > TRIAGEM` à esquerda e pílula vermelha/coral **`Modo Gestor`** à direita.
2. **Bloco de KPIs (3 Cards Coloridos Lado a Lado):**
   * **Pendentes:** Fundo `#F59E0B` (Âmbar) com número grande em branco.
   * **Em Análise:** Fundo `#2563EB` (Azul) com número grande em branco.
   * **Resolvidas:** Fundo `#10B981` (Verde) com número grande em branco.
3. **Barra de Ordenação:** `"Ordenar por: Mais Apoiadas ▼"` (prioriza automaticamente as ocorrências com mais corações/apoios dos moradores).
4. **Lista de Cards de Triagem:** Renderiza `<CardDenuncia modo="triagem" />`. Ao clicar em **`[Gerenciar Status]`**, abre a tela/modal de despacho da denúncia selecionada.

### 5.2. `DespachoGabinete.jsx` (`/gabinete/denuncias/:id` — Atualizar Status)
1. **Breadcrumb:** `TRIAGEM > ATUALIZAR STATUS`.
2. **Evidências Lado a Lado:** Miniatura da foto enviada pelo cidadão (clicável para ampliar) + Mini-mapa com o pino exato da ocorrência para orientar a equipe de obras.
3. **Dados do Relato:** Categoria, endereço completo, bairro, total de apoiadores e observação escrita pelo cidadão.
4. **Seletor de Status em Pílulas:**
   * Botões selecionáveis: `[Pendente]` | `[Em Análise ✓]` | `[Resolvido]` | `[Rejeitado]`.
5. **Campo `Resposta Oficial da Prefeitura`:**
   * `<textarea>` para o gestor digitar o parecer público (ex: *"A equipe de infraestrutura foi enviada ao local para realizar os reparos necessários."*).
6. **Botão CTA:** **`[Salvar Despacho]`** (`bg-coral text-white rounded-full w-full py-3.5`), que envia `PATCH /api/gabinete/denuncias/:id/status`.

---

## 6. Prompts Prontos para Executar no Antigravity (Front-end)

Após concluir as 4 fases do Back-end (`guia_construcao_backend.md`), envie os prompts abaixo um por vez para o Antigravity construir o Front-end completo seguindo nossa identidade visual:

### Prompt 5 — Setup do Front-end, Design System, Logo SVG e Autenticação
> *"Leia os arquivos `arquitetura_voz_urbana.md` e `guia_construcao_frontend.md`. Inicialize o projeto React com Vite e Tailwind CSS na pasta `frontend/`. Configure as fontes `Plus Jakarta Sans` e `Inter` no `index.html` e aplique a paleta de cores oficial (`urbano`, `coral`, `superficie`, `status`) no `tailwind.config.js`. Crie o componente vetorial `<LogoVozUrbana />`, o `<Header />`, o `<SidebarMenu />` (com renderização condicional para Visitante, Cidadão e `GESTOR`), o `AuthContext.jsx`, o serviço `api.js` (Axios com interceptor JWT) e a página `LoginCadastro.jsx` (incluindo o modal de completar CPF). Mantenha o container mobile-first centralizado (`max-w-[430px]`)."*

### Prompt 6 — Telas do Cidadão: Feed, Nova Denúncia (EXIF + GPS + Mapa) e Minhas Denúncias
> *"Agora execute a etapa das telas do Cidadão conforme o `guia_construcao_frontend.md`: crie os utilitários `extratorExif.js`, `compressorImagem.js` e `nominatimService.js` (extraindo rua e bairro via OpenStreetMap). Implemente o componente versátil `<CardDenuncia />` (suportando os modos `'feed'`, `'minhas'` e `'triagem'`), o `<MapaSeletor />` com Leaflet, o `<ModalDuplicata />` (raio de 40m sugerindo apoiar a denúncia existente) e construa as páginas `HomeFeed.jsx`, `NovaDenuncia.jsx` e `MinhasDenuncias.jsx` (exibindo o box 'Resposta da Prefeitura' e habilitando Editar/Apagar apenas quando `pode_editar_excluir === true`)."*

### Prompt 7 — Tela de Gráficos (Dashboard) e Módulo Exclusivo da Prefeitura (Gabinete)
> *"Por fim, implemente as telas analíticas e administrativas conforme o `guia_construcao_frontend.md`: construa a página `PainelGrafico.jsx` consumindo `GET /api/dashboard/estatisticas` com `Recharts` (Gráfico de Rosca/Pizza + Gráfico de Colunas + Card 'Ranking das denúncias' com barras de progresso em porcentagem e filtro por bairro/categoria). Em seguida, construa as telas exclusivas do perfil `GESTOR`: `PainelGabinete.jsx` (com o badge 'Modo Gestor', os 3 cards de KPIs Pendentes/Em Análise/Resolvidas e ordenação por Mais Apoiadas) e `DespachoGabinete.jsx` (com foto + mapa lado a lado, seletor de status em pílulas e campo 'Resposta Oficial da Prefeitura')."*