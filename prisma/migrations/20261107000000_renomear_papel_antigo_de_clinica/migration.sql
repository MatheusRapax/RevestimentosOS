-- O papel CLINIC_ADMIN é do modelo antigo (clínica) e não tem nenhuma permissão. Ele ainda é usado pelo
-- fluxo antigo de criar loja, então NÃO é apagado: só ganha um nome que não induz ao erro na tela de Papéis.
-- A condição no nome evita sobrescrever um nome que alguém já tenha editado.
UPDATE "Role"
SET "name" = 'Administrador da Loja (antigo)',
    "description" = 'Papel antigo, sem permissões. Para dar acesso total use o papel "Administrador".'
WHERE "key" = 'CLINIC_ADMIN' AND "name" = 'Administrador da Clínica';
