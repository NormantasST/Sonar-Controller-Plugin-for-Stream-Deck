import streamDeck from "@elgato/streamdeck";
import { getCurrentSonarSettingsAsync } from "../sonar-helper";
import { getAllRefreshableActions } from "../actions/base/action-registry";
import type { GlobalSettings } from "../models/types/global-settings.type";

const logger = streamDeck.logger.createScope("initialization-helper");

export async function initializeGlobalSettingsAsync() {
    const globalSettings = await getCurrentSonarSettingsAsync();
    // Functions weird during Streamdeck setup. Stops working.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    streamDeck.settings.setGlobalSettings(globalSettings);

    setInterval(async () => {
        // A throw here would be an unhandled rejection and kill the plugin process,
        // e.g. when SteelSeries GG is restarting; log and retry on the next tick instead.
        try {
            const globalSettings = await getCurrentSonarSettingsAsync();
            // Functions weird during Streamdeck setup. Stops working.
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            streamDeck.settings.setGlobalSettings(globalSettings);
            await notifyAllAsync(globalSettings);
        } catch (error) {
            const details = error instanceof Error ? error.stack ?? error.message : JSON.stringify(error);
            logger.error(`Periodic Sonar settings refresh failed: ${details}`);
        }
    }, 60000);
}

export async function notifyAllAsync(globalSettings: GlobalSettings) {
    await Promise.all(getAllRefreshableActions().map((action) => action.refreshAllAsync(globalSettings)));
}
