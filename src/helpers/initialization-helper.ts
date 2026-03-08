import streamDeck from "@elgato/streamdeck";
import { RotateOutputAudioDevice } from "../actions/rotate-audio-output-device";
import { ROTATE_OUTPUT_DEVICES } from "../constants/action-uuids.constants";
import { getCurrentSonarSettingsAsync } from "../sonar-helper";

export async function initializeGlobalSettingsAsync() {
    const globalSettings = await getCurrentSonarSettingsAsync();
    // Functions weird during Streamdeck setup. Stops working.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    streamDeck.settings.setGlobalSettings(globalSettings);

    setInterval(async () => {
        const globalSettings = await getCurrentSonarSettingsAsync();
        // Functions weird during Streamdeeck setup. Stops working.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        streamDeck.settings.setGlobalSettings(globalSettings);
        await notifyAllAsync();
    }, 60000);
}

export async function notifyAllAsync() {
    await Promise.all(streamDeck.actions.map(async (action) => {
        switch (action.manifestId) {
            case ROTATE_OUTPUT_DEVICES:
                return RotateOutputAudioDevice.updateThisActionAsync(action);
                break;
        }
    }));
}