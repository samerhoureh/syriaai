// SYRIA AI — database seeding script (bun run prisma/seed.ts)
import { seedDatabase } from "../src/lib/seed"

seedDatabase()
  .then(() => {
    console.log("SYRIA AI: database seeded.")
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
