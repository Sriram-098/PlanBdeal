import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PlanBDeal demo data...');

  const passwordHash = await argon2.hash('Password123!', { type: argon2.argon2id });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@planbdeal.dev' },
    update: {},
    create: { fullName: 'Asha Rao', email: 'seller@planbdeal.dev', passwordHash },
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@planbdeal.dev' },
    update: {},
    create: { fullName: 'Vikram Shah', email: 'buyer@planbdeal.dev', passwordHash },
  });

  const secondSeller = await prisma.user.upsert({
    where: { email: 'seller2@planbdeal.dev' },
    update: {},
    create: { fullName: 'Meera Nair', email: 'seller2@planbdeal.dev', passwordHash },
  });

  const inDays = (days: number, hour = 19) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const listingsData = [
    {
      sellerId: seller.id,
      movieTitle: 'Starlight Horizon',
      posterUrl: 'https://image.tmdb.org/t/p/w500/placeholder1.jpg',
      language: 'English',
      theatreName: 'PVR Icon',
      city: 'Mumbai',
      theatreLocation: 'Andheri West',
      showDateTime: inDays(3, 19),
      showtimeLabel: '7:00 PM',
      totalQuantity: 2,
      availableQuantity: 2,
      originalPricePerTicket: 300,
      askingPricePerTicket: 280,
      provider: 'BookMyShow',
      transferEligibility: true,
      transferMethod: 'PROVIDER_APP_TRANSFER' as const,
      description: 'Two seats together, plans changed last minute.',
    },
    {
      sellerId: seller.id,
      movieTitle: 'Midnight Raga',
      language: 'Hindi',
      theatreName: 'INOX Megaplex',
      city: 'Delhi',
      theatreLocation: 'Nehru Place',
      showDateTime: inDays(5, 22),
      showtimeLabel: '10:00 PM',
      totalQuantity: 1,
      availableQuantity: 1,
      originalPricePerTicket: 450,
      askingPricePerTicket: 450,
      provider: 'INOX',
      transferEligibility: true,
      transferMethod: 'EDIT_NAME_ON_BOOKING' as const,
      description: 'Single ticket, last-minute conflict. (Low inventory demo listing.)',
    },
    {
      sellerId: secondSeller.id,
      movieTitle: 'The Quiet Storm',
      language: 'English',
      theatreName: 'Cinepolis Fun Republic',
      city: 'Bengaluru',
      theatreLocation: 'Whitefield',
      showDateTime: inDays(2, 16),
      showtimeLabel: '4:00 PM',
      totalQuantity: 3,
      availableQuantity: 3,
      originalPricePerTicket: 350,
      askingPricePerTicket: 300,
      provider: 'Cinepolis',
      transferEligibility: true,
      transferMethod: 'PROVIDER_APP_TRANSFER' as const,
      description: 'Group of 3, one person dropped out.',
    },
    {
      sellerId: secondSeller.id,
      movieTitle: 'Zafar Returns',
      language: 'Hindi',
      theatreName: 'PVR Forum Mall',
      city: 'Bengaluru',
      showDateTime: inDays(7, 13),
      showtimeLabel: '1:00 PM',
      totalQuantity: 2,
      availableQuantity: 2,
      originalPricePerTicket: 250,
      askingPricePerTicket: 220,
      provider: 'BookMyShow',
      transferEligibility: true,
      transferMethod: 'PROVIDER_APP_TRANSFER' as const,
      description: 'Matinee show, good value.',
    },
    {
      sellerId: seller.id,
      movieTitle: 'Coastal Echoes',
      language: 'Malayalam',
      theatreName: 'EVM Cinemas',
      city: 'Chennai',
      showDateTime: inDays(4, 18),
      showtimeLabel: '6:00 PM',
      totalQuantity: 4,
      availableQuantity: 4,
      originalPricePerTicket: 200,
      askingPricePerTicket: 180,
      provider: 'Paytm Insider',
      transferEligibility: true,
      transferMethod: 'OTHER' as const,
      description: 'Family of four can no longer attend.',
    },
    {
      sellerId: secondSeller.id,
      movieTitle: 'Iron Monsoon',
      language: 'Telugu',
      theatreName: 'AMB Cinemas',
      city: 'Hyderabad',
      showDateTime: inDays(6, 21),
      showtimeLabel: '9:00 PM',
      totalQuantity: 2,
      availableQuantity: 2,
      originalPricePerTicket: 320,
      askingPricePerTicket: 320,
      provider: 'BookMyShow',
      transferEligibility: true,
      transferMethod: 'PROVIDER_APP_TRANSFER' as const,
      description: 'Recliner seats, premium screen.',
    },
    {
      sellerId: seller.id,
      movieTitle: 'Paper Boats',
      language: 'Bengali',
      theatreName: 'INOX South City',
      city: 'Kolkata',
      showDateTime: inDays(10, 17),
      showtimeLabel: '5:00 PM',
      totalQuantity: 2,
      availableQuantity: 2,
      originalPricePerTicket: 220,
      askingPricePerTicket: 200,
      provider: 'INOX',
      transferEligibility: true,
      transferMethod: 'EDIT_NAME_ON_BOOKING' as const,
      description: 'Weekend show, flexible on timing discussion.',
    },
    {
      sellerId: secondSeller.id,
      movieTitle: 'Yesterday Once More',
      language: 'English',
      theatreName: 'Rajhans Cinemas',
      city: 'Ahmedabad',
      showDateTime: inDays(-1, 20),
      showtimeLabel: '8:00 PM',
      totalQuantity: 2,
      availableQuantity: 2,
      originalPricePerTicket: 260,
      askingPricePerTicket: 240,
      provider: 'BookMyShow',
      transferEligibility: true,
      transferMethod: 'PROVIDER_APP_TRANSFER' as const,
      description: 'Already past showtime - demonstrates the EXPIRED state.',
      status: 'EXPIRED' as const,
    },
  ];

  const createdListings = [];
  for (const data of listingsData) {
    const { status, ...rest } = data as typeof data & { status?: 'EXPIRED' };
    const listing = await prisma.listing.create({
      data: { ...rest, status: status ?? 'ACTIVE' },
    });
    createdListings.push(listing);
  }

  // A pending request from the buyer persona on the low-inventory listing (good for the
  // concurrency demo: try accepting it from two tabs at once against a qty=1 listing).
  const lowInventoryListing = createdListings[1];
  await prisma.connectRequest.create({
    data: {
      listingId: lowInventoryListing.id,
      buyerId: buyer.id,
      quantity: 1,
      message: 'Hi! Is this ticket still available?',
    },
  });

  const groupListing = createdListings[2];
  await prisma.connectRequest.create({
    data: {
      listingId: groupListing.id,
      buyerId: buyer.id,
      quantity: 2,
      message: 'Would love to take 2 of these if possible.',
    },
  });

  await prisma.notification.create({
    data: {
      userId: seller.id,
      type: 'NEW_REQUEST',
      title: 'New ticket request',
      message: `Vikram Shah requested 1 ticket for ${lowInventoryListing.movieTitle}`,
      relatedListingId: lowInventoryListing.id,
    },
  });

  console.log('Seed complete:');
  console.log('  Seller login:  seller@planbdeal.dev / Password123!');
  console.log('  Seller2 login: seller2@planbdeal.dev / Password123!');
  console.log('  Buyer login:   buyer@planbdeal.dev / Password123!');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
