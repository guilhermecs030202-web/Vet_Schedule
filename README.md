# VetSchedule 🐾

> Mini-aplicação web de agenda de coletas de amostras para laboratório veterinário.  
> Desenvolvida como teste prático de Desenvolvedor(a) Full Stack para a **Lands Agência Web**.

---

## 📋 Descrição do Projeto

O **VetSchedule** é uma aplicação construída para solucionar o fluxo de recepção de um laboratório veterinário. A recepção recebe solicitações de coletas de amostras (sangue, urina, biópsias, secreções) de diversas clínicas veterinárias conveniadas, precisando registrar os pedidos, acompanhar o andamento dos exames e, fundamentalmente, **evitar conflitos de horário** entre atendimentos.

### Funcionalidades Implementadas:
- **Autenticação Segura:** Login simples por e-mail e senha com sessão via cookie `HttpOnly` (`SameSite: Lax`) e tokens JWT assinados com `jose`.
- **Rotas Protegidas:** Proteção de páginas e APIs por middleware no Edge Runtime e revalidação de sessão nos Route Handlers.
- **Agenda de Coletas:** Listagem em ordem cronológica crescente com suporte a filtros em tempo real por **Status** (`Agendado`, `Coletado`, `Cancelado`), por **Data** (cobrindo o dia completo) e busca por **Clínica Veterinária**.
- **Gestão de Agendamentos:** Criação, edição e cancelamento de coletas com validações atômicas.
- **Regra de Não-Exclusão:** O cancelamento preserva o histórico no banco, alterando o status para `"Cancelado"`.
- **Bloqueio de Conflito de Horário:** Janela estrita de **60 minutos** que impede agendamentos simultâneos ou com intervalo inferior a 60 minutos para o status *Agendado*.
- **Interface Responsiva:** Visualização em tabela moderna no desktop e cards adaptados para celulares, com tratamento completo de estados visuais (carregamento com skeletons, tratamento de erro com botão de retry e lista vazia amigável).

---

## 🛠️ Stack Tecnológica

- **Front-end & Back-end:** [Next.js](https://nextjs.org/) (App Router, Server Components e Route Handlers).
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/) com tipagem estrita (`strict: true`, sem `any`).
- **ORM & Banco de Dados:** [TypeORM](https://typeorm.io/) e [MySQL 8.0](https://www.mysql.com/).
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) responsivo nativo.
- **Validação de Dados:** [Zod](https://zod.dev/) para validação pura desacoplada do banco.
- **Autenticação:** [jose](https://github.com/panva/jose) (JWT compatível com Edge) e [bcryptjs](https://github.com/dcodeIO/bcrypt.js) para hashing seguro.
- **Testes Automatizados:** [Vitest](https://vitest.dev/).
- **Contêineres:** [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/).

---

## 🚀 Como Rodar o Projeto em até 5 Comandos

### Opção A: Subir tudo via Docker Compose (Aplicação + MySQL)

```bash
# 1. Copie o arquivo de variáveis de ambiente
cp .env.example .env

# 2. Suba a aplicação e o banco com um comando (aguarda o MySQL ficar pronto via healthcheck)
docker compose up -d --build

# 3. Execute o seed para popular o usuário e dados iniciais
docker compose exec app npm run seed
```

> A aplicação estará pronta em: [http://localhost:3000](http://localhost:3000)

---

### Opção B: Rodar com Node.js Local + MySQL no Docker

```bash
# 1. Copie o arquivo de variáveis de ambiente
cp .env.example .env

# 2. Suba apenas o MySQL via Docker Compose
docker compose up -d mysql

# 3. Instale as dependências
npm install

# 4. Popule o banco com o seed inicial
npm run seed

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

> Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🔑 Credenciais Padrão do Seed

O script de seed cria o seguinte usuário para acesso imediato:
- **E-mail:** `recepcao@vetschedule.com`
- **Senha:** `Admin@123` *(ou conforme configurado no seu `.env`)*

---

## ⚙️ Variáveis de Ambiente

As variáveis necessárias para o funcionamento do sistema estão descritas no arquivo [`.env.example`](.env.example):

| Variável | Descrição | Exemplo Padrão |
| :--- | :--- | :--- |
| `DB_HOST` | Endereço do host do banco MySQL | `localhost` (ou `mysql` no Docker) |
| `DB_PORT` | Porta do MySQL | `3306` |
| `DB_USER` | Usuário da base de dados | `vetschedule_user` |
| `DB_PASSWORD` | Senha da base de dados | `vetschedule_password` |
| `DB_NAME` | Nome do banco de dados | `VetSchedule` |
| `DB_ROOT_PASSWORD` | Senha root do contêiner MySQL | `root_password` |
| `JWT_SECRET` | Chave secreta de assinatura do JWT | *(mínimo 32 caracteres)* |
| `SEED_USER_EMAIL` | E-mail do usuário inicial da recepção | `recepcao@vetschedule.com` |
| `SEED_USER_PASSWORD`| Senha do usuário inicial da recepção | `Admin@123` |

---

## 🧪 Como Rodar os Testes

A suíte de testes unitários foi construída com Vitest e valida as regras puras de negócio (campos obrigatórios, bloqueio de data passada, status válidos e janela de conflito de 60 minutos):

```bash
npm test
```

Para rodar com relatório de cobertura ou em modo observador:
```bash
npx vitest
```

---

## 🏛️ Decisões Principais de Arquitetura

1. **DataSource Singleton em `globalThis`:**
   - Para evitar vazamentos de conexão de pool durante o Hot Reloading do Next.js em ambiente de desenvolvimento, a instância do TypeORM é persistida globalmente.

2. **Isolamento de Regras Puras de Negócio:**
   - A validação de esquemas (Zod) e o algoritmo de conflito de horários de 60 minutos foram isolados em módulos puramente funcionais, permitindo testes unitários ultrarrápidos (300ms) sem necessidade de conexões de rede ou banco ativo.

3. **Transações com Lock Pessimista de Escrita (`SELECT ... FOR UPDATE`):**
   - Criação e edição de agendamentos operam dentro de `dataSource.transaction` com `lock: { mode: "pessimistic_write" }`, eliminando condições de corrida (*race conditions*) caso requisições concorrentes aconteçam no mesmo segundo.

4. **Autenticação em Duas Camadas:**
   - **Borda (Edge Middleware):** O middleware valida criptograficamente a assinatura do JWT emitido via `jose`, sem overhead de conexões TCP de banco de dados.
   - **Servidor (Route Handlers):** Cada endpoint revalida a sessão do usuário antes de processar operações sensíveis.

5. **Soft Cancel & Integridade de Estados:**
   - Cancelamentos alteram o status para `"Cancelado"` e mantêm o registro físico. Agendamentos cancelados não podem ser reeditados e amostras com status `"Coletado"` não podem ser canceladas retroativamente.

---

## 📌 O que Ficou de Fora

Para manter o foco nos requisitos centrais e respeitar o limite de tempo estipulado no teste prático, os seguintes itens foram priorizados para versões futuras:
1. **Paginação com Navegação Visual:** A API já suporta parâmetros de página e limite (`page`, `limit`), porém na interface gráfica foi mantida a listagem direta com scroll e filtros rápidos.
2. **Notificações Assíncronas:** Envio de alertas automáticos por WhatsApp ou e-mail para as clínicas confirmando a data da coleta ou avisando sobre cancelamentos.
3. **Cálculo de Rotas por Geolocalização:** Agrupamento geográfico de coletas por bairro/região em vez de um bloqueio temporal estático de 60 minutos.
4. **Anexo de Laudos:** Módulo de upload de arquivos PDF para anexar laudos técnicos diretamente aos agendamentos coletados.

---

## Uso de IA

<!-- a preencher por mim -->
