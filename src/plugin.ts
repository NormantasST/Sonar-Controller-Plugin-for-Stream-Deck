import streamDeck from '@elgato/streamdeck';

import { RotateOutputAudioDevice as RotateOutputAudioDevice } from "./actions/rotate-audio-output-device";
import { getCurrentSonarSettings, notifyAll } from './sonar-helper';

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace");

const globalSettings = await getCurrentSonarSettings();
streamDeck.settings.setGlobalSettings(globalSettings);

setInterval(async () => {
    const globalSettings = await getCurrentSonarSettings();
    streamDeck.settings.setGlobalSettings(globalSettings);
    await notifyAll();
}, 60000)

streamDeck.actions.registerAction(new RotateOutputAudioDevice());

streamDeck.connect();
