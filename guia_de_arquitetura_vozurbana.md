# Guia de Arquitetura e Especificação Técnica — vozUrbana

> **Objetivo do Documento:** Servir como guia de arquitetura, regras de negócio, estrutura de diretórios e especificações técnicas de baixa complexidade e alta eficiência para a construção do sistema **vozUrbana** (Projeto Acadêmico / Guia de Contexto para Agentes de Código como o Antigravity).

---

## 1. Visão Geral do Sistema

O **vozUrbana** é uma aplicação web *Mobile-First* voltada para a zeladoria pública municipal. O sistema conecta cidadãos que desejam relatar problemas urbanos (buracos na via, falta de iluminação pública, falta de água, lixo/entulho acumulados, etc.) ao gabinete da prefeitura responsável pela triagem e resolução.

### Perfis de Acesso (Atores)

1. **Cidadão (`CIDADAO`):** Cria conta (tradicional ou Google), registra denúncias com ou sem foto, apoia denúncias existentes, acompanha o status das solicitações (criadas por ele ou apoiadas), filtra o Feed geral e visualiza o Dashboard público de estatísticas.
2. **Gestor Público (`GESTOR`):** Acessa o Painel de Triagem restrito (Gabinete) para analisar denúncias recebidas, filtrar ocorrências por prioridade/categoria e atualizar o status de resolução com resposta oficial da prefeitura.

---

## 2. Regras de Negócio e Segurança Consolidadas

* **[APROVADO] RF01 - Autenticação Híbrida e CPF:**
  * O sistema permite login via **Google Auth** ou cadastro tradicional com **Nome + CPF + Email + Senha**.
  * *Regra de Consistência:* Usuários que entrarem via Google terão o CPF solicitado em uma etapa rápida de complemento antes de enviarem a primeira denúncia, garantindo que todos os relatos pertençam a cidadãos identificáveis.

* **[APROVADO] RF02 - Trava Dupla de Edição e Exclusão (Autoria + Status):**
  * Na tela *"Minhas Denúncias"*, os botões **Editar** e **Apagar** possuem validação estrita no Frontend (exibição visual) e no Backend (segurança de rota):
    1. **Validação de Autoria (Ownership):** Apenas o criador original do registro (`denuncias.usuario_id === usuario_logado.id`) pode editar ou excluir a denúncia. Cidadãos que apenas **apoiaram** a denúncia visualizam o card para acompanhamento, mas sem os botões de alteração/exclusão.
    2. **Validação de Status (Imutabilidade Pós-Triagem):** O backend só permite `UPDATE` ou `DELETE` pelo autor se `status === 'PENDENTE'`. Assim que o Gabinete altera o status para `EM_ANALISE`, `EM_ANDAMENTO`, `RESOLVIDO` ou `REJEITADO`, a denúncia torna-se imutável para o cidadão, garantindo a integridade histórica do Dashboard.

* **[APROVADO] RF03 - Acompanhamento de Denúncias Apoiadas ("Seguir Denúncia"):**
  * Quando um cidadão clica no ícone de coração no Feed **ou** escolhe a opção *"Apoiar denúncia existente"* no alerta de duplicidade, o sistema cria um vínculo na tabela `apoios_denuncia`.
  * Toda denúncia apoiada passa a ser listada também na tela **"Minhas Denúncias"** do usuário (identificada com a tag visual *"Apoiando"*), permitindo que ele acompanhe a mudança de `status` e leia a `resposta_prefeitura` mesmo sem ser o autor original da postagem.

* **[APROVADO] RF04 - Segurança Contra Escalonamento de Privilégio (Proteção do Perfil `GESTOR`):**
  * **Prevenção de *Mass Assignment* (Atribuição em Massa):** A rota pública de cadastro (`POST /api/auth/register`) ignora qualquer campo `perfil` enviado no corpo da requisição JSON, forçando sempre a gravação de `perfil = 'CIDADAO'`.
  * **Provisionamento Restrito (Zero Superfície de Auto-Promoção):** Não existe nenhuma rota pública na API para criar ou promover um usuário a `GESTOR`. Contas do Gabinete só podem ser inseridas diretamente no banco de dados via *Database Seeder* ou pelo administrador do banco (Dev/DBA).
  * **Controle de Acesso Baseado em Função (RBAC via JWT):** Todas as rotas do Gabinete (`/api/gabinete/*`) possuem um middleware (`verificarGestor`) que valida a assinatura criptográfica do token JWT e exige `perfil === 'GESTOR'`, retornando erro `403 Forbidden` para qualquer tentativa de invasão.

---

## 3. Decisões Arquiteturais Consolidadas

### [APROVADO] Decisão 01: Captura e Validação de Localização
* **Solução Definida (Cascata Híbrida no Frontend):**
  1. **Tentativa 1 (Leitura EXIF):** Caso o usuário selecione uma imagem da **Galeria**, o frontend executará a leitura instantânea dos metadados da imagem (via biblioteca `exifr`) procurando `latitude` e `longitude` **antes** de comprimir a foto.
  2. **Tentativa 2 (GPS do Dispositivo):** Caso a imagem não possua EXIF, o usuário tire a foto na hora pela **Câmera**, ou a denúncia não tenha foto, o sistema acionará a Web API nativa `navigator.geolocation.getCurrentPosition()`.
  3. **Confirmação Visual/Manual Sempre Visível + Extração de Bairro:** Independentemente de ter foto ou não, o formulário exibe o endereço preenchido, o **bairro** (extraído automaticamente do campo `suburb`/`neighbourhood` da **API Nominatim / OpenStreetMap**) e um mini-mapa interativo (**Leaflet.js**) para o usuário confirmar ou ajustar o pino manualmente.

### [APROVADO] Decisão 02: Armazenamento e Otimização de Imagens
* **Solução Definida (Compressão Client-Side + Cloudinary + URL no Banco):**
  1. **Compressão no Navegador:** Uso da biblioteca `browser-image-compression` (após leitura do EXIF) para redimensionar a imagem (máx. $1280\text{ px}$) e comprimir para $150\text{ KB}$ a $300\text{ KB}$.
  2. **Armazenamento Cloud:** Upload para o **Cloudinary** (pasta `voz_urbana/denuncias`).
  3. **Persistência no Banco:** Gravação apenas de `imagem_url` (`TEXT`) e `imagem_public_id` (`VARCHAR`) na tabela `denuncias` (permitindo deletar o arquivo no Cloudinary caso o autor apague uma denúncia `PENDENTE`).

### [APROVADO] Decisão 03: Prevenção de Denúncias Duplicadas por Localização
* **Solução Definida (Busca por Raio via Haversine + Sistema "Apoiar Denúncia"):**
  1. **Gatilho de Verificação:** Ao selecionar a categoria e a localização no formulário, o frontend consulta `GET /api/denuncias/verificar-duplicidade?lat=X&lng=Y&categoria_id=Z`.
  2. **Filtro no Banco (3 Critérios Simultâneos):**
     * Mesma categoria (`categoria_id`).
     * Denúncia em aberto (`status NOT IN ('RESOLVIDO', 'REJEITADO')`).
     * Distância menor ou igual a $40\text{ metros}$ ($\le 0.04\text{ km}$) calculada via SQL com a **Fórmula de Haversine**:
       $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
  3. **Fluxo de Decisão ("Apoiar ou Continuar"):** Se encontrar registro compatível, exibe modal perguntando se o usuário deseja **Apoiar a denúncia existente ($+1$)** (inserindo em `apoios_denuncia`, incrementando `total_apoios` e adicionando à tela *"Minhas Denúncias"* dele) ou continuar criando um novo registro.

---

## 4. Stack Tecnológica e Modelagem do Banco de Dados

### [APROVADO] Decisão 04: Stack Tecnológica
* **Frontend:** **React** (Vite) + **Tailwind CSS** + **Recharts** (ou **Chart.js** para gráficos de pizza e colunas) + **Leaflet** (Mapas).
* **Backend:** **Node.js** + **Express** (Arquitetura RESTful em camadas: *Routes*, *Middlewares*, *Controllers*, *Models*).
* **Banco de Dados:** **PostgreSQL** (Hospedado no **Supabase**) gerenciado via **Sequelize ORM**.
* **Autenticação:** **JWT (`jsonwebtoken`)** + **Bcrypt (`bcryptjs`)** + **`google-auth-library`**.

### [APROVADO] Decisão 05: Esquema Relacional (4 Tabelas + Coluna `bairro` para Gráficos)

#### 1. Tabela `usuarios`
* `id`: `INTEGER` (PK, Auto-incremento)
* `nome`: `VARCHAR(120)` (`NOT NULL`)
* `email`: `VARCHAR(150)` (`UNIQUE`, `NOT NULL`)
* `cpf`: `VARCHAR(14)` (`UNIQUE`, `NULLABLE` no primeiro acesso via Google, exigido antes de criar denúncia)
* `senha_hash`: `VARCHAR(255)` (`NULLABLE` para usuários exclusivos Google Auth)
* `google_id`: `VARCHAR(100)` (`UNIQUE`, `NULLABLE`)
* `perfil`: `ENUM('CIDADAO', 'GESTOR')` (`DEFAULT 'CIDADAO'`, `NOT NULL`)
* `created_at` / `updated_at`: `TIMESTAMP`

#### 2. Tabela `categorias`
* `id`: `INTEGER` (PK, Auto-incremento)
* `nome`: `VARCHAR(80)` (`NOT NULL` — *Buraco na via*, *Falta de iluminação*, *Falta de água*, *Lixo ou entulho*, *Outros*)
* `icone`: `VARCHAR(50)` (`NOT NULL`)
* `cor_hex`: `VARCHAR(7)` (`NOT NULL` — Cor padrão da categoria para padronizar fatias nos gráficos de Pizza/Colunas, ex: `'#EF4444'`)
* `ativo`: `BOOLEAN` (`DEFAULT true`)

#### 3. Tabela `denuncias`
* `id`: `INTEGER` (PK, Auto-incremento)
* `usuario_id`: `INTEGER` (FK $\rightarrow$ `usuarios.id`, `NOT NULL` — **Autor original**)
* `categoria_id`: `INTEGER` (FK $\rightarrow$ `categorias.id`, `NOT NULL`)
* `observacao`: `TEXT` (`NULLABLE`)
* `imagem_url`: `TEXT` (`NULLABLE`)
* `imagem_public_id`: `VARCHAR(150)` (`NULLABLE`)
* `latitude`: `DECIMAL(10, 8)` (`NOT NULL`)
* `longitude`: `DECIMAL(11, 8)` (`NOT NULL`)
* `endereco_aproximado`: `VARCHAR(255)` (`NOT NULL` — Nome da rua/número)
* `bairro`: `VARCHAR(100)` (`NOT NULL` — **Essencial para agrupar "Áreas com mais denúncias" e filtrar o gráfico por região**)
* `status`: `ENUM('PENDENTE', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO')` (`DEFAULT 'PENDENTE'`)
* `resposta_prefeitura`: `TEXT` (`NULLABLE` — Feedback oficial do Gabinete)
* `total_apoios`: `INTEGER` (`DEFAULT 1`, `NOT NULL` — Contador desnormalizado para ordenação rápida no Feed e soma no gráfico)
* `created_at` / `updated_at`: `TIMESTAMP`

#### 4. Tabela `apoios_denuncia`
* `id`: `INTEGER` (PK, Auto-incremento)
* `usuario_id`: `INTEGER` (FK $\rightarrow$ `usuarios.id`, `NOT NULL` — **Cidadão apoiador/seguidor**)
* `denuncia_id`: `INTEGER` (FK $\rightarrow$ `denuncias.id`, `NOT NULL`, `ON DELETE CASCADE`)
* `created_at`: `TIMESTAMP`
* **Constraint de Unicidade:** `UNIQUE(usuario_id, denuncia_id)`

#### Índices do Banco de Dados (Otimização para Feed e Dashboard)
* `idx_denuncias_categoria_status` em `denuncias(categoria_id, status)`
* `idx_denuncias_bairro` em `denuncias(bairro)`
* `idx_denuncias_total_apoios` em `denuncias(total_apoios DESC)`
* `idx_denuncias_created_at` em `denuncias(created_at DESC)`
* `idx_denuncias_coordenadas` em `denuncias(latitude, longitude)`

---

## 5. Mecânica de Filtros do Feed, "Minhas Denúncias" e Gráficos do Dashboard

### 5.1. Como o Banco Suprirá os Filtros do Feed (`GET /api/denuncias`)
* **Menor / Maior Distância:** Calcula `distancia_km` via Fórmula de Haversine comparando o GPS atual enviado na query (`lat`, `lng`) com `(denuncias.latitude, denuncias.longitude)`, ordenando com `ASC` ou `DESC`.
* **Mais Curtidas:** Ordena por `ORDER BY total_apoios DESC, created_at DESC`.
* **Filtros Combináveis:** `categoria_id`, `status`, `bairro` e busca textual por `endereco_aproximado`.

### 5.2. Como Funcionará a Tela "Minhas Denúncias" (`GET /api/denuncias/minhas`)
* Retorna denúncias onde o usuário é **Autor** (`denuncias.usuario_id = :meu_id`) **OU** **Apoiador** (`apoios_denuncia.usuario_id = :meu_id`).
* Retorna flags `is_autor` (`boolean`) e `pode_editar_excluir` (`is_autor && status === 'PENDENTE'`).

### 5.3. Como o Backend Suprirá a "Tela de Gráfico" (`GET /api/dashboard/estatisticas`)
A rota do Dashboard receberá filtros opcionais via *Query Params* (ex: `?bairro=Centro&periodo_dias=30&status=PENDENTE` ou por raio `?lat=X&lng=Y&raio_km=3`) e retornará um JSON único já calculado pelo PostgreSQL para alimentar tanto **Gráficos de Pizza** quanto **Gráficos de Colunas/Barras**:

1. **Porcentagem e Volume por Tipo de Problema (Pizza ou Colunas):**
   * SQL agrupa por `categoria_id` (`GROUP BY categorias.id`), contando o total de denúncias (`COUNT(denuncias.id)`) e calculando o percentual exato de cada categoria dentro daquela região/filtro:
     $$\text{Percentual} = \left(\frac{\text{Total da Categoria na Região}}{\text{Total Geral na Região}}\right) \times 100$$
2. **Tipos de Denúncias Mais Curtidas/Apoiadas (Colunas):**
   * Na mesma consulta agregada por categoria, o banco executa `SUM(denuncias.total_apoios) AS total_curtidas_categoria`, mostrando quais problemas geram maior clamor popular.
3. **Áreas (Bairros) com Mais Denúncias (Ranking em Colunas/Barras Horizontais):**
   * Graças à coluna `bairro` na tabela `denuncias`, o backend executa `SELECT bairro, COUNT(*) AS total_denuncias, SUM(total_apoios) AS total_apoios FROM denuncias GROUP BY bairro ORDER BY total_denuncias DESC LIMIT 10`.
4. **Taxa de Resolução da Prefeitura (Resumo por Status):**
   * Agrupa por `status` (`PENDENTE`, `EM_ANDAMENTO`, `RESOLVIDO`) para exibir o termômetro de eficiência do Gabinete.

---

## 6. Mapa de Endpoints da API

| Método | Rota | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Público | Cadastro tradicional (força `perfil = 'CIDADAO'`). |
| `POST` | `/api/auth/login` | Público | Login com Email/CPF e Senha (retorna JWT + dados do perfil). |
| `POST` | `/api/auth/google` | Público | Login/Cadastro via token Google Auth. |
| `PATCH` | `/api/usuarios/completar-cpf` | Cidadão | Salva o CPF caso a conta tenha sido criada via Google. |
| `GET` | `/api/categorias` | Público | Lista categorias ativas (com `cor_hex` e `icone`). |
| `GET` | `/api/denuncias` | Público/Auth | Lista o Feed com filtros (`lat`, `lng`, `categoria_id`, `bairro`, `status`, `ordenar`). |
| `GET` | `/api/denuncias/verificar-duplicidade` | Cidadão | Busca denúncias ativas da mesma categoria num raio $\le 40\text{ m}$. |
| `GET` | `/api/denuncias/minhas` | Cidadão | Lista denúncias **criadas** e **apoiadas** pelo usuário logado (com flag `is_autor`). |
| `POST` | `/api/denuncias` | Cidadão | Cria nova denúncia (e registra automaticamente o $1^\circ$ apoio do autor). |
| `PUT` | `/api/denuncias/:id` | Autor | Edita denúncia (bloqueia se não for o autor ou se `status != 'PENDENTE'`). |
| `DELETE` | `/api/denuncias/:id` | Autor | Apaga denúncia no banco e foto no Cloudinary (apenas autor + `PENDENTE`). |
| `POST` | `/api/denuncias/:id/apoiar` | Cidadão | Alterna apoio (*like/unlike*), atualiza `total_apoios` e vincula a *"Minhas Denúncias"*. |
| `GET` | `/api/dashboard/estatisticas` | Público | Retorna agregados por categoria (%), mais curtidas, top bairros e status (aceita filtros). |
| `PATCH` | `/api/gabinete/denuncias/:id/status` | **Gestor** | Altera o `status` e grava a `resposta_prefeitura` (Painel de Triagem). |

---

## 7. Estrutura de Diretórios e Padrões de Nomenclatura (Guia para o Antigravity)

Para manter o projeto organizado, fácil de dar manutenção e sem conflitos quando o agente de IA gerar os arquivos, adotaremos um repositório dividido em duas pastas principais (`backend/` e `frontend/`).

### 7.1. Árvore de Diretórios do Projeto

```text
voz-urbana/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # Configuração do Sequelize / Supabase PostgreSQL
│   │   │   └── cloudinary.js        # Configuração da SDK do Cloudinary
│   │   ├── database/
│   │   │   ├── migrations/          # Criação versionada das 4 tabelas e índices
│   │   │   └── seeders/             # População inicial (Categorias padrão + Conta GESTOR)
│   │   ├── models/
│   │   │   ├── index.js             # Inicialização dos Models e Associações (FKs)
│   │   │   ├── Usuario.js
│   │   │   ├── Categoria.js
│   │   │   ├── Denuncia.js
│   │   │   └── ApoioDenuncia.js
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js    # Valida o token JWT e injeta req.usuario
│   │   │   └── gestorMiddleware.js  # Verifica se req.usuario.perfil === 'GESTOR'
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── denunciaController.js
│   │   │   ├── dashboardController.js
│   │   │   └── gabineteController.js
│   │   ├── routes/
│   │   │   ├── index.js             # Agrupador de rotas (/api/*)
│   │   │   ├── authRoutes.js
│   │   │   ├── denunciaRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   └── gabineteRoutes.js
│   │   ├── utils/
│   │   │   ├── haversineSql.js      # Snippet centralizado da fórmula de distância SQL
│   │   │   └── validadorCpf.js      # Validação matemática de CPF
│   │   ├── app.js                   # Configuração do Express, CORS e JSON parser
│   │   └── server.js                # Inicialização da porta HTTP
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── assets/                  # Logos e ícones estáticos
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Header.jsx
    │   │   │   └── SidebarMenu.jsx  # Menu lateral retrátil do wireframe
    │   │   ├── denuncia/
    │   │   │   ├── CardDenuncia.jsx # Card reutilizável (Feed e Minhas Denúncias)
    │   │   │   ├── ModalDuplicata.jsx
    │   │   │   └── MapaSeletor.jsx  # Mini-mapa Leaflet de confirmação de endereço
    │   │   └── dashboard/
    │   │       ├── GraficoPizza.jsx
    │   │       └── GraficoColunas.jsx
    │   ├── contexts/
    │   │   └── AuthContext.jsx      # Estado global do usuário logado e token JWT
    │   ├── hooks/
    │   │   └── useGeolocalizacao.js # Hook para encapsular EXIF + GPS do navegador
    │   ├── pages/
    │   │   ├── HomeFeed.jsx         # #HOME / #FEED DE DENÚNCIA
    │   │   ├── LoginCadastro.jsx    # #LOGIN
    │   │   ├── NovaDenuncia.jsx     # #TELA DE DENÚNCIA (Formulário)
    │   │   ├── MinhasDenuncias.jsx  # #MINHAS DENÚNCIAS (Criadas + Apoiadas)
    │   │   ├── PainelGrafico.jsx    # #TELA DE GRÁFICO (Dashboard)
    │   │   └── PainelGabinete.jsx   # Painel de Triagem exclusivo do GESTOR
    │   ├── services/
    │   │   ├── api.js               # Instância do Axios com interceptor do Token JWT
    │   │   └── nominatimService.js  # Busca endereço e bairro via OpenStreetMap
    │   ├── utils/
    │   │   ├── extratorExif.js      # Leitura de GPS da foto antes de comprimir
    │   │   └── compressorImagem.js  # Compressão client-side antes do upload
    │   ├── App.jsx                  # Configuração do React Router
    │   └── main.jsx
    ├── .env.example
    ├── tailwind.config.js
    └── vite.config.js
```

### 7.2. Padrão de Nomenclatura de Arquivos, Variáveis e Banco de Dados

Para evitar misturas confusas de estilos durante a geração de código, todas as camadas seguirão estas convenções:

| Camada / Contexto | Padrão de Escrita | Idioma Base | Exemplos Práticos |
| :--- | :--- | :--- | :--- |
| **Tabelas do Banco (PostgreSQL)** | `snake_case` (plural) | Português | `usuarios`, `categorias`, `denuncias`, `apoios_denuncia` |
| **Colunas do Banco (PostgreSQL)** | `snake_case` (singular) | Português | `usuario_id`, `total_apoios`, `imagem_url`, `resposta_prefeitura` |
| **Models do Sequelize (Arquivos e Classes)** | `PascalCase` (singular) | Português | `Usuario.js`, `Denuncia.js`, `ApoioDenuncia.js` |
| **Controllers, Routes e Middlewares** | `camelCase` + Sufixo da camada | Português + Sufixo Inglês | `denunciaController.js`, `denunciaRoutes.js`, `gestorMiddleware.js` |
| **Componentes e Páginas React (`.jsx`)** | `PascalCase` | Português | `CardDenuncia.jsx`, `PainelGrafico.jsx`, `MinhasDenuncias.jsx` |
| **Variáveis e Funções (JS / React)** | `camelCase` | Português | `const listaDenuncias = []`, `async function verificarDuplicidade()` |
| **Variáveis Booleanas (Flags)** | `camelCase` com prefixo `is`, `pode` ou `tem` | Híbrido claro | `isAutor`, `podeEditarExcluir`, `temImagem`, `apoiadoPeloUsuario` |
| **Constantes Globais e `.env`** | `UPPER_SNAKE_CASE` | Português / Inglês | `RAIO_MAXIMO_METROS = 40`, `DATABASE_URL`, `JWT_SECRET` |

---

## 8. Roteiro de Execução Passo a Passo para o Antigravity (Ordem de Construção)

Quando iniciar o desenvolvimento no Antigravity, peça para ele executar uma etapa por vez seguindo esta ordem para evitar erros de dependência:

1. **Etapa 1 (Banco e Backend Base):** Inicializar pasta `backend/`, configurar Sequelize com Supabase, rodar *Migrations* das 4 tabelas e rodar o *Seeder* das Categorias e do usuário `GESTOR`.
2. **Etapa 2 (Autenticação e Segurança):** Criar `authController`, `authMiddleware` e `gestorMiddleware` (testando login e bloqueio de rota).
3. **Etapa 3 (Core de Denúncias e Duplicidade):** Criar `denunciaController` com a query de Haversine ($40\text{ m}$), upload pro Cloudinary e rota de apoiar/curtir.
4. **Etapa 4 (Dashboard e Gabinete):** Criar `dashboardController` (agregações SQL para os gráficos) e `gabineteController` (mudança de status).
5. **Etapa 5 (Frontend Base e Autenticação):** Inicializar `frontend/` (React + Vite + Tailwind), criar `SidebarMenu`, tela de `LoginCadastro` e `AuthContext`.
6. **Etapa 6 (Fluxo de Denúncia e Feed):** Construir `NovaDenuncia` (EXIF $\rightarrow$ GPS $\rightarrow$ Leaflet + Nominatim $\rightarrow$ Compressão), `ModalDuplicata`, `HomeFeed` e `MinhasDenuncias`.
7. **Etapa 7 (Gráficos e Painel da Prefeitura):** Construir `PainelGrafico` (alternando visualização entre Pizza e Colunas com filtros dinâmicos) e `PainelGabinete`.