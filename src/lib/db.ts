import { createRequire } from "module"
import { join } from "path"
import { pathToFileURL } from "url"
import { PrismaClient, Prisma } from '@prisma/client'

/* ---------------------------------------------------------------------------
 * Prisma singleton.
 *
 * Extra robustness for long-running dev servers: if `prisma db push` /
 * `prisma generate` regenerates the client while this process is running, the
 * bundler-resolved `@prisma/client` module may be stale (missing newly added
 * columns like the REAL/DEMO `source` classification). In that case we bust
 * the Node require cache for the generated client and rebuild the instance so
 * schema changes are picked up without restarting the dev server.
 * ------------------------------------------------------------------------ */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaCacheBusted: boolean
}

/** Does the bundler-resolved client know about the `source` column? */
function dmmfKnowsSource(): boolean {
  try {
    return !!(Prisma as any)?.dmmf?.modelMap?.AiModel?.fields?.some?.(
      (f: { name: string }) => f.name === "source"
    )
  } catch {
    return true // assume fresh if we cannot probe
  }
}

/** Remove the generated client + wrapper from the Node require cache. */
function bustPrismaRequireCache(): void {
  const req = createRequire(pathToFileURL(join(process.cwd(), "package.json")).href)
  const cache = req.cache as Record<string, unknown>
  for (const key of Object.keys(cache)) {
    if (key.includes("@prisma/client") || key.includes(".prisma/client")) {
      delete cache[key]
    }
  }
}

function buildClient(): PrismaClient {
  if (!dmmfKnowsSource()) {
    try {
      bustPrismaRequireCache()
      const req = createRequire(pathToFileURL(join(process.cwd(), "package.json")).href)
      const mod = req("@prisma/client") as { PrismaClient: new (o?: object) => PrismaClient }
      return new mod.PrismaClient({ log: ['error'] })
    } catch (e) {
      console.error("db: prisma cache-bust failed; falling back to static client", e)
    }
  }
  return new PrismaClient({ log: ['error'] })
}

const existing = globalForPrisma.prisma
const stale = !!existing && !globalForPrisma.__prismaCacheBusted && !dmmfKnowsSource()

export const db = existing && !stale ? existing : buildClient()

if (stale) {
  try { void existing?.$disconnect() } catch { /* ignore */ }
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  globalForPrisma.__prismaCacheBusted = true
}
