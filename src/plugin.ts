import streamDeck from '@elgato/streamdeck';

import { RotateOutputAudioDevice } from "./actions/rotate-audio-output-device";
import { ChangeChannelVolume } from './actions/change-output-channel-volume';
import { initializeGlobalSettingsAsync } from './helpers/initialization-helper';

streamDeck.logger.setLevel("trace");

streamDeck.settings.useExperimentalMessageIdentifiers = true;
await initializeGlobalSettingsAsync();

streamDeck.actions.registerAction(new RotateOutputAudioDevice());
streamDeck.actions.registerAction(new ChangeChannelVolume());

// eslint-disable-next-line @typescript-eslint/no-floating-promises
streamDeck.connect();