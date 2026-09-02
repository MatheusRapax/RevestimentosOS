import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.supplierMappingCache.deleteMany({});
  console.log('Cache cleared');
}
main();
