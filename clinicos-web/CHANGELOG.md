# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.16](///compare/v0.1.15...v0.1.16) (2026-06-24)


### Features

* **stock-import:** implementação completa do pipeline de importação via IA (OpenAI) c6432f2

### [0.1.15](///compare/v0.1.14...v0.1.15) (2026-06-18)


### Features

* **stock:** unified product import pipeline with standard 16-column template cdd258f

### [0.1.14](///compare/v0.1.13...v0.1.14) (2026-06-17)


### Bug Fixes

* padronização financeira do custo de produtos (m² vs Caixa) e correções de UI ec9bd69

### [0.1.13](///compare/v0.1.12...v0.1.13) (2026-06-13)


### Bug Fixes

* estabiliza configuracoes globais, layouts de impressao e widgets 250496f

### [0.1.12](///compare/v0.1.11...v0.1.12) (2026-06-13)


### Bug Fixes

* correções no orçamento, layout de impressão, sessão JWT e arquitetos d40ad26

### [0.1.11](///compare/v0.1.10...v0.1.11) (2026-05-23)


### Features

* Mudança na tabela Lexxa, valor do produto row 18 b2d6d38

### [0.1.10](///compare/v0.1.9...v0.1.10) (2026-05-23)


### Features

* **import:** adiciona script de seed para clientes e corrige importação Lexxa dec8f86

### [0.1.9](///compare/v0.1.8...v0.1.9) (2026-05-15)

### [0.1.8](///compare/v0.1.7...v0.1.8) (2026-05-07)


### Features

* **Security:** Adicionado segurança para importação de planilhas e montante financeiro para produtos em estoque adicionados na aba financeiro. 4fb2a89

### [0.1.7](///compare/v0.1.6...v0.1.7) (2026-04-27)


### Features

* implementar cadastro rápido de cliente e metadados de produtos no estoque b4a3bb5

### [0.1.6](///compare/v0.1.5...v0.1.6) (2026-04-23)


### Features

* **stock:** implementar paginação server-side e busca expandida c271e24

### [0.1.5](///compare/v0.1.4...v0.1.5) (2026-04-17)


### Features

* **stock:** implementar importador Dexco e otimizar transações de lote 0bd4ad7

### [0.1.4](///compare/v0.1.3...v0.1.4) (2026-03-23)


### Features

* **sales:** implement internal commission calculation and order display 2bdc98e

### [0.1.3](///compare/v0.1.2...v0.1.3) (2026-03-20)


### Features

* **orders:** implement split payments and installment details c753db9

### [0.1.2](///compare/v0.1.1...v0.1.2) (2026-03-20)


### Features

* **dashboard:** implementa atalhos de módulos configuráveis e adiciona ícone de Ambientes fb91046

### 0.1.1 (2026-03-19)


### Features

* adiciona campo birthDate e padroniza máscaras de input 00b432f
* **admin:** implement super admin, module security and global user management c9c3a52
* **deploy:** production infrastructure, sentry fixes and UI improvements 4a59d92
* **erp:** melhorias de usabilidade, auditoria transparente e correções fiscais 5015b55
* **estoque/compras:** redesign detalhes produto e importação inteligente 31bc6e4
* **expenses:** Implement Accounts Payable module 1df5d85
* **finance:** add financial revenue reports and sales excel export efc6344
* **finance:** add simplified service invoices (NFS-e) module bb04587
* **finance:** implement Boletos module and integrate with Orders 2842ece
* **finance:** implement real financial reports and finish ERP core sales flow 08aa46a
* **fiscal:** implement basic NF-e emission, settings, and webhook integration ff09955
* **fulfillment:** automation for stock entry, allocation and order finalization f12f489
* implement retail flow, back-to-order, and enhanced order details af1da29
* Implement Super Admin Audit/Stats & End-to-End Flow Automation 5409588
* integração BrasilAPI e sistema de versionamento automático e adicao de ambientes no orcamento. c395ac8
* melhorias na gestão de entregas, estoque e refatoração do backend 92dcf64
* **monitoring:** integrate sentry for full-stack error tracking and tracing" -m "- backend: installed @sentry/node and @sentry/profiling-node. 4a075ee
* **occurrences:** integrate RMA with Purchase/Sales Orders and refine stock deduction 1d58aaa
* **orders:** implement order integration and partial delivery status 2b2d250
* Permissoões de pedido de compra faltantes 76006ac
* **pricing:** enhance pricing logic and add hierarchy helpers 56ab465
* Product import system, unified stock movements & sidebar reorganization 2a1063e
* **promotions:** implement product promotional campaigns module 0e3ebfe
* **purchases:** Implementação completa do módulo de Compras e Back-to-Order e36a578
* **quotes:** add customizations to template columns and logo uploads 371ed5b
* **quotes:** implement customizable quote template system a5fa50b
* **quotes:** implement live preview and fix template context issues 72a185b
* **retail:** implement lot selection in sales and logistics picking list e984a12
* **sales & admin:** add printable receipt, payment methods, and global store settings 050579e
* **sales:** Implement End-to-End Sales, PDF & Delivery Modules 6cec73d
* Stock Entry XML, Purchase Order Receiving, and Granular Permissions 0c94c77
* **stock+quotes:** enhance reservation logic, stock visibility and quote details 27c75ce
* **stock:** refactor stock movements, unify UI and clean terminology for retail 5827c22


### Bug Fixes

* **access:** implement comprehensive ModuleGuard protection and optimize stock routes e8430c2
* **access:** implement comprehensive ModuleGuard protection and optimize stock routes a00e167
* **auth:** prevent page reload on login failure and add show password toggle d9ddf5a
* **backend:** change logo upload response to return a relative /api/uploads/ URL so the frontend can natively proxy it without hardcoded API_URL variables 4fcff45
* **docker:** add coolify external network to compose for database resolution d87d323
* **docker:** add persistent volume for backend uploads to prevent data loss on redeploys c28affa
* **docker:** change frontend and backend healthcheck from CMD to CMD-SHELL syntax so wget doesnt fail to parse operators 9d1ad7e
* **docker:** clean up compose file for native coolify v4 port mapping e966178
* **docker:** correct frontend healthcheck port to match nextjs start script 46553f1
* **docker:** final coolify v4 config removing labels and fixing ports 5508886
* **docker:** inject coolify native labels and FQDN routers for traefik d701a9d
* **docker:** inject COOLIFY_CONTAINER_NAME into traefik router labels 78c9353
* **docker:** inject manual traefik port labels to bypass coolify ui bug 501a753
* **docker:** inject traefik labels for proper container routing in coolify e6fbc80
* **docker:** install wget in backend debian slim and map frontend healthcheck to root url f039bb3
* **docker:** remove fqdn host routers from traefik labels 26a1f9f
* **docker:** restore frontend build step in prod compose to prevent crash loop 25b8226
* **docker:** restore original working traefik port rules ad17857
* **docker:** update frontend traefik port mapping to 3001 7024ca0
* **frontend:** move quote templates to clinic dashboard context f835edb
