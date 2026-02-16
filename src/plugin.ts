import streamDeck from '@elgato/streamdeck';

import { RotateOutputAudioDevice as RotateOutputAudioDevice } from "./actions/rotate-audio-output-device";
import { getCurrentSonarSettings } from './sonar-helper';
import { notifyAll } from './helpers/plugin-helper';

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
