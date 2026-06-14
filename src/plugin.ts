import streamDeck from '@elgato/streamdeck';

import { RotateMicrophoneDevice } from "./actions/rotate-michrophone-device";
import { RotateOutputAudioDevice } from "./actions/rotate-audio-output-device";
import { ChatMixController } from './actions/chat-mix-controller';
import { MuteChannel } from './actions/mute-channel';
import { initializeGlobalSettingsAsync } from './helpers/initialization-helper';
import { DialChangeChannelVolume } from './actions/change-channel-volume.dial';
import { ActionChangeChannelVolume } from './actions/change-channel-volume.action';

streamDeck.logger.setLevel("trace");

streamDeck.settings.useExperimentalMessageIdentifiers = true;
await initializeGlobalSettingsAsync();

streamDeck.actions.registerAction(new RotateOutputAudioDevice());
streamDeck.actions.registerAction(new RotateMicrophoneDevice());
streamDeck.actions.registerAction(new ActionChangeChannelVolume());
streamDeck.actions.registerAction(new DialChangeChannelVolume());
streamDeck.actions.registerAction(new ChatMixController());
streamDeck.actions.registerAction(new MuteChannel());

// eslint-disable-next-line @typescript-eslint/no-floating-promises
streamDeck.connect();
