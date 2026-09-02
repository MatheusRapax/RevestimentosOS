import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.supplierMappingCache.deleteMany({});
  console.log('Cache limpo:', result.count, 'registros deletados.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
