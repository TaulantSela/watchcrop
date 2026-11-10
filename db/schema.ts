import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  jsonb,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * A crop rectangle within the master image, plus a blur amount.
 * Index 0 = extreme macro (expert-only), index 5 = whole watch.
 */
export type CropSpec = { x: number; y: number; w: number; h: number; blur: number };

/** One watch in the catalog. We own the photo for every Tier-1 entry. */
export const watches = pgTable(
  "watches",
  {
    id: serial("id").primaryKey(),
    brand: text("brand").notNull(),
    model: text("model").notNull(), // model FAMILY, e.g. "Submariner"
    reference: text("reference"), // e.g. "126610LN"
    year: integer("year"),
    movement: text("movement"),
    priceTier: text("price_tier").notNull().default("mid"), // entry | mid | luxury | grail
    // 1..5; higher = more obscure. Drives the Horology Score.
    difficultyWeight: integer("difficulty_weight").notNull().default(2),
    specBullets: jsonb("spec_bullets").$type<string[]>().default([]),

    // --- Monetization ---
    affiliateRef: text("affiliate_ref"), // key used by /go/[ref]; null = no affiliate path
    affiliateUrl: text("affiliate_url"), // destination URL (with your tag)

    // --- Image + crops ---
    masterBlobKey: text("master_blob_key"), // Vercel Blob key of the high-res master
    cropSpecs: jsonb("crop_specs").$type<CropSpec[]>().default([]), // 6 entries

    // --- Compliance / provenance (the scheduler refuses puzzles missing this) ---
    distinctiveDesign: boolean("distinctive_design").notNull().default(false), // trade-dress watchlist
    photoSource: text("photo_source"), // own | licensed | cc-by | community
    photoLicense: text("photo_license"),
    attribution: text("attribution"),
    // When a human confirmed no logo/wordmark survives in any of the 6 crops.
    // Cleared whenever the crops change; the scheduler requires it.
    logoQaAt: timestamp("logo_qa_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // /go/[ref] picks the first match, so a duplicate ref would silently send
    // clicks to the wrong watch.
    uniqueIndex("watches_affiliate_ref_unique").on(t.affiliateRef),
  ],
);

/** The daily schedule. One watch per UTC day. */
export const puzzles = pgTable(
  "puzzles",
  {
    id: serial("id").primaryKey(),
    puzzleDate: date("puzzle_date").notNull(),
    puzzleNumber: integer("puzzle_number").notNull(),
    watchId: integer("watch_id")
      .notNull()
      .references(() => watches.id),
    sponsored: boolean("sponsored").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("puzzles_date_unique").on(t.puzzleDate),
    uniqueIndex("puzzles_number_unique").on(t.puzzleNumber),
  ],
);

/** Brand/model spelling aliases so "AP" -> "Audemars Piguet", "sub" -> "Submariner". */
export const aliases = pgTable(
  "aliases",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(), // brand | model
    alias: text("alias").notNull(), // normalized form
    canonical: text("canonical").notNull(), // normalized canonical form
    // Model aliases only: the normalized brand they belong to, so "gmt" can
    // mean a different model for Rolex than for Grand Seiko. Null = any brand.
    brand: text("brand"),
  },
  (t) => [
    index("aliases_alias_idx").on(t.alias),
  ],
);

/** Anonymous guess log for difficulty tuning + the "X solved today" counter. */
export const guessesLog = pgTable(
  "guesses_log",
  {
    id: serial("id").primaryKey(),
    puzzleDate: date("puzzle_date").notNull(),
    cropIndex: integer("crop_index").notNull(),
    guessBrand: text("guess_brand"),
    guessModel: text("guess_model"),
    brandCorrect: boolean("brand_correct").notNull().default(false),
    solved: boolean("solved").notNull().default(false),
    // Random per-device id (no account, no PII) so "solved today" counts
    // players rather than requests.
    playerId: text("player_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("guesses_log_date_solved_idx").on(t.puzzleDate, t.solved),
  ],
);

/** The de-risk asset: the waitlist email list. */
export const waitlist = pgTable(
  "waitlist",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    source: text("source"), // which form: landing | landing-live | ...
    // First-touch attribution: where this person came from (lib/attribution.ts).
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    referrerHost: text("referrer_host"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("waitlist_email_unique").on(t.email),
  ],
);

/**
 * One row per browser session that loaded the site: the denominator for the
 * waitlist conversion rate, by source. Deliberately holds no personal data
 * (no IP, no user agent, only the referring host), so it needs no consent.
 */
export const visits = pgTable(
  "visits",
  {
    id: serial("id").primaryKey(),
    path: text("path").notNull(),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    referrerHost: text("referrer_host"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("visits_created_idx").on(t.createdAt),
  ],
);

/** Tracked affiliate clicks so you can measure real EPC (not the affiliate dashboard's). */
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  ref: text("ref").notNull(),
  puzzleDate: date("puzzle_date"),
  referer: text("referer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
