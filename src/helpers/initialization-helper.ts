import streamDeck from "@elgato/streamdeck";
import { RotateMicrophoneDevice } from "../actions/rotate-michrophone-device";
import { RotateOutputAudioDevice } from "../actions/rotate-audio-output-device";
import { ACTION_CHAT_MIX_CONTROLLER, ACTION_MUTE_CHANNEL, ROTATE_MICROPHONE_DEVICE, ROTATE_OUTPUT_DEVICES, ACTION_VOLUME_MIXER, DIAL_VOLUME_MIXER, DIAL_CHAT_MIX_CONTROLLER } from "../constants/action-uuids.constants";
import { getCurrentSonarSettingsAsync } from "../sonar-helper";
import { ActionMuteChannel } from "../actions/mute-channel";
import { DialChangeChannelVolume } from "../actions/change-channel-volume.dial";
import { ActionChangeChannelVolume } from "../actions/change-channel-volume.action";
import { DialChatMixController } from "../actions/chat-mix-controller.action.dial";
import { ActionChatMixController } from "../actions/chat-mix-controller.action";

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
        }
    }));
}