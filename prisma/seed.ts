import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const plans = [
  {
    name: "Free",
    monthlyPrice: 0,
    maxEvents: 2,
    maxTeams: 20,
    maxAdmins: 1,
    features: {},
    stripePriceId: null,
  },
  {
    name: "Starter",
    monthlyPrice: 29,
    maxEvents: 10,
    maxTeams: 100,
    maxAdmins: 3,
    features: { customFields: true, activityLog: true },
    stripePriceId: null,
  },
  {
    name: "Pro",
    monthlyPrice: 99,
    maxEvents: -1,
    maxTeams: -1,
    maxAdmins: -1,
    features: { customFields: true, activityLog: true, prioritySupport: true },
    stripePriceId: null,
  },
];

async function main() {
  console.log("Seeding plans...");

  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } });
    if (!existing) {
      await prisma.plan.create({ data: plan });
      console.log(`Created plan: ${plan.name}`);
    } else {
      console.log(`Plan already exists, skipping: ${plan.name}`);
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
