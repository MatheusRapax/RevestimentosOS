# ClinicOS

Sistema ERP completo para clínicas com backend NestJS e frontend Next.js.

## 📦 Estrutura do Projeto

- **Backend (NestJS)** - API REST em `/` (porta 3000)
- **Frontend (Next.js)** - Aplicação web em `/clinicos-web` (porta 3001)

## 🚀 Stack Tecnológica

- **Node.js** (>= 18.0.0)
- **NestJS** - Framework backend modular e escalável
- **TypeScript** - Tipagem estática e segurança de tipos
- **Prisma ORM** - Gerenciamento de banco de dados type-safe
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação stateless
- **Bcrypt** - Hash seguro de senhas
- **Passport** - Estratégias de autenticação

## ✨ Funcionalidades Implementadas

- ✅ **Autenticação JWT** - Registro, login e rotas protegidas
- ✅ **Multi-Tenant** - Suporte a múltiplas clínicas por usuário
- ✅ **RBAC** - Controle de acesso baseado em roles e permissões
- ✅ **Tenant Context** - Resolução automática de contexto de clínica
- ✅ **Validação de DTOs** - Validação automática de entrada
- ✅ **Database Seeds** - Roles e permissões pré-configuradas
- ✅ **Módulo de Pacientes v2** - Cadastro de pacientes (recepção)
- ✅ **Módulo de Agenda v5** - Calendário mensal + vista diária + validações
  - Horário de funcionamento configurável por dia da semana
  - Bloqueios manuais (feriados, férias, manutenção)
  - Validação de conflitos e bloqueios no backend
  - Visualização de dias fechados no calendário
- ✅ **Módulo de Atendimentos v5** - Timeline + SOAP + Anexos + Relatório PDF
- ✅ **Histórico de Atendimentos** - Busca por paciente com filtros
- ✅ **Notas Clínicas SOAP** - Subjetivo, Objetivo, Avaliação, Plano
- ✅ **Anexos Clínicos** - Upload PDF/imagens por atendimento
- ✅ **Relatório Clínico PDF** - Geração automática com SOAP, procedimentos, anexos
- ✅ **Procedimentos e Consumíveis** - Rastreamento por atendimento
- ✅ **Sistema de Auditoria** - Rastreamento automático de ações para compliance
- ✅ **Módulo de Estoque** - Gestão de produtos, lotes e validade com FIFO
- ✅ **Integração Agenda↔Atendimentos** - Status sincronizado automaticamente


## 🎨 Frontend Stack

- **Next.js 14** - App Router com Server Components
- **TypeScript** - Tipagem estática
- **TailwindCSS** - Estilização utilitária
- **shadcn/ui** - Componentes reutilizáveis
- **TanStack Query** - Cache e sincronização de dados
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas
- **Axios** - Cliente HTTP

## 📁 Estrutura do Projeto

```
src/
├── main.ts                      # Entry point da aplicação
├── app.module.ts                # Módulo raiz
├── config/                      # Configurações
│   ├── env.ts                  # Variáveis de ambiente validadas
│   └── database.ts             # Configuração do banco
├── core/                        # Infraestrutura core
│   ├── auth/                   # Autenticação JWT
│   │   ├── dto/               # DTOs de auth
│   │   ├── guards/            # JwtAuthGuard
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── jwt.strategy.ts
│   ├── rbac/                    # RBAC (roles e permissões)
│   │   ├── decorators/        # @Permissions
│   │   ├── guards/            # PermissionsGuard
│   │   ├── permissions.ts     # Registro de permissões
│   │   └── rbac.module.ts
│   ├── tenant/                  # Multi-tenancy
│   │   ├── guards/            # TenantGuard
│   │   ├── tenant.service.ts
│   │   └── tenant.module.ts
│   ├── audit/                   # Sistema de auditoria
│   │   ├── audit.service.ts
│   │   ├── audit.interceptor.ts
│   │   ├── audit.controller.ts
│   │   └── dto/
│   └── prisma/                  # Prisma ORM
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── modules/                     # Módulos de negócio
│   ├── clinics/                 # Gerenciamento de clínicas
│   │   ├── dto/
│   │   ├── clinics.controller.ts
│   │   ├── clinics.service.ts
│   │   └── clinics.module.ts
│   ├── patients/                # Cadastro de pacientes
│   │   ├── dto/
│   │   ├── patients.controller.ts
│   │   ├── patients.service.ts
│   │   └── patients.module.ts
│   ├── scheduling/              # Agenda e agendamentos
│   │   ├── dto/
│   │   ├── scheduling.controller.ts
│   │   ├── scheduling.service.ts
│   │   └── scheduling.module.ts
│   ├── encounters/             # Atendimentos e prontuário
│   │   ├── dto/
│   │   ├── encounters.controller.ts
│   │   ├── encounters.service.ts
│   │   └── encounters.module.ts
│   ├── encounter-items/        # Procedimentos e consumíveis
│   │   ├── dto/
│   │   ├── encounter-items.controller.ts
│   │   ├── encounter-items.service.ts
│   │   └── encounter-items.module.ts
│   └── health/                 # Health check
│       ├── health.controller.ts
│       └── health.module.ts
└── shared/                      # Utilitários compartilhados

prisma/
├── schema.prisma               # Schema do banco de dados
├── seed.ts                     # Seeds de roles e permissões
└── migrations/                 # Histórico de migrations
```

## 🏗️ Arquitetura

### Multi-Tenant

O sistema suporta múltiplas clínicas com isolamento completo de dados:

- **TenantGuard**: Resolve `clinicId` do header X-Clinic-Id após autenticação
- **Tenant Context**: Injeta `req.clinicId` em todas as rotas protegidas
- **Validação de Acesso**: Verifica se usuário pertence à clínica
- **Isolamento de Dados**: Queries filtradas por `clinicId`

> **Nota Arquitetural**: TenantGuard executa APÓS JwtAuthGuard para garantir que `req.user` existe antes de validar acesso à clínica. Middleware não é usado pois executa antes da autenticação.

### RBAC (Role-Based Access Control)

Sistema de permissões granulares por clínica:

- **5 Roles Padrão**: ADMIN, RECEPTION, PROFESSIONAL, FINANCE, STOCK
- **36 Permissões**: Organizadas por módulo (patient, appointment, encounter, etc.)
- **@Permissions Decorator**: Proteção declarativa de rotas
- **PermissionsGuard**: Validação automática de permissões

### Fluxo de Request

```
Request
  ↓
JwtAuthGuard (valida token, injeta req.user)
  ↓
TenantGuard (resolve clinicId do header, valida acesso, injeta req.clinicId)
  ↓
PermissionsGuard (valida permissões do role)
  ↓
Controller/Service
```

## ⚙️ Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/clinicos?schema=public"

# Application
PORT=3000
NODE_ENV=development

# JWT (IMPORTANTE: Altere em produção!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1h
```

### 3. Executar Migrations

```bash
npm run prisma:migrate
```

### 4. Gerar Prisma Client

```bash
npm run prisma:generate
```

### 5. Executar Seeds (Roles e Permissões)

```bash
npm run seed
```

## 🏃 Como Executar

### Modo Desenvolvimento

```bash
npm run start:dev
```

O servidor iniciará em `http://localhost:3000`

### Modo Produção

```bash
# Build
npm run build

# Start
npm run start:prod
```

## 🔌 Endpoints Disponíveis

### Autenticação

**POST /auth/register** - Registrar novo usuário
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"senha123","name":"Nome"}'
```

**POST /auth/login** - Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"senha123"}'
```

**GET /auth/me** - Perfil do usuário (protegida)
```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Clínicas

**POST /clinics** - Criar clínica (criador vira ADMIN)
```bash
curl -X POST http://localhost:3000/clinics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"name":"Minha Clínica"}'
```

**GET /clinics/my** - Listar clínicas do usuário
```bash
curl http://localhost:3000/clinics/my \
  -H "Authorization: Bearer SEU_TOKEN"
```

**GET /clinics/context** - Contexto de tenant atual
```bash
curl http://localhost:3000/clinics/context \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID"
```

### Pacientes

**POST /patients** - Criar paciente
```bash
curl -X POST http://localhost:3000/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID" \
  -d '{"name":"João Silva","email":"joao@example.com","phone":"(11) 98765-4321"}'
```

**GET /patients** - Listar pacientes
```bash
curl http://localhost:3000/patients \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID"
```

**GET /patients/:id** - Buscar paciente
**PATCH /patients/:id** - Atualizar paciente
**DELETE /patients/:id** - Soft delete

### Agendamentos

**POST /appointments** - Criar agendamento
```bash
curl -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID" \
  -d '{
    "patientId":"uuid",
    "professionalId":"uuid",
    "startAt":"2025-12-20T10:00:00Z",
    "endAt":"2025-12-20T11:00:00Z"
  }'
```

**GET /appointments** - Listar agendamentos por período
```bash
curl "http://localhost:3000/appointments?startDate=2025-12-20&endDate=2025-12-21" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID"
```

**POST /appointments/:id/checkin** - Fazer check-in
**DELETE /appointments/:id** - Cancelar agendamento

### Atendimentos

**POST /encounters/start** - Iniciar atendimento
```bash
curl -X POST http://localhost:3000/encounters/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID" \
  -d '{
    "patientId":"uuid",
    "professionalId":"uuid",
    "appointmentId":"uuid"
  }'
```

**GET /encounters/:id** - Buscar atendimento com prontuário
**POST /encounters/:id/records** - Adicionar registro ao prontuário
```bash
curl -X POST http://localhost:3000/encounters/ENCOUNTER_ID/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID" \
  -d '{
    "type":"ANAMNESIS",
    "content":{"complaint":"Dor de cabeça","duration":"3 dias"}
  }'
```

**POST /encounters/:id/close** - Fechar atendimento (bloqueia edição)

### Procedimentos e Consumíveis

**POST /encounters/:id/procedures** - Adicionar procedimento
```bash
curl -X POST http://localhost:3000/encounters/ENCOUNTER_ID/procedures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID" \
  -d '{
    "name":"Consulta de rotina",
    "priceCents":15000,
    "notes":"Consulta inicial"
  }'
```

**GET /encounters/:id/procedures** - Listar procedimentos
**DELETE /encounters/:id/procedures/:procedureId** - Remover procedimento

**POST /encounters/:id/consumables** - Adicionar consumível
```bash
curl -X POST http://localhost:3000/encounters/ENCOUNTER_ID/consumables \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID" \
  -d '{
    "itemName":"Luva descartável",
    "quantity":2,
    "unit":"par"
  }'
```

**GET /encounters/:id/consumables** - Listar consumíveis
**DELETE /encounters/:id/consumables/:consumableId** - Remover consumível

> **Nota:** Ao adicionar consumíveis, o sistema automaticamente deduz estoque se o produto existir no cadastro (match por nome). A dedução segue lógica FIFO por data de validade.

### Estoque

**POST /products** - Criar produto
**GET /products** - Listar produtos com estoque
**PATCH /products/:id** - Atualizar produto
**DELETE /products/:id** - Soft delete

**POST /stock/in** - Entrada de estoque (cria lote)
```bash
curl -X POST http://localhost:3000/stock/in \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Clinic-Id: $CLINIC_ID" \
  -d '{
    "productId":"uuid",
    "lotNumber":"LOTE-001",
    "quantity":100,
    "expirationDate":"2026-12-31"
  }'
```

**POST /stock/out** - Saída manual (FIFO)
**GET /stock/product/:id** - Consultar estoque
**GET /stock/alerts** - Alertas de estoque baixo e vencimento

### Auditoria

**GET /audit-logs** - Consultar logs de auditoria
```bash
# Todos os logs
curl "http://localhost:3000/audit-logs" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID"

# Filtrar por ação
curl "http://localhost:3000/audit-logs?action=CREATE" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID"

# Filtrar por entidade
curl "http://localhost:3000/audit-logs?entity=Patient" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID"

# Filtrar por período
curl "http://localhost:3000/audit-logs?dateFrom=2025-12-17&dateTo=2025-12-18" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Clinic-Id: CLINIC_ID"
```

### Health Check

**GET /health** - Status da API
```bash
curl http://localhost:3000/health
```

## 🔐 Usando RBAC

### Proteger uma Rota

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/core/auth/guards/jwt.guard';
import { PermissionsGuard } from '@/core/rbac/guards/permissions.guard';
import { Permissions } from '@/core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '@/core/rbac/permissions';

@Get('patients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PERMISSIONS.PATIENT_READ)
async listPatients(@Request() req) {
  // req.user - usuário autenticado
  // req.clinicId - clínica atual
  return this.patientsService.findAll(req.clinicId);
}
```

### Roles Disponíveis

| Role | Descrição | Permissões |
|------|-----------|------------|
| **CLINIC_ADMIN** | Administrador | Todas as permissões |
| **RECEPTION** | Recepção | Pacientes, agendamentos |
| **PROFESSIONAL** | Profissional | Atendimentos, prontuários |
| **FINANCE** | Financeiro | Gestão financeira |
| **STOCK** | Estoque | Gestão de estoque |

### Permissões por Módulo

- **Clinic**: settings.manage, read, update, delete
- **User**: read, create, update, delete, invite
- **Patient**: read, create, update, delete
- **Appointment**: read, create, update, delete, cancel, checkin
- **Encounter**: read, start, close
- **Record**: read, create, update
- **Procedure**: read, create, update
- **Consumable**: add, read
- **Finance**: read, create, update
- **Stock**: read, create, update

## 📜 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run start` | Inicia a aplicação |
| `npm run start:dev` | Inicia em modo desenvolvimento com watch |
| `npm run start:debug` | Inicia em modo debug |
| `npm run start:prod` | Inicia em modo produção |
| `npm run build` | Compila o projeto |
| `npm run lint` | Executa o linter |
| `npm run format` | Formata o código com Prettier |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Executa migrations |
| `npm run prisma:studio` | Abre o Prisma Studio |
| `npm run seed` | Executa seeds (roles e permissões) |

## 🗄️ Modelo de Dados

### Principais Entidades

- **User**: Usuários do sistema
- **Clinic**: Clínicas (tenants)
- **ClinicUser**: Associação User-Clinic com Role
- **Role**: Roles de acesso (ADMIN, RECEPTION, etc.)
- **Permission**: Permissões granulares
- **RolePermission**: Associação Role-Permission
- **Patient**: Pacientes da clínica
- **Appointment**: Agendamentos com detecção de conflitos
- **Encounter**: Atendimentos clínicos
- **RecordEntry**: Entradas de prontuário (imutável após fechamento)
- **ProcedurePerformed**: Procedimentos realizados no atendimento
- **ConsumableUsage**: Consumíveis utilizados no atendimento
- **AuditLog**: Logs de auditoria para compliance

### Relacionamentos

```
User ←→ ClinicUser ←→ Clinic
              ↓
            Role ←→ RolePermission ←→ Permission

Clinic → Patient → Appointment → Encounter → RecordEntry
                                           → ProcedurePerformed
                                           → ConsumableUsage
Clinic → Appointment
Clinic → Encounter
Clinic → RecordEntry
Clinic → ProcedurePerformed
Clinic → ConsumableUsage
Clinic → AuditLog
User (Professional) → Appointment
User (Professional) → Encounter
User → AuditLog
```

## 🛠️ Desenvolvimento

### Adicionar Novo Módulo

```bash
nest generate module modules/nome-do-modulo
nest generate controller modules/nome-do-modulo
nest generate service modules/nome-do-modulo
```

### Criar Nova Migration

```bash
# Após alterar schema.prisma
npm run prisma:migrate
```

### Boas Práticas

- ✅ Sempre use Dependency Injection
- ✅ Mantenha os controllers enxutos
- ✅ Use DTOs para validação
- ✅ Proteja rotas com guards apropriados
- ✅ Filtre queries por `clinicId` em contexto multi-tenant
- ✅ Use `@Permissions` para controle de acesso
- ✅ Documente endpoints complexos
- ✅ Escreva testes para regras de negócio

## 🔒 Segurança

- ✅ Senhas com hash bcrypt (10 rounds)
- ✅ JWT com expiração configurável
- ✅ Validação automática de DTOs
- ✅ Proteção contra SQL injection (Prisma)
- ✅ CORS habilitado
- ✅ Isolamento de dados por tenant
- ✅ Validação de acesso em múltiplas camadas

## 📝 Próximos Passos

- [ ] Módulos de negócio (Procedimentos, Estoque, Financeiro)
- [ ] Gerenciamento de usuários (convites, atribuição de roles)
- [ ] Refresh tokens
- [ ] Auditoria de ações
- [ ] Testes unitários e e2e
- [ ] Documentação Swagger/OpenAPI
- [ ] CI/CD
- [ ] Docker e Docker Compose

## 📄 Licença

UNLICENSED - Projeto privado

---

**Desenvolvido com ❤️ usando NestJS**

## 🎨 Frontend Development

### Iniciar Frontend

```bash
cd clinicos-web
npm install
npm run dev
```

Acesse: http://localhost:3001

### Estrutura do Frontend

- **src/app/** - Páginas Next.js (App Router)
- **src/components/** - Componentes React reutilizáveis
- **src/contexts/** - React Contexts (auth, etc)
- **src/hooks/** - Custom hooks
- **src/lib/** - Utilitários e API client

### Backend (NestJS)

- ✅ **Autenticação JWT** com refresh tokens
- ✅ **Multi-tenancy** (User ↔ Clinic)
- ✅ **RBAC** (Role-Based Access Control)
- ✅ **Auditoria** automática de ações
- ✅ **Módulos implementados**:
  - Auth (login, registro, refresh)
  - Clinics (CRUD de clínicas)
  - Users (gestão de usuários)
  - Patients (CRUD de pacientes)
  - Scheduling (CRUD de agendamentos)
  - **Encounters (CRUD completo + schema migration)**
    - Endpoints: GET, POST, PATCH, DELETE
    - Schema: date, time, notes fields
    - Soft delete via status=CLOSED
    - **Domain Flow v1**: Link com Appointments via `appointmentId`
  - **Stock (CRUD completo)**
    - Endpoints: GET, POST, PATCH, DELETE
    - Controller route fixed
    - Soft delete support
  - Health (health checks)
  - **Domain Flow v1 - Agenda → Encounters** ✅
    - Endpoint: POST /appointments/:id/start-encounter
    - Validação de status (SCHEDULED, CHECKED_IN)
    - Prevenção de encounters duplicados
    - Herança automática de paciente/profissional
    - Extração de data/hora do appointment
    - Frontend: Botão "Iniciar Atendimento" na Agenda
    - Redirect automático para lista de Atendimentos
    - **Status**: Testado e funcionando
  - **Clinic Users Endpoint** ✅
    - Endpoint: GET /clinics/users
    - Retorna usuários da clínica do usuário logado
    - Usado pelo hook useProfessionals
  - **Professionals Module** ✅ (Admin v1 - CRUD Complete)
    - **List**: GET /professionals
      - Multi-tenant architecture (TenantGuard required)
      - Role filtering (PROFESSIONAL only)
      - Returns only active professionals
      - DTO pattern for future extensibility
    - **Create**: POST /professionals (HTTP 201)
      - Attach existing user as PROFESSIONAL to clinic
      - Validates user exists and not already in clinic
      - Enforces PROFESSIONAL role
    - **Activate**: PATCH /professionals/:userId/activate
      - Reactivate deactivated professional
    - **Deactivate**: PATCH /professionals/:userId/deactivate
      - Soft deactivation (sets active=false)
    - **Remove**: DELETE /professionals/:userId
      - Soft delete (preserves history)
      - Self-removal protection (prevents admin lockout)
    - **Architecture**:
      - Explicit multi-tenancy (no implicit resolution)
      - Soft delete over physical delete
      - RBAC-ready (PermissionsGuard prepared)
      - Foundation for admin UI and specialty management
  
  - **RBAC (Role-Based Access Control)** ✅ (v1 - Static Permissions)
    - **Permission System**:
      - 37 permissions across 9 modules
      - Permission and RolePermission tables
      - Static role-permission mappings (seeded)
    - **Core Components**:
      - `PermissionsGuard` - Runtime permission enforcement
      - `@Permissions` decorator - Declare required permissions
      - `PERMISSIONS` constants - Type-safe permission keys
    - **Guard Execution Order**:
      1. JwtAuthGuard - Authentication
      2. TenantGuard - Clinic context
      3. PermissionsGuard - Permission check
    - **Role Permissions**:
      - ADMIN: Full access (all permissions)
      - CLINIC_ADMIN: Full clinic management
      - PROFESSIONAL: Read-only + clinical operations
      - RECEPTIONIST: Read-only + scheduling
    - **Features**:
      - Tenant-aware permission checks
      - Active user filtering
      - AND logic (all permissions required)
      - Clear 403 error messages
    - **Status**: Enabled on all protected modules

  - **Admin UI v1** ✅ (Professionals Management)
    - **Route**: `/dashboard/admin/professionals`
    - **Features**:
      - List professionals (active/inactive filter)
      - Activate/deactivate professionals
      - Confirmation modal on deactivate
      - Self-protection (can't modify own status)
      - Optimistic UI updates
    - **Components**:
      - ProfessionalsAdminPage
      - ProfessionalsTable
      - ProfessionalStatusBadge
      - ProfessionalActionsMenu
    - **RBAC**: Requires PROFESSIONAL_READ (view) and PROFESSIONAL_MANAGE (actions)
    - **Status**: Complete and tested

  - **Audit Log v1** ✅ (Audit Logging)
    - **Route**: `/dashboard/admin/auditoria`
    - **Features**:
      - View audit logs (read-only)
      - Logs created automatically on admin actions
      - Tenant-scoped (only shows clinic's logs)
      - Filter by action, entity, date range
    - **Backend**:
      - AuditService with log() and findAll() methods
      - Integration with ProfessionalsService (activate/deactivate)
      - Enum actions: CREATE, UPDATE, DELETE, VIEW, LOGIN, EXPORT
    - **Components**:
      - AuditLogAdminPage
      - AuditLogTable
      - AuditActionBadge
    - **RBAC**: Requires audit.read permission
    - **Status**: Complete and tested

### Funcionalidades

- ✅ Autenticação JWT integrada
- ✅ Seleção de clínica multi-tenant
- ✅ Proteção de rotas
- ✅ API client com interceptors
- ✅ Dashboard layout completo
- ✅ **Agenda v2** - Módulo completo de agendamentos:
  - Criar agendamentos
  - Editar agendamentos
  - Check-in de pacientes
  - Cancelar agendamentos
  - Status badges em português
  - Ações condicionais por status
  - Optimistic UI updates
  - Feedback de sucesso/erro
- ✅ **Pacientes v1** - CRUD completo de pacientes:
  - Criar pacientes
  - Editar pacientes
  - Excluir pacientes (soft delete)
  - Status badges (Ativo/Inativo)
  - Validação de formulários
  - Feedback de sucesso/erro
- ✅ **Atendimentos v1** - CRUD completo de atendimentos:
  - Criar atendimentos
  - Editar atendimentos
  - Excluir atendimentos (soft delete)
  - Status badges (Agendado/Concluído/Cancelado)
  - Relação com pacientes e profissionais
  - Feedback de sucesso/erro
- ✅- **Stock v1** (CRUD completo)
  - Lista de itens de estoque
  - Criar item de estoque
  - Editar item de estoque
  - Remover item (soft delete)
  - Status badges (Ativo/Inativo)
  - Quantidade e unidade

- **Integration v1** (Cross-Module Consistency)
  - Shared hooks: `usePatients`, `useProfessionals`
  - Select dropdowns em vez de UUID inputs
  - Agenda: seleção de paciente/profissional por nome
  - Encounters: seleção de paciente/profissional por nome
  - Validação e loading states
  - ⚠️ Limitação: endpoint de profissionais não implementado ainda
  - Feedback de sucesso/erro

### Integração com Backend

O frontend se comunica via:
- `Authorization: Bearer <token>`
- `X-Clinic-Id: <clinicId>`

