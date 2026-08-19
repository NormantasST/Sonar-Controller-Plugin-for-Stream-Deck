import streamDeck from '@elgato/streamdeck';
import type { JsonObject } from '@elgato/utils';
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
import { registerRefreshableAction } from './actions/base/action-registry';
import type { SonarAction } from './actions/base/sonar-action';

streamDeck.logger.setLevel("trace");

streamDeck.settings.useExperimentalMessageIdentifiers = true;
await initializeGlobalSettingsAsync();

function registerSonarAction<TSettings extends JsonObject>(sonarAction: SonarAction<TSettings>): void {
	streamDeck.actions.registerAction(sonarAction);
	registerRefreshableAction(sonarAction.manifestId!, sonarAction);
}

registerSonarAction(new RotateOutputAudioDevice());
registerSonarAction(new RotateMicrophoneDevice());
registerSonarAction(new ActionChangeChannelVolume());
registerSonarAction(new DialChangeChannelVolume());
registerSonarAction(new ActionChatMixController());
registerSonarAction(new DialChatMixController());
registerSonarAction(new ActionMuteChannel());
registerSonarAction(new ActionSetChannelProfileTo());
registerSonarAction(new ActionSetOutputDeviceTo());
registerSonarAction(new ActionSetMicrophoneDeviceTo());

// eslint-disable-next-line @typescript-eslint/no-floating-promises
streamDeck.connect();
