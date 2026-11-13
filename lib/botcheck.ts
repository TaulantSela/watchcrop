import "server-only";
import { checkBotId } from "botid/server";

/**
 * Vercel BotID's verdict on the current request. BotID only runs on Vercel
 * (it needs the deployment's OIDC token), so anywhere else (`next dev`,
 * `next start` locally, CI) the request counts as human. It fails open: a
 * BotID outage must not stop people playing or signing up.
 */
export async function isBotRequest(): Promise<boolean> {
  if (!process.env.VERCEL) return false;
  try {
    return (await checkBotId()).isBot;
  } catch (err) {
    console.error("[watchcrop] BotID check failed open", err);
    return false;
  }
}
