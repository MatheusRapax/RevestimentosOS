-- Nova permissão: ver as vendas de todos os vendedores.
-- Sem ela, a pessoa vê só os próprios orçamentos, pedidos e o que sai deles.
INSERT INTO "Permission" ("id", "key", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'sales.view.all', 'Ver as vendas de todos os vendedores', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "key" = 'sales.view.all');

-- Para ninguém perder o que já enxerga: todo papel que hoje vê orçamentos ou pedidos recebe a permissão,
-- EXCETO o Vendedor (SELLER), que passa a ver só as próprias vendas.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT DISTINCT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'sales.view.all'
WHERE r."key" <> 'SELLER'
  AND EXISTS (
    SELECT 1
    FROM "RolePermission" rp
    JOIN "Permission" q ON q."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND q."key" IN ('quote.read', 'order.read')
  )
ON CONFLICT DO NOTHING;
