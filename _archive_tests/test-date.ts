import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const promotions = await prisma.promotion.findMany({
    include: { products: true }
  });
  console.log("Promotions:", promotions);
  const now = new Date();
  console.log("Now (JS):", now.toISOString());
  console.log("Now Local:", now.toString());
  
  promotions.forEach(p => {
    console.log(`Promo ${p.name}: startDate <= now?`, p.startDate <= now, `endDate >= now?`, p.endDate >= now);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
