# Super Admin Panel (Tenant Management)

> **Goal**: Create a "Super Admin" area to manage tenants (Clinics/Stores), users, permissions, and feature modules globally.

## 1. Project Context
- **Type**: Fullstack (NestJS Backend + Next.js Frontend)
- **Architecture**: Multi-tenant (SaaS)
- **Current State**: Tenants exist (`Clinic` table) but are managing manually or via seed. No logic for "System Admin" exists.

## 2. Technical Architecture Choices

### 2.1 "Super Admin" Role Strategy
- **Approach**: Add a `isSuperAdmin` flag to the `User` table (global scope).
- **Security**: Create a `SuperAdminGuard` that bypasses tenant checks or enforces global access.

### 2.2 Dashboard Location
- **Route**: `/admin` (Separate from `/dashboard` which is tenant-scoped).
- **Layout**: Simplified layout, focusing on list views (`Tenants`, `Users`, `SystemSettings`).

### 2.3 Feature Modules (Toggles)
- **Schema**: Add `modules` (String array) to `Clinic` table.
- **Values**: `SALES`, `STOCK`, `FINANCE`, `ARCHITECTS`, `DELIVERIES`.

---

## 3. Task Breakdown

### Phase 1: Foundation (Schema & Role)

- [x] **Task 1: Update Prisma Schema** <!-- id: 1 -->
    - **Action**: Add `isSuperAdmin` Boolean to `User`. Add `modules` String[] and `logoUrl` String to `Clinic`.
    - **Verify**: `npx prisma migrate dev` creates migration successfully.

- [x] **Task 2: Seed Super Admin** <!-- id: 2 -->
    - **Action**: Update `prisma/seed.ts` to create/update a specific user as super admin.
    - **Verify**: `npm run seed` runs and checking DB shows `isSuperAdmin: true`.

- [x] **Task 3: Backend Super Admin Guard** <!-- id: 3 -->
    - **Action**: Create `src/core/auth/guards/super-admin.guard.ts`.
    - **Verify**: Unit test: Deny access if `isSuperAdmin` is false.

- [x] **Task 4: Super Admin Module (Backend)** <!-- id: 4 -->
    - **Action**: Create `src/modules/admin/` with `AdminController`.
    - **Endpoints**: `GET /admin/tenants`, `POST /admin/tenants`, `PATCH /admin/tenants/:id`.
    - **Verify**: Curl/Postman request with Super Admin token returns list of clinics.

### Phase 2: Frontend Implementation

- [x] **Task 5: Admin Layout & Routing** <!-- id: 5 -->
    - **Action**: Create `app/admin/layout.tsx` and `app/admin/page.tsx` (Dashboard).
    - **Verify**: Access `/admin` redirects if not super admin, shows layout if yes.

- [x] **Task 6: Tenant Management UI (List & Create)** <!-- id: 6 -->
    - **Action**: Create table showing Clinics (Name, Slug, Active Status). Add "New Clinic" modal.
    - **Verify**: Can create a new clinic via UI and it appears in the list.

- [x] **Task 7: Tenant Details & Modules UI** <!-- id: 7 -->
    - **Action**: Edit page for Clinic. Checkboxes for "Modules" (`SALES`, `FINANCE`, etc.). Upload/Input for Logo URL.
    - **Verify**: Toggling a module in UI updates the database column.

- [x] **Task 8: Global User Management (Optional)** <!-- id: 8 -->
    - **Action**: List all users across the system. Allow password reset or deactivation.
    - **Verify**: Can search a user by email and edit them.

---

## 4. Phase X: Verification Checklist

### Automated
- [ ] Schema migration applied (`npx prisma migrate status` is clean)
- [ ] Backend builds (`npm run build` in root)
- [ ] Frontend builds (`npm run build` in clinicos-web)

### Manual
- [ ] **Security**: Verify a normal tenant admin CANNOT access `/admin`.
- [ ] **Flow**: Create a new store "Loja Teste", enable only "FINANCE" module.
- [ ] **Check**: Log in as user of "Loja Teste" -> Menu should only show Finance (logic to be connected later, but config survives).
- [ ] **Logo**: Verify logo URL is saved.

---

## 5. Risks & Notes
- **Risk**: Tenant isolation leak. **Mitigation**: Strictly use `SuperAdminGuard` and ensure `/admin` routes don't mix with `/dashboard` tenant context.
- **Note**: The "Modules" logic in the sidebar (`AppSidebar`) will need to be updated to respect the `clinic.modules` array in a future task (or included in Task 7 verification).
