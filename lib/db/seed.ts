import { eq } from 'drizzle-orm';
import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers, platforms, listings, listingPrices, listingPlatforms, campaigns } from './schema';
import { hashPassword } from '@/lib/auth/session';
import { PLATFORM_PRESETS } from '@/lib/pricing';

async function createStripeProductsIfConfigured() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_placeholder')) {
    console.log('Skipping Stripe products (no real STRIPE_SECRET_KEY yet).');
    return;
  }

  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seedPlatformsAndDemoData() {
  // Default platforms from SPEC §4 "Reference: real platform rules" presets.
  const inserted = await db
    .insert(platforms)
    .values(
      PLATFORM_PRESETS.map((p, i) => ({
        name: p.name,
        color: p.color,
        sortOrder: i,
        commissionRate: p.commissionRate,
        discountRule: p.discountRule,
      })),
    )
    .onConflictDoNothing()
    .returning();

  const platformRows =
    inserted.length > 0
      ? inserted
      : await db.select().from(platforms).orderBy(platforms.sortOrder);

  console.log(`Platforms ready: ${platformRows.map((p) => p.name).join(', ')}`);

  // Demo listing + prices on every platform + one active Airbnb campaign
  // (shows the priority-winner rule on the dashboard).
  const existing = await db.select().from(listings).limit(1);
  if (existing.length > 0) {
    console.log('Demo listing already exists — skipping.');
    return;
  }

  const [demo] = await db
    .insert(listings)
    .values({
      name: 'Villa Biển Mũi Né',
      location: 'Mũi Né, Bình Thuận',
      notes: 'Listing demo — 2 phòng ngủ, hồ bơi',
    })
    .returning();

  await db.insert(listingPrices).values(
    platformRows.map((p) => ({
      listingId: demo.id,
      platformId: p.id,
      pricePerNight: 500000,
      currency: 'VND',
      note: null,
    })),
  );

  await db.insert(listingPlatforms).values(
    platformRows.map((p) => ({ listingId: demo.id, platformId: p.id })),
  );

  const airbnb = platformRows.find((p) => p.name === 'Airbnb');
  if (airbnb) {
    await db.insert(campaigns).values({
      listingId: demo.id,
      platformId: airbnb.id,
      name: 'New listing promo',
      discountPercent: 10,
      active: true,
      priorityOrder: 1,
      type: 'new_listing',
      startsAt: new Date('2026-08-05'),
      endsAt: new Date('2026-08-09'),
    });
  }

  console.log('Demo listing + prices + Airbnb campaign seeded.');
}

async function seed() {
  const email = 'test@test.com';
  const password = 'admin123';

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    console.log('User already exists — skipping user/team creation.');
  } else {
    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        email: email,
        passwordHash: passwordHash,
        role: 'owner',
      })
      .returning();

    console.log('Initial user created.');

    const [team] = await db
      .insert(teams)
      .values({
        name: 'Test Team',
      })
      .returning();

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: 'owner',
    });
  }

  await seedPlatformsAndDemoData();
  await createStripeProductsIfConfigured();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
