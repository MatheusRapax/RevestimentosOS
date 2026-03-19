# Plan: Adição de Ambientes nos Orçamentos

## Overview
A feature visa permitir que usuários vinculem produtos a um "Ambiente" (ex: Sala, Cozinha, Fachada) durante a criação de um orçamento, além de agrupar visualmente esses itens por ambiente no documento impresso do orçamento. Um módulo de administração no frontend permitirá o gerenciamento (CRUD) de quais ambientes estão disponíveis na loja (Clinic).

## Project Type
**WEB** (Next.js Frontend + NestJS Backend)

## Success Criteria
- [ ] Admin consegue criar, editar, listar e remover Ambientes na rota `/dashboard/configuracoes/ambientes`
- [ ] Na criação/edição de Orçamentos, cada item da tabela de produtos possui um select para "Ambiente", listando os criados no admin
- [ ] A impressão do Orçamento PDF (e Web) agrupa os produtos sob os títulos de seus respectivos ambientes
- [ ] Faturamentos e conversão para Pedidos de Venda carregam as informações caso necessário (mas com foco inicial em QuoteItem)

## Tech Stack
- Frontend: Next.js (App Router), React, TailwindCSS, zod (validação), Radix UI (shadcn)
- Backend: NestJS, Prisma ORM, PostgreSQL
- Agents: `database-architect` (P0), `backend-specialist` (P1), `frontend-specialist` (P2)

## File Structure

├── prisma/
│   └── schema.prisma (Nova Tabela: Environment, Update: QuoteItem)
├── src/modules/environments/
│   ├── environments.module.ts
│   ├── environments.controller.ts
│   ├── environments.service.ts
│   └── dto/...
├── src/modules/quotes/
│   ├── dto/ (Atualizar CreateQuoteDto/UpdateQuoteItemDto)
│   └── pdf/quote-pdf.service.ts (Nova lógica de agrupamento)
├── clinicos-web/src/app/dashboard/configuracoes/ambientes/
│   └── page.tsx + forms
├── clinicos-web/src/app/dashboard/orcamentos/
│   └── componentes atualizados para conter Select de Ambiente
└── clinicos-web/src/components/quotes/
    └── quote-template-viewer.tsx (Atualizado)

## Task Breakdown

### TASK 1: Banco de Dados - Schema Prisma e Migrations
- **Agent:** `database-architect`
- **Skills:** `database-design`
- **Priority:** P0
- **INPUT:** Adicionar model `Environment` (id, name, clinicId, isActive, createdAt, updatedAt) + Relacionamentos (`QuoteItem` recebe `environmentId` opcional).
- **OUTPUT:** Migrations geradas e PRISMA tipagens atualizadas.
- **VERIFY:** Comando `npx prisma generate` e db push passam. A tabela existe via prisma studio.

### TASK 2: Backend - CRUD Ambientes
- **Agent:** `backend-specialist`
- **Skills:** `api-patterns`, `clean-code`
- **Priority:** P1
- **Dependencies:** TASK 1
- **INPUT:** Criar `EnvironmentsModule` no NestJS.
- **OUTPUT:** Endpoints REST (GET, POST, PATCH, DELETE) expostos na API para a tabela Environment, protegidos por JWT e vinculados ao Clinic atual.
- **VERIFY:** Requisições via Postman/Swagger retornam 200/201 adequados para os endpoints criados.

### TASK 3: Backend - Atualizar QuotesModule
- **Agent:** `backend-specialist`
- **Skills:** `api-patterns`
- **Priority:** P1
- **Dependencies:** TASK 1
- **INPUT:** Adicionar validação para `environmentId` nos DTOs de Quote (quote.dto.ts). Modificar o `quote-pdf.service.ts` para agrupar os itens por ambiente ao desenhar o PDF/View. Update nos controllers para aceitar e retornar `Environment`.
- **OUTPUT:** Quotes salvos retornam a relação Environment do item.
- **VERIFY:** Ao salvar um QuoteItem com `environmentId` válido, o endpoint de GET /quotes/:id retorna o ambiente populado em `items.[].environment.name`.

### TASK 4: Frontend - Gestão de Ambientes
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`, `react-best-practices`
- **Priority:** P2
- **Dependencies:** TASK 2
- **INPUT:** Criar a página de configurações em `/dashboard/configuracoes/ambientes` contendo datatable padrão da aplicação, modal de inserção e edição usando `react-hook-form` e `zod`.
- **OUTPUT:** CRUD 100% funcional pelo Browser.
- **VERIFY:** O usuário consegue ver a lista vazia, adicionar um novo ambiente ("Sala"), ver a lista ser atualizada instantaneamente. A cor roxa não é utilizada (Purple Ban).

### TASK 5: Frontend - Integração na UI do Orçamento (Quote Form)
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`
- **Priority:** P2
- **Dependencies:** TASK 3, TASK 4
- **INPUT:** Na tabela de edição de Itens do Orçamento (`QuoteArea`/`QuoteItemsTable`), consultar a API de `/environments` e adicionar um Select ou Combobox em cada linha de produto. Preencher `environmentId` no form payload.
- **OUTPUT:** `environmentId` sendo trafegado ao criar/atualizar orçamentos.
- **VERIFY:** Vendedor insere item "Porcelanato X" -> Seleciona "Sala" no DDL -> Salva -> Requisição no Network Tab mostra payload com o ID correto e não falha.

### TASK 6: Frontend - Exibição no Documento
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`
- **Priority:** P2
- **Dependencies:** TASK 5
- **INPUT:** Atualizar o `quote-template-viewer.tsx` para não listar uma tabela simples. Iterar sobre todos os ambientes envolvidos no orçamento, renderizar "Header: Nome do Ambiente" -> Tabela das linhas dos produtos daquele ambiente. Iterar também por itens "Sem Ambiente".
- **OUTPUT:** Resumo visual agrupado do orçamento.
- **VERIFY:** Orçamento gerado mostra separadamente os Revestimentos da "Sala" e Revestimentos da "Área Externa", somando ou indicando claramente para o cliente.

## ✅ Phase X: Verification Checklist

> 🔴 **DO NOT mark project complete until ALL scripts pass.**

### 1. Verification Scripts
- [ ] `npm run lint && npx tsc --noEmit`
- [ ] `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
- [ ] `python .agent/skills/frontend-design/scripts/ux_audit.py .`
- [ ] `python .agent/skills/performance-profiling/scripts/lighthouse_audit.py http://localhost:3000`

### 2. Manual Checklist
- [ ] No purple/violet hex codes used in UI.
- [ ] Templates / UI follow system standard component library (shadcn/ui + Tailwind).
- [ ] Print preview respects grouping logic aesthetically.
- [ ] Code avoids ad-hoc dependencies.

### 3. Application State
- Lint: [ ] Pass
- Security: [ ] No critical issues
- Build: [ ] Success
- Date: [TBD]
