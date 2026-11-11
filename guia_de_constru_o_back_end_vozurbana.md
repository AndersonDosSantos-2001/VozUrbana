# Guia de Construção do Back-end — vozUrbana (Especificação para o Antigravity)

> **Escopo deste Documento:** Guia prático e sequencial para implementação exclusiva da **API RESTful (Node.js + Express + Sequelize)** e do **Banco de Dados (PostgreSQL no Supabase)** do projeto **vozUrbana**, permitindo testar 100% das regras de negócio via Insomnia/Postman de forma independente do Front-end.

---

## 1. Preparação do Ambiente e Dependências (`backend/`)

### 1.1. Comandos de Inicialização (Terminal Windows)

O agente de código (ou desenvolvedor) deve inicializar o projeto na pasta `backend/` instalando os seguintes pacotes:

* **Dependências de Produção:**
  `npm install express cors dotenv pg pg-hstore sequelize bcryptjs jsonwebtoken google-auth-library cloudinary multer`
* **Dependências de Desenvolvimento:**
  `npm install -D nodemon sequelize-cli`

### 1.2. Arquivo `.sequelizerc` (Na raiz da pasta `backend/`)

Para que o `sequelize-cli` reconheça a nossa estrutura de pastas dentro de `src/`, o arquivo `.sequelizerc` deve apontar para:
* `config`: `src/config/database.js`
* `models-path`: `src/models`
* `seeders-path`: `src/database/seeders`
* `migrations-path`: `src/database/migrations`

### 1.3. Template de Variáveis de Ambiente (`.env.example`)

```env
# Servidor
PORT=3333
NODE_ENV=development

# Banco de Dados (Supabase PostgreSQL - Transaction Pooler ou Direct Connection)
DATABASE_URL=postgresql://postgres:[SUA_SENHA]@db.[SEU_PROJETO].supabase.co:5432/postgres
DB_SSL=true

# Segurança JWT
JWT_SECRET=chave_secreta_academica_voz_urbana_2026
JWT_EXPIRES_IN=7d

# Google OAuth2
GOOGLE_CLIENT_ID=seu_client_id_do_google_cloud.apps.googleusercontent.com

# Cloudinary (Armazenamento de Imagens)
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# Regras de Negócio Globais
RAIO_DUPLICIDADE_METROS=40
```

---

## 2. Fase 1: Banco de Dados, Migrations, Models e Seeders

### 2.1. Configuração de Conexão com o Supabase (`src/config/database.js`)

* Utilizar a variável `DATABASE_URL` com dialeto `postgres`.
* **Regra Crítica para Supabase:** Habilitar `dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }` quando `DB_SSL === 'true'`, garantindo que a conexão remota não falhe por certificado SSL.
* Configurar `define: { timestamps: true, underscored: true, underscoredAll: true }` para que o Sequelize mapeie automaticamente `createdAt` $\rightarrow$ `created_at` e `updatedAt` $\rightarrow$ `updated_at` no padrão `snake_case`.

### 2.2. Ordem Cronológica das Migrations (`src/database/migrations/`)

As 4 migrations devem ser geradas e executadas exatamente nesta ordem para respeitar as chaves estrangeiras (FKs):

1. **`01-create-usuarios.js`:**
   * Cria a tabela `usuarios`.
   * Campos: `id` (PK), `nome` (`STRING(120)`, `allowNull: false`), `email` (`STRING(150)`, `unique: true`, `allowNull: false`), `cpf` (`STRING(14)`, `unique: true`, `allowNull: true`), `senha_hash` (`STRING(255)`, `allowNull: true`), `google_id` (`STRING(100)`, `unique: true`, `allowNull: true`), `perfil` (`ENUM('CIDADAO', 'GESTOR')`, `defaultValue: 'CIDADAO'`, `allowNull: false`), `created_at`, `updated_at`.
2. **`02-create-categorias.js`:**
   * Cria a tabela `categorias`.
   * Campos: `id` (PK), `nome` (`STRING(80)`, `allowNull: false`), `icone` (`STRING(50)`, `allowNull: false`), `cor_hex` (`STRING(7)`, `allowNull: false`), `ativo` (`BOOLEAN`, `defaultValue: true`), `created_at`, `updated_at`.
3. **`03-create-denuncias.js`:**
   * Cria a tabela `denuncias`.
   * Campos: `id` (PK), `usuario_id` (FK $\rightarrow$ `usuarios.id`, `ON UPDATE CASCADE`, `ON DELETE CASCADE`, `allowNull: false`), `categoria_id` (FK $\rightarrow$ `categorias.id`, `ON UPDATE CASCADE`, `ON DELETE RESTRICT`, `allowNull: false`), `observacao` (`TEXT`, `allowNull: true`), `imagem_url` (`TEXT`, `allowNull: true`), `imagem_public_id` (`STRING(150)`, `allowNull: true`), `latitude` (`DECIMAL(10, 8)`, `allowNull: false`), `longitude` (`DECIMAL(11, 8)`, `allowNull: false`), `endereco_aproximado` (`STRING(255)`, `allowNull: false`), `bairro` (`STRING(100)`, `allowNull: false`), `status` (`ENUM('PENDENTE', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO')`, `defaultValue: 'PENDENTE'`), `resposta_prefeitura` (`TEXT`, `allowNull: true`), `total_apoios` (`INTEGER`, `defaultValue: 1`, `allowNull: false`), `created_at`, `updated_at`.
   * **Índices adicionados via `queryInterface.addIndex` na mesma migration:**
     * `idx_denuncias_categoria_status` em `['categoria_id', 'status']`
     * `idx_denuncias_bairro` em `['bairro']`
     * `idx_denuncias_total_apoios` em `['total_apoios']`
     * `idx_denuncias_coordenadas` em `['latitude', 'longitude']`
4. **`04-create-apoios-denuncia.js`:**
   * Cria a tabela `apoios_denuncia`.
   * Campos: `id` (PK), `usuario_id` (FK $\rightarrow$ `usuarios.id`, `ON DELETE CASCADE`), `denuncia_id` (FK $\rightarrow$ `denuncias.id`, `ON DELETE CASCADE`), `created_at`, `updated_at`.
   * **Constraint Obrigatória:** `uniqueIndex` composto em `['usuario_id', 'denuncia_id']` para impedir curtidas duplicadas no banco.

### 2.3. Relacionamentos dos Models (`src/models/`)

* `Usuario` **1:N** `Denuncia` (`as: 'denunciasCriadas'`, `foreignKey: 'usuario_id'`)
* `Categoria` **1:N** `Denuncia` (`as: 'denuncias'`, `foreignKey: 'categoria_id'`)
* `Denuncia` **N:1** `Usuario` (`as: 'autor'`, `foreignKey: 'usuario_id'`)
* `Denuncia` **N:1** `Categoria` (`as: 'categoria'`, `foreignKey: 'categoria_id'`)
* `Usuario` **N:M** `Denuncia` através de `ApoioDenuncia` (`as: 'denunciasApoiadas'`, `foreignKey: 'usuario_id'`, `otherKey: 'denuncia_id'`)

### 2.4. Seeders Obrigatórios (`src/database/seeders/`)

1. **`01-seed-categorias.js`:** Insere as 5 categorias iniciais da zeladoria com cores pensadas para os gráficos do Figma:
   * *Buraco na via* (`icone: 'road'`, `cor_hex: '#EF4444'`)
   * *Falta de iluminação pública* (`icone: 'lightbulb-off'`, `cor_hex: '#F59E0B'`)
   * *Falta de água* (`icone: 'droplet-off'`, `cor_hex: '#3B82F6'`)
   * *Lixo ou entulho não coletado* (`icone: 'trash-2'`, `cor_hex: '#10B981'`)
   * *Outros serviços de zeladoria* (`icone: 'alert-circle'`, `cor_hex: '#8B5CF6'`)
2. **`02-seed-usuario-gestor.js`:** Cria a conta exclusiva da Prefeitura (`nome: 'Gabinete da Prefeitura'`, `email: 'gabinete@vozurbana.gov.br'`, `cpf: '000.000.000-00'`, `senha_hash` gerada com `bcrypt.hashSync('Prefeitura@2026', 10)`, `perfil: 'GESTOR'`).

---

## 3. Fase 2: Autenticação, Segurança e Middlewares

### 3.1. Utilitário `src/utils/validadorCpf.js`

* Função pura `validarCpf(cpf)` que remove pontuação, verifica se possui $11$ dígitos, rejeita sequências repetidas (`111.111.111-11`) e valida os dois dígitos verificadores matemáticos.
* Função `formatarCpfPadrao(cpf)` para salvar sempre no formato `000.000.000-00` ou apenas os $11$ números (padronizar apenas números no banco para facilitar buscas).

### 3.2. Middlewares de Proteção (`src/middlewares/`)

1. **`authMiddleware.js`:**
   * Lê o header `Authorization: Bearer <token>`.
   * Valida com `jwt.verify(token, process.env.JWT_SECRET)`.
   * Injeta `req.usuario = { id: decoded.id, perfil: decoded.perfil }` na requisição.
   * Cria também uma variação `authOpcionalMiddleware.js` para a rota pública do Feed (`GET /api/denuncias`): se o cidadão enviar token, o backend identifica quais denúncias ele já curtiu (`apoiado_pelo_usuario: true`); se for visitante anônimo, retorna `apoiado_pelo_usuario: false`.
2. **`gestorMiddleware.js`:**
   * Executado sempre após o `authMiddleware`.
   * Verifica `if (req.usuario.perfil !== 'GESTOR') return res.status(403).json({ erro: 'Acesso restrito ao Gabinete da Prefeitura.' })`.

### 3.3. Regras do `authController.js`

* **`POST /api/auth/register`:** Desestrutura apenas `{ nome, email, cpf, senha }`. Valida CPF, verifica duplicidade de email/CPF, gera hash da senha e cria usuário forçando `perfil: 'CIDADAO'`. Retorna token JWT e objeto `usuario` (sem `senha_hash`).
* **`POST /api/auth/login`:** Aceita login por `email` **ou** `cpf` + `senha`. Compara hash com `bcrypt.compare` e retorna o token JWT.
* **`POST /api/auth/google`:** Recebe `{ idToken }` do Google, valida com `google-auth-library`, busca usuário por `google_id` ou `email`. Se não existir, cria com `perfil: 'CIDADAO'`. Retorna flag `precisa_completar_cpf: !usuario.cpf`.
* **`PATCH /api/usuarios/completar-cpf`:** Permite que o usuário logado via Google cadastre seu CPF antes de criar a primeira denúncia.

---

## 4. Fase 3: Core de Denúncias, Cloudinary, Haversine e Apoios

### 4.1. Utilitário Geográfico (`src/utils/haversineSql.js`)

Centraliza a expressão SQL da **Fórmula de Haversine** retornando a distância em quilômetros para ser reutilizada tanto na verificação de duplicatas quanto na ordenação do Feed:

$$
d = 6371 \times \arccos\left(\cos(\text{radians}(lat_1)) \times \cos(\text{radians}(lat_2)) \times \cos(\text{radians}(lng_2) - \text{radians}(lng_1)) + \sin(\text{radians}(lat_1)) \times \sin(\text{radians}(lat_2))\right)
$$

* **Cuidado Técnico no PostgreSQL:** Usar `LEAST(1.0, GREATEST(-1.0, ...))` dentro do `ACOS(...)` na string SQL para evitar erro de ponto flutuante (`input is out of range`) quando o usuário estiver exatamente na mesma coordenada da denúncia ($d = 0$).

### 4.2. Upload de Imagem (`src/config/cloudinary.js` + `multer`)

* Configurar o `multer` com `memoryStorage()` e limite de $5\text{ MB}$.
* Se a requisição `POST /api/denuncias` contiver arquivo (`req.file`), enviar o buffer para o Cloudinary na pasta `voz_urbana/denuncias` e extrair `secure_url` ($\rightarrow$ `imagem_url`) e `public_id` ($\rightarrow$ `imagem_public_id`).

### 4.3. Regras de Negócio do `denunciaController.js`

1. **`GET /api/denuncias/verificar-duplicidade`:**
   * Recebe `?lat=X&lng=Y&categoria_id=Z`.
   * Busca denúncias onde `categoria_id = Z`, `status NOT IN ('RESOLVIDO', 'REJEITADO')` e distância Haversine $\le 0.04\text{ km}$ ($40\text{ metros}$).
   * Retorna `{ possui_duplicata: true/false, denuncias_proximas: [...] }`.
2. **`POST /api/denuncias` (Com Transaction do Sequelize):**
   * Verifica se `req.usuario` possui CPF cadastrado no banco.
   * Cria o registro na tabela `denuncias` com `total_apoios: 1`.
   * Na mesma transação, insere o registro inicial na tabela `apoios_denuncia` (`usuario_id: req.usuario.id`, `denuncia_id: novaDenuncia.id`), garantindo que o autor já conte como o $1^\circ$ apoiador.
3. **`GET /api/denuncias` (Feed Geral com Filtros):**
   * Aceita *Query Params*: `lat`, `lng`, `categoria_id`, `bairro`, `status`, `busca` (`ILIKE` em `endereco_aproximado` ou `observacao`) e `ordenar` (`menor_distancia`, `maior_distancia`, `mais_curtidas`, `mais_recentes`).
4. **`GET /api/denuncias/minhas` (Criadas + Apoiadas):**
   * Busca todas as denúncias onde o usuário logado é autor (`denuncias.usuario_id = id`) **ou** está presente em `apoios_denuncia`.
   * Formata cada item adicionando os campos calculados:
     * `is_autor`: `denuncia.usuario_id === req.usuario.id`
     * `pode_editar_excluir`: `denuncia.usuario_id === req.usuario.id && denuncia.status === 'PENDENTE'`
5. **`PUT /api/denuncias/:id` e `DELETE /api/denuncias/:id`:**
   * Busca a denúncia pelo `id`.
   * Se `denuncia.usuario_id !== req.usuario.id`, retorna `403 Forbidden` (*"Apenas o autor original pode alterar ou excluir esta denúncia."*).
   * Se `denuncia.status !== 'PENDENTE'`, retorna `400 Bad Request` (*"Não é possível alterar ou excluir uma denúncia que já entrou em análise pela prefeitura."*).
   * No `DELETE`, se houver `imagem_public_id`, chama `cloudinary.uploader.destroy(denuncia.imagem_public_id)` antes de deletar do banco.
6. **`POST /api/denuncias/:id/apoiar` (Toggle de Apoio / Coração):**
   * Em uma transação (`sequelize.transaction`), verifica se já existe registro em `apoios_denuncia` para `(usuario_id, denuncia_id)`.
   * Se **não existir**: cria o vínculo e executa `denuncia.increment('total_apoios', { by: 1 })`. Retorna `{ apoiado: true, total_apoios: novoTotal }`.
   * Se **já existir** (e o usuário não for o autor original descurtindo a própria postagem, ou permitindo toggle livre): remove o vínculo e executa `denuncia.decrement('total_apoios', { by: 1 })`.

---

## 5. Fase 4: Dashboard (Gráficos) e Painel do Gabinete

### 5.1. Contrato JSON de Retorno para o seu Protótipo no Figma

Para ajudar você a desenhar os cards do Feed, a tela "Minhas Denúncias" e a "Tela de Gráfico" no Figma, o backend entregará exatamente estas estruturas JSON:

#### A) Exemplo de Retorno do Card (`GET /api/denuncias` e `GET /api/denuncias/minhas`)

```json
{
  "id": 42,
  "observacao": "Cratera aberta na faixa da direita após a chuva.",
  "imagem_url": "https://res.cloudinary.com/.../buraco.jpg",
  "latitude": -8.1123456,
  "longitude": -35.0154321,
  "endereco_aproximado": "Av. Barreto de Menezes, 450",
  "bairro": "Prazeres",
  "status": "EM_ANDAMENTO",
  "resposta_prefeitura": "Equipe de tapa-buracos agendada para esta semana.",
  "total_apoios": 28,
  "distancia_km": 0.35,
  "apoiado_pelo_usuario": true,
  "is_autor": false,
  "pode_editar_excluir": false,
  "created_at": "2026-11-05T14:20:00.000Z",
  "categoria": {
    "id": 1,
    "nome": "Buraco na via",
    "icone": "road",
    "cor_hex": "#EF4444"
  },
  "autor": {
    "id": 7,
    "nome": "Carlos Silva"
  }
}
```

#### B) Exemplo de Retorno da Tela de Gráfico (`GET /api/dashboard/estatisticas`)

Aceita filtros `?bairro=Prazeres&periodo_dias=30&status=PENDENTE` e devolve tudo pronto para os componentes de **Pizza** e **Colunas**:

```json
{
  "filtros_aplicados": {
    "bairro": "Prazeres",
    "periodo_dias": 30,
    "status": "TODOS"
  },
  "resumo_geral": {
    "total_denuncias": 120,
    "total_apoios_acumulados": 540,
    "taxa_resolucao_percentual": 45.0
  },
  "por_categoria": [
    {
      "categoria_id": 1,
      "nome": "Buraco na via",
      "cor_hex": "#EF4444",
      "total_denuncias": 54,
      "percentual": 45.0,
      "total_curtidas": 310
    },
    {
      "categoria_id": 2,
      "nome": "Falta de iluminação pública",
      "cor_hex": "#F59E0B",
      "total_denuncias": 36,
      "percentual": 30.0,
      "total_curtidas": 145
    }
  ],
  "areas_mais_criticas": [
    {
      "bairro": "Prazeres",
      "total_denuncias": 48,
      "total_curtidas": 220
    },
    {
      "bairro": "Piedade",
      "total_denuncias": 39,
      "total_curtidas": 180
    }
  ],
  "por_status": [
    { "status": "PENDENTE", "total": 40, "percentual": 33.3 },
    { "status": "EM_ANDAMENTO", "total": 26, "percentual": 21.7 },
    { "status": "RESOLVIDO", "total": 54, "percentual": 45.0 }
  ]
}
```

### 5.2. Regras do `gabineteController.js`

* **`GET /api/gabinete/denuncias`:** Rota exclusiva do `GESTOR`. Permite ordenar a fila de triagem por `prioridade` (`total_apoios DESC`), `antiguidade` (`created_at ASC`) ou filtrar por `bairro`, `status` e `categoria_id`.
* **`PATCH /api/gabinete/denuncias/:id/status`:** Rota exclusiva do `GESTOR`. Recebe `{ status, resposta_prefeitura }`, valida se o `status` pertence ao `ENUM` permitido e atualiza o registro.

---

## 6. Prompts Prontos para Executar no Antigravity (Copie e Cole por Fase)

Para que o Antigravity construa o seu Back-end com precisão cirúrgica e sem misturar etapas, envie os comandos abaixo um de cada vez:

### Prompt 1 — Estrutura Base, Banco e Migrations (Fase 1)
> *"Leia os arquivos `arquitetura_voz_urbana.md` e `guia_construcao_backend.md`. Execute apenas a **Fase 1 do Back-end**: crie a estrutura de pastas dentro de `backend/`, configure o `package.json`, `.sequelizerc`, `.env.example`, `src/config/database.js` (com suporte SSL para o Supabase), gere as 4 migrations na ordem especificada com seus respectivos índices, crie os 4 Models do Sequelize em `src/models/` com todas as associações e crie os 2 Seeders (`categorias` e `usuario-gestor`). Não crie os controllers ainda."*

### Prompt 2 — Autenticação e Segurança RBAC (Fase 2)
> *"Agora execute a **Fase 2 do `guia_construcao_backend.md`**: implemente o `src/utils/validadorCpf.js`, os middlewares `authMiddleware.js` (incluindo o `authOpcionalMiddleware`) e `gestorMiddleware.js`, o `authController.js` (com proteção contra Mass Assignment forçando `perfil = 'CIDADAO'`, login por email ou CPF, login Google e rota de completar CPF) e conecte as rotas em `src/routes/authRoutes.js`, `src/app.js` e `src/server.js`."*

### Prompt 3 — Core de Denúncias, Cloudinary, Haversine e Apoios (Fase 3)
> *"Agora execute a **Fase 3 do `guia_construcao_backend.md`**: configure o Cloudinary e o Multer em `src/config/cloudinary.js`, crie o utilitário `src/utils/haversineSql.js` (usando `LEAST`/`GREATEST` no `ACOS`), e implemente o `denunciaController.js` e `denunciaRoutes.js` com todas as 6 operações: verificação de duplicidade em raio de 40m, criação transacional com 1º apoio automático, listagem do Feed com filtros combináveis e distância, listagem de 'Minhas Denúncias' (criadas + apoiadas com flags `is_autor` e `pode_editar_excluir`), edição/exclusão com trava dupla de autoria + status `PENDENTE`, e toggle de apoio."*

### Prompt 4 — Dashboard de Gráficos e Painel do Gabinete (Fase 4)
> *"Por fim, execute a **Fase 4 do `guia_construcao_backend.md`**: implemente o `dashboardController.js` (`GET /api/dashboard/estatisticas`) retornando o JSON agregado por categoria (com percentual e soma de curtidas), ranking de bairros (`areas_mais_criticas`) e resumo por status, além do `gabineteController.js` protegido pelo `gestorMiddleware` para triagem e atualização de status com `resposta_prefeitura`. Gere também um arquivo `insomnia_requests.json` (ou coleção de testes) para eu testar todas as rotas."*