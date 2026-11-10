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
export const watches = pgTable("watches", {
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

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
  (t) => ({
    dateUnique: uniqueIndex("puzzles_date_unique").on(t.puzzleDate),
    numberUnique: uniqueIndex("puzzles_number_unique").on(t.puzzleNumber),
  }),
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
  (t) => ({
    aliasIdx: index("aliases_alias_idx").on(t.alias),
  }),
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
  (t) => ({
    solvedIdx: index("guesses_log_date_solved_idx").on(t.puzzleDate, t.solved),
  }),
);

/** The de-risk asset: the waitlist email list. */
export const waitlist = pgTable(
  "waitlist",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    source: text("source"), // landing | reveal | ...
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("waitlist_email_unique").on(t.email),
  }),
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
