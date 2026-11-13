import { initBotId } from "botid/client/core";
import { BOTID_ROUTES } from "@/lib/botid-routes";

// Invisible bot check on the two write endpoints (signups and guesses). In
// `next dev` BotID skips the browser side entirely.
initBotId({ protect: [...BOTID_ROUTES] });
