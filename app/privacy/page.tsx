import type { Metadata } from "next";
import Link from "next/link";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const UPDATED = "13 November 2026";

export const metadata: Metadata = {
  title: `Privacy · ${SITE}`,
  description: `What ${SITE} collects, why, and how to have it deleted.`,
};

function Contact() {
  return CONTACT ? (
    <a href={`mailto:${CONTACT}`} className="text-[var(--gold)] underline">
      {CONTACT}
    </a>
  ) : (
    <span>the contact address on this page (coming soon)</span>
  );
}

export default function Privacy() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16 leading-relaxed">
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
        ← {SITE}
      </Link>
      <h1 className="text-3xl font-bold">Privacy</h1>
      <p className="text-sm text-[var(--muted)]">Last updated {UPDATED}.</p>

      <p>
        {SITE} is a small independent game run by Taulant Sela in North Macedonia. It collects as
        little as it can. It never sells your data, shows ads, or uses third-party trackers or
        cookies. Questions or requests: <Contact />.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">What is collected, and why</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Waitlist.</strong> Your email address, which form you used, and where you came
            from (campaign tags in the link you followed, and the website that sent you). Used to
            email you when the game launches, and the daily puzzle only if you opt into it, and to
            learn which communities are interested. Legal basis: your consent, which you can
            withdraw at any time.
          </li>
          <li>
            <strong>Visits.</strong> One count per browser session: the page, campaign tags and the
            referring website. No IP address, no device details, no cookies. This is anonymous.
          </li>
          <li>
            <strong>Playing.</strong> Guesses are logged with a random ID created in your browser,
            not linked to your email or identity, to tune puzzle difficulty and count how many
            people solved the day&apos;s watch. Your streak, stats and progress stay in your
            browser&apos;s local storage and never leave your device.
          </li>
          <li>
            <strong>Shopping links.</strong> When you click a shopping link on the answer screen,
            the click is logged with the page you came from and your browser&apos;s user-agent
            string, to measure which links work. Some of those links are affiliate links.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Who handles it</h2>
        <p>
          The site is hosted on Vercel and the database runs on Neon. Like any web host, their
          servers process standard request data (such as IP addresses) to deliver the site and keep
          it secure. Your email is not shared with anyone else.
        </p>
        <p>
          To keep scripted sign-ups and guesses out, those two requests are checked by Vercel
          BotID, which looks at signals from your browser without cookies or a puzzle to solve.
          The site also counts requests per network to stop floods: the counter is keyed by a
          one-way, secret-keyed hash of your IP address (never the address itself) and is deleted
          within a day.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">How long it is kept</h2>
        <p>
          Waitlist emails are kept until you unsubscribe or ask for deletion, or until the project
          shuts down. Visit counts and the guess log are anonymous and kept for statistics.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Your rights</h2>
        <p>
          You can ask to see, correct or delete your data, or withdraw your consent, by writing to{" "}
          <Contact />. You also have the right to complain to your data protection authority.
        </p>
      </section>
    </main>
  );
}
