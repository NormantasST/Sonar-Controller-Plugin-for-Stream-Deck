import streamDeck from '@elgato/streamdeck';
import { ActionSetMicrophoneDeviceTo } from './actions/set-microphone-device-to';
import { RotateMicrophoneDevice } from "./actions/rotate-microphone-device";
import { RotateOutputAudioDevice } from "./actions/rotate-audio-output-device";
import { ActionMuteChannel } from './actions/mute-channel';
import { initializeGlobalSettingsAsync } from './helpers/initialization-helper';
import { DialChangeChannelVolume } from './actions/change-channel-volume.dial';
import { ActionChangeChannelVolume } from './actions/change-channel-volume.action';
import { ActionChatMixController } from './actions/chat-mix-controller.action';
import { DialChatMixController } from './actions/chat-mix-controller.action.dial';
import { ActionSetChannelProfileTo } from './actions/set-channel-profile-to';
import { ActionSetOutputDeviceTo } from './actions/set-output-device-to';

streamDeck.logger.setLevel("trace");

streamDeck.settings.useExperimentalMessageIdentifiers = true;
await initializeGlobalSettingsAsync();

streamDeck.actions.registerAction(new RotateOutputAudioDevice());
streamDeck.actions.registerAction(new RotateMicrophoneDevice());
streamDeck.actions.registerAction(new ActionChangeChannelVolume());
streamDeck.actions.registerAction(new DialChangeChannelVolume());
streamDeck.actions.registerAction(new ActionChatMixController());
streamDeck.actions.registerAction(new DialChatMixController());
streamDeck.actions.registerAction(new ActionMuteChannel());
streamDeck.actions.registerAction(new ActionSetChannelProfileTo());
streamDeck.actions.registerAction(new ActionSetOutputDeviceTo());
streamDeck.actions.registerAction(new ActionSetMicrophoneDeviceTo());

// eslint-disable-next-line @typescript-eslint/no-floating-promises
streamDeck.connect();
