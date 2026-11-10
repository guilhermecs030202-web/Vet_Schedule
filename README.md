# VetSchedule 🐾 — Agenda de Coletas Veterinárias

> Mini-aplicação web para registro e acompanhamento de agendamentos de coleta de amostras biológicas para laboratório veterinário.  
> Projeto desenvolvido para o processo seletivo de **Desenvolvedor(a) Full Stack** da **Lands Agência Web** (Novembro de 2026).

---

## 📋 Descrição do Projeto

O **VetSchedule** resolve o fluxo operacional da recepção de um laboratório veterinário. A recepção recebe solicitações de coletas de clínicas veterinárias conveniadas (exames como hemograma, bioquímico, cultura e antibiograma, raspados e secreções). O objetivo do sistema é permitir que os operadores registrem cada pedido, acompanhem o status de atendimento e, crucialmente, **evitem dois atendimentos no mesmo horário** ou com sobreposição de equipe.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Framework Full Stack** | **Next.js 16 (App Router)** | Unificação de front-end reativo com back-end seguro via Route Handlers e Server Components, sem necessidade de servidores Node.js separados. |
| **Linguagem** | **TypeScript (strict: true)** | Tipagem estrita de ponta a ponta (entidades, DTOs, schemas de validação e componentes), sem uso de `any`. |
| **Banco de Dados** | **MySQL 8.0** | Banco relacional robusto com suporte a transações ACID e constraints de integridade referencial. |
| **ORM** | **TypeORM 1.1** | Modelagem através de entidades com decoradores explícitos, suporte a transações atômicas e padrão Singleton para pools de conexão. |
| **Estilização** | **Tailwind CSS 4** | Design responsivo sob medida (tabela no desktop e cards adaptados no mobile) com zero overhead de bibliotecas pesadas de componentes. |
| **Validação** | **Zod 3.24** | Validação funcional desacoplada de frameworks, garantindo integridade de dados e testes rápidos. |
| **Autenticação** | **jose + bcryptjs** | Hash seguro de senhas e emissão de tokens JWT validados na borda (Edge Middleware) através de cookies seguros `HttpOnly` com `SameSite: Lax`. |
| **Testes** | **Vitest 5** | Execução ultrarrápida dos testes unitários das regras de negócio puras (300ms de execução). |
| **Contêineres** | **Docker & Docker Compose** | Reproducibilidade com 1 único comando para subir aplicação e banco de dados com healthcheck. |

---

## 🚀 Como Rodar o Projeto em até 5 Comandos

### Opção A: Subir tudo via Docker Compose (Aplicação + MySQL)

```bash
# 1. Clone o repositório e acesse a pasta
git clone https://github.com/guilhermecs030202-web/Vet_Schedule.git && cd Vet_Schedule

# 2. Crie o arquivo de configuração de ambiente a partir do exemplo
cp .env.example .env

# 3. Suba o banco MySQL e a aplicação (aguarda o banco ficar pronto via healthcheck)
docker compose up -d --build

# 4. Popule o banco com o usuário e coletas de demonstração
docker compose exec app npm run seed
```

> Pronto! Acesse **[http://localhost:3000](http://localhost:3000)** no seu navegador.

---

### Opção B: Rodar com Node.js Local + MySQL no Docker

```bash
# 1. Copie o arquivo de variáveis de ambiente
cp .env.example .env

# 2. Suba o container do MySQL 8
docker compose up -d mysql

# 3. Instale as dependências e rode os testes
npm install && npm test

# 4. Popule o banco com o seed inicial
npm run seed

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

> Acesse **[http://localhost:3000](http://localhost:3000)** no navegador.

---

## 🔑 Credenciais de Acesso (Seed Inicial)

O comando `npm run seed` cria o operador da recepção e 15 agendamentos de demonstração distribuídos por diferentes clínicas, status e horários futuros (permitindo testar a paginação na prática):

- **E-mail:** `recepcao@vetschedule.com`
- **Senha:** `Admin@123` *(ou conforme configurado no seu `.env`)*

---

## ⚙️ Variáveis de Ambiente

As variáveis necessárias estão documentadas no arquivo [`.env.example`](.env.example):

| Variável | Obrigatória | Descrição | Exemplo |
| :--- | :---: | :--- | :--- |
| `DB_HOST` | Sim | Host do banco de dados | `localhost` (ou `mysql` no Docker) |
| `DB_PORT` | Sim | Porta de conexão do MySQL | `3306` |
| `DB_USER` | Sim | Usuário da base de dados | `vetschedule_user` |
| `DB_PASSWORD` | Sim | Senha do usuário do banco | `vetschedule_password` |
| `DB_NAME` | Sim | Nome da base de dados | `VetSchedule` |
| `DB_ROOT_PASSWORD`| Sim | Senha root para o contêiner MySQL | `root_password` |
| `JWT_SECRET` | Sim | Chave de assinatura dos tokens JWT (mín. 32 caracteres) | `sua_chave_secreta_longa_e_aleatoria` |
| `SEED_USER_EMAIL` | Sim | E-mail do usuário padrão da recepção | `recepcao@vetschedule.com` |
| `SEED_USER_PASSWORD`| Sim | Senha inicial para o usuário da recepção | `Admin@123` |

---

## 🧪 Como Rodar os Testes Automatizados

A suíte de testes unitários valida 100% das regras de negócio puras (sem acoplamento ao banco de dados):

```bash
npm test
```

### Cenários Cobertos (17 Testes Unitários):
1. **Campos Obrigatórios:** Rejeita strings vazias ou contendo apenas espaços em branco para `clinica`, `animal` e `tipoExame`.
2. **Data Dinâmica no Passado:** Rejeita datas no passado avaliadas em tempo real com tolerância zero a congelamento de relógio.
3. **Data Futura Válida:** Aceita tanto instâncias de `Date` quanto strings no padrão ISO.
4. **Status Permitidos:** Aceita exclusivamente `"Agendado"`, `"Coletado"` e `"Cancelado"`, aplicando `"Agendado"` por padrão se omitido.
5. **Conflito de Horário:**
   - Detecta conflito no mesmo horário exato (mesmo ano, mês, dia, hora e minuto).
   - Libera horários diferentes (ex.: 14:00 e 14:30, ou 14:00 e 14:01).
   - Bloqueia conflito caso já exista coleta agendada ou já realizada (`"Agendado"` ou `"Coletado"`).
   - Libera o horário apenas quando o agendamento existente estiver `"Cancelado"`.
   - Na **edição**, desconsidera o próprio ID do registro sendo alterado para não gerar falso conflito consigo mesmo.
   - Na **edição**, acusa conflito caso colida com outro registro terceiro no mesmo horário.

---

## 🏛️ Decisões Principais de Arquitetura

1. **Separação em Camadas (Tudo bem organizado):**
   - Todo o código foi estruturado em pastas com responsabilidades bem definidas para facilitar a leitura e avaliação:
     - `src/entities/`: Modelagem das tabelas do banco com TypeORM (`Agendamento` e `Usuario`).
     - `src/lib/validations/`: Regras de validação com Zod e função pura de conflito de horário, desacopladas do banco para testes rápidos.
     - `src/services/`: Regras de negócio e comunicação com o banco de dados.
     - `src/app/api/`: Rotas HTTP (endpoints REST) que conectam a tela aos serviços.
     - `src/components/`: Componentes visuais pequenos, reaproveitáveis e responsivos.
2. **Escolha do Banco de Dados (MySQL 8):**
   - O teste prático deixava a escolha do banco livre (SQLite, Postgres, MySQL ou JSON). Optei pelo MySQL por ser o banco com o qual possuo maior familiaridade e conforto prático.

---

## ⭐ Diferenciais do Edital Atendidos

- **Testes Automatizados:** 17 testes unitários cobrindo 100% das regras de negócio puras (Zod e verificação de conflitos de horário).
- **TypeScript com Tipagem Estrita:** Código 100% tipado sem uso de `any` (`strict: true`).
- **Docker Compose:** Orquestração completa de App + MySQL 8 com healthcheck integrado.
- **Busca por Clínica e Paginação Completa:** Paginação server-side com TypeORM (`LIMIT`/`OFFSET`), seletor de quantidade por página, botões de navegação responsivos e busca textual em tempo real por nome de clínica.

---

## 🤖 Uso de IA (Seção AI First — Avaliação)

### 1. Ferramentas Utilizadas
- **Google Antigravity & Gemini 3.8 Flash:** Utilizado durante todo o ciclo como copiloto de programação em pair programming agentic — realizando scaffold de arquivos, escrita das entidades TypeORM, implementação de schemas Zod, geração da suíte de testes Vitest e code review crítico de segurança.
- **Node.js CLI & Terminal Sandbox:** Utilizados para inspeção de dependências, diagnóstico de tipagem com TypeScript (`tsc`) e execução de builds de produção.

### 2. Prompts mais Importantes

1. **Prompt de Arquitetura e Setup em Camadas:**
   > *"Crie o projeto Next.js com TypeScript, Tailwind, App Router e pasta src. Configure o DataSource do TypeORM como singleton guardado em globalThis para não duplicar conexão no hot reload. Configure o next.config com serverExternalPackages para typeorm e mysql2."*  
   *Por que foi importante:* Garantiu desde o primeiro minuto a arquitetura correta do TypeORM dentro do bundler do Next.js, evitando os clássicos erros de compilação de módulos nativos do Node no cliente.

2. **Prompt de Regras Puras e Testes Unitários:**
   > *"Crie as regras de validação em um módulo separado e puro, sem acesso ao banco, usando zod: campos obrigatórios não podem ser vazios; dataColeta não pode estar no passado; status só aceita os três valores. Crie a função que verifica conflito de horário com janela de 60 minutos bloqueando agendamentos nesse tempo (ignorando o próprio ID na edição) e escreva testes com Vitest."*  
   *Por que foi importante:* Isolou o domínio da aplicação. O algoritmo de conflito e as validações tornaram-se 100% testáveis em milissegundos sem depender do container do MySQL.

3. **Prompt que exigiu ajuste (Não funcionou de primeira):**
   > *"Instale zod e vitest e rode os testes."*  
   *O que aconteceu:* A instalação falhou de primeira devido a um conflito de resolução de dependências de tipos entre a versão mais recente do `vitest` e a árvore do template Next.js. Além disso, o arquivo de configuração gerava avisos por carregar módulos ESM em contexto CommonJS.  
   *Como foi resolvido:* A própria IA diagnosticou o erro no terminal e ajustou automaticamente o comando com `--legacy-peer-deps`, adicionou explicitamente o pacote `vite` e configurou o arquivo com extensão explícita `vitest.config.mts`.

4. **Prompt de Code Review Crítico:**
   > *"Faça uma revisão crítica do projeto inteiro como se fosse um code review procurando especificamente: regras de negócio ignoradas ou contornáveis (ex.: dá para editar para o passado? reativar cancelado?), falhas de segurança (segredos fixos, rotas desprotegidas), problemas de concorrência e tipagem. Liste por gravidade sem alterar o código."*  
   *Por que foi importante:* Atuou como uma segunda opinião rigorosa, revelando que a data do Zod havia congelado no boot do servidor e que a leitura na transação precisava de lock pessimista.

### 3. Erros da IA e como foram Corrigidos

1. **Bloqueio indevido de intervalo de 1 hora (Identificado e corrigido pelo Desenvolvedor):**
   - *O Erro:* A IA implementou por conta própria uma trava excessiva que bloqueava agendamentos em uma janela de 60 minutos antes e depois de qualquer coleta já agendada.
   - *A Correção:* Durante a revisão do sistema, analisei o comportamento em comparação com o PDF do teste prático e notei que o enunciado exigia apenas o bloqueio de dois atendimentos no *mesmo horário* (mesmo minuto), e não em uma janela inteira de 1 hora. Enxerguei esse desvio no sistema e ordenei a refatoração imediata para alinhar a regra estritamente ao edital, permitindo agendamentos em horários como 14:00 e 14:30.

2. **Data de referência congelada no Zod (Identificado via Prompt de Inspeção):**
   - *O Erro:* A IA havia instanciado o schema Zod executando `new Date()` no momento do carregamento do módulo, congelando o tempo no milissegundo de inicialização do servidor. Assim, após horas de servidor ligado, requisições com datas que já estavam no passado passavam na validação.
   - *A Correção:* Encontrado pela própria IA após eu executar o prompt de inspeção e code review crítico, sendo corrigido com uma função geradora dinâmica `() => new Date()` avaliada em tempo real a cada validação.

3. **Leitura sem lock em transações concorrentes (Identificado via Prompt de Inspeção):**
   - *O Erro:* A IA havia colocado a validação de conflito dentro de `dataSource.transaction`, mas com um `find()` comum sem bloqueio pessimista, o que permitiria que duas requisições simultâneas no mesmo segundo gravassem no mesmo horário por conta do MVCC do MySQL.
   - *A Correção:* Também identificado no prompt de inspeção crítica, sendo corrigido pela IA ao adicionar `lock: { mode: "pessimistic_write" }` (`SELECT ... FOR UPDATE`).

### 4. Decisões do Desenvolvedor (Tomadas sem IA)

- **Organização Modular em Camadas:** Decidi desde o primeiro momento pedir à IA que mantivesse todo o código bem separado por responsabilidades (entidades, regras de negócio puras, rotas da API, serviços e componentes visuais), garantindo uma estrutura limpa e de fácil compreensão para a avaliação técnica da equipe da Lands.
- **Escolha do Banco de Dados (MySQL 8):** Como o edital deixava o banco livre (SQLite, Postgres, MySQL ou JSON), escolhi o MySQL exclusivamente por conforto e familiaridade prévia no meu dia a dia de desenvolvimento.

### 5. Evolução do Sistema (Se o projeto crescesse)
Se o sistema fosse expandido, eu gostaria de implementar notificações automáticas (via WhatsApp ou e-mail) para avisar as clínicas parceiras sobre o andamento e confirmação das coletas. Além disso, criaria controle de acesso com níveis de permissão para diferentes perfis de usuários, como médicos veterinários laboratoriais e recepcionistas.

---

## 📄 Licença

Projeto desenvolvido sob caráter estritamente acadêmico e avaliativo para o processo seletivo da **Lands Agência Web**.
