require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const perms = await prisma.permission.findMany({
    select: { key: true, description: true }
  });
  console.log("Total permissions in DB:", perms.length);
  
  const quotePerms = perms.filter((p: any) => p.key.includes('quote'));
  console.log("Quote permissions in DB:", quotePerms.map((p: any) => p.key));
  
  // Find permissions that are in src/core/rbac/permissions.ts but not in DB
  const { PERMISSIONS } = require('./src/core/rbac/permissions');
  const codePerms = Object.values(PERMISSIONS);
  console.log("Total permissions in code:", codePerms.length);
  
  const missingInDb = codePerms.filter((cp: any) => !perms.find((p: any) => p.key === cp));
  console.log("Permissions in code but missing in DB:", missingInDb);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
