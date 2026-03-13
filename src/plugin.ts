import streamDeck from '@elgato/streamdeck';

import { RotateOutputAudioDevice } from "./actions/rotate-audio-output-device";
import { ChangeChannelVolume } from './actions/change-channel-volume';
import { ChatMixController } from './actions/chat-mix-controller';
import { MuteChannel } from './actions/mute-channel';
import { initializeGlobalSettingsAsync } from './helpers/initialization-helper';

streamDeck.logger.setLevel("trace");

streamDeck.settings.useExperimentalMessageIdentifiers = true;
await initializeGlobalSettingsAsync();

streamDeck.actions.registerAction(new RotateOutputAudioDevice());
streamDeck.actions.registerAction(new ChangeChannelVolume());
streamDeck.actions.registerAction(new ChatMixController());
streamDeck.actions.registerAction(new MuteChannel());

// eslint-disable-next-line @typescript-eslint/no-floating-promises
streamDeck.connect();
