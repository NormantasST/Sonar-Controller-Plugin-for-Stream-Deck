import streamDeck from "@elgato/streamdeck";
import { ROTATE_OUTPUT_DEVICES } from "../constants/action-uuids.constants";
import { RotateOutputAudioDevice } from "../actions/rotate-audio-output-device";

export async function notifyAll()
{
    streamDeck.actions.forEach(async (action) => {
        switch (action.manifestId) {
            case ROTATE_OUTPUT_DEVICES:
                await RotateOutputAudioDevice.updateActionStateAsync(action);
                break;
        }
    });
}