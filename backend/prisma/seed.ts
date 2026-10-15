import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const initialCoins = [
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', currentPrice: 0.0, priceChange24h: 0.0 },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', currentPrice: 0.0, priceChange24h: 0.0 },
    { id: 'solana', symbol: 'sol', name: 'Solana', currentPrice: 0.0, priceChange24h: 0.0 },
  ];

  for (const coin of initialCoins) {
    const upsertedCoin = await prisma.coin.upsert({
      where: { id: coin.id },
      update: {
        name: coin.name,
        symbol: coin.symbol,
      },
      create: {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        currentPrice: coin.currentPrice,
        priceChange24h: coin.priceChange24h,
      },
    });
    console.log(`🪙 Upserted coin: ${upsertedCoin.name} (${upsertedCoin.symbol.toUpperCase()})`);
  }

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
