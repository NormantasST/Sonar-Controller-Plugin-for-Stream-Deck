import streamDeck from "@elgato/streamdeck";
import { RotateMicrophoneDevice } from "../actions/rotate-microphone-device";
import { RotateOutputAudioDevice } from "../actions/rotate-audio-output-device";
import { ACTION_CHAT_MIX_CONTROLLER, ACTION_MUTE_CHANNEL, ROTATE_MICROPHONE_DEVICE, ROTATE_OUTPUT_DEVICES, ACTION_VOLUME_MIXER, DIAL_VOLUME_MIXER, DIAL_CHAT_MIX_CONTROLLER, ACTION_SET_CHANNEL_PROFILE_TO, ACTION_SET_OUTPUT_DEVICE_TO, ACTION_SET_MICROPHONE_DEVICE_TO } from "../constants/action-uuids.constants";
import { getCurrentSonarSettingsAsync } from "../sonar-helper";
import { ActionMuteChannel } from "../actions/mute-channel";
import { DialChangeChannelVolume } from "../actions/change-channel-volume.dial";
import { ActionChangeChannelVolume } from "../actions/change-channel-volume.action";
import { DialChatMixController } from "../actions/chat-mix-controller.action.dial";
import { ActionChatMixController } from "../actions/chat-mix-controller.action";
import { ActionSetChannelProfileTo } from "../actions/set-channel-profile-to";
import { ActionSetOutputDeviceTo } from "../actions/set-output-device-to";
import { ActionSetMicrophoneDeviceTo } from "../actions/set-microphone-device-to";

export async function initializeGlobalSettingsAsync() {
    const globalSettings = await getCurrentSonarSettingsAsync();
    // Functions weird during Streamdeck setup. Stops working.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    streamDeck.settings.setGlobalSettings(globalSettings);

    setInterval(async () => {
        const globalSettings = await getCurrentSonarSettingsAsync();
        // Functions weird during Streamdeck setup. Stops working.
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
            case ROTATE_MICROPHONE_DEVICE:
                return RotateMicrophoneDevice.updateThisActionAsync(action);
            case ACTION_VOLUME_MIXER:
                return ActionChangeChannelVolume.updateThisActionAsync(action);
            case DIAL_VOLUME_MIXER:
                return DialChangeChannelVolume.updateThisActionAsync(action);
            case ACTION_CHAT_MIX_CONTROLLER:
                return ActionChatMixController.updateThisActionAsync(action);
            case DIAL_CHAT_MIX_CONTROLLER:
                return DialChatMixController.updateThisActionAsync(action);
            case ACTION_MUTE_CHANNEL:
                return ActionMuteChannel.updateThisActionAsync(action);
            case ACTION_SET_CHANNEL_PROFILE_TO:
                return ActionSetChannelProfileTo.updateThisActionAsync(action);
            case ACTION_SET_OUTPUT_DEVICE_TO:
                return ActionSetOutputDeviceTo.updateThisActionAsync(action);
            case ACTION_SET_MICROPHONE_DEVICE_TO:
                return ActionSetMicrophoneDeviceTo.updateThisActionAsync(action);
        }
    }));
}