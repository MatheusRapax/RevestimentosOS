import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.product.findFirst({ where: { sku: '73729' } });
  console.log(p);
}
main().finally(() => prisma.$disconnect());
