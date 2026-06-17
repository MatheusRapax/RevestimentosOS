import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log('Total products:', products.length);
  console.log('First 5 products (newest):');
  console.log(products.slice(0, 5).map(p => ({ sku: p.sku, name: p.name, m2: p.boxCoverage })));
  console.log('Last 5 products (oldest):');
  console.log(products.slice(-5).map(p => ({ sku: p.sku, name: p.name, m2: p.boxCoverage })));
}
main().finally(() => prisma.$disconnect());
