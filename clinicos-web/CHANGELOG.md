# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
