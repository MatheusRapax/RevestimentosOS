import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const promos = await prisma.promotion.findMany();
  for (const p of promos) {
    const newStart = new Date(p.startDate);
    newStart.setUTCHours(0, 0, 0, 0);
    const newEnd = new Date(p.endDate);
    newEnd.setUTCHours(23, 59, 59, 999);
    
    await prisma.promotion.update({
      where: { id: p.id },
      data: { startDate: newStart, endDate: newEnd }
    });
    console.log(`Updated promotion ${p.name} to end at ${newEnd.toISOString()}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
