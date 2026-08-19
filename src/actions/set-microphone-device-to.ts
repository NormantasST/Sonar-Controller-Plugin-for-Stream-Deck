import type { KeyDownEvent, SendToPluginEvent } from "@elgato/streamdeck";
import streamDeck, { action } from "@elgato/streamdeck";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { ACTION_SET_MICROPHONE_DEVICE_TO, ROTATE_MICROPHONE_DEVICE } from "../constants/action-uuids.constants";
import sonarClient from "../services/sonar-client";
import type { JsonObject, JsonValue } from "@elgato/utils";
import { DeviceDataFlow, RedirectionEnum, SonarMode, StreamRedirectionEnum, type AudioDevice} from "../models/types/sonar-models.type";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import type { DeviceData } from "../models/types/device-data.type";
import { wrapText } from "../helpers/plugin-helper";
import type { VisibleAction } from "./base/sonar-action";
import { SonarAction } from "./base/sonar-action";

const logger = streamDeck.logger.createScope("set-microphone-device-to");

@action({ UUID: ACTION_SET_MICROPHONE_DEVICE_TO })
export class ActionSetMicrophoneDeviceTo extends SonarAction<SetMicrophoneDeviceToSettings> {
	protected override readonly relatedActionUuids = [ACTION_SET_MICROPHONE_DEVICE_TO, ROTATE_MICROPHONE_DEVICE];

	protected override applyDefaultSettings(settings: SetMicrophoneDeviceToSettings, globalSettings: GlobalSettings): void {
		settings.setDeviceMode = settings.setDeviceMode ?? SetMicrophoneDeviceModes.AutoSelect;
		settings.targetedDeviceId = settings.targetedDeviceId ?? (globalSettings.sonarMode === SonarMode.Classic ? globalSettings.gameChannel.deviceId : globalSettings.personalMixChannel.deviceId);
		settings.maxTitleLength = settings.maxTitleLength ?? 35;
	}

	protected override async refreshActionAsync(action: VisibleAction<SetMicrophoneDeviceToSettings>, globalSettings: GlobalSettings, localSettings: SetMicrophoneDeviceToSettings): Promise<void> {
		await action.setTitle(await ActionSetMicrophoneDeviceTo.generateTitleAsync(localSettings));
		await action.setImage(ActionSetMicrophoneDeviceTo.getImagePath(globalSettings, localSettings));
	}

	public override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, JsonObject>): Promise<void> {
		if (ev.payload instanceof Object && "event" in ev.payload && ev.payload.event === "getInputDevices")
			await ActionSetMicrophoneDeviceTo.updateAvailableDevicesUIAsync();
	}

	public override async onKeyDown(ev: KeyDownEvent<SetMicrophoneDeviceToSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const sonarMode = await sonarClient.getSonarModeAsync();

		await ActionSetMicrophoneDeviceTo.setCurrentAudioInputAsync(localSettings.targetedDeviceId, localSettings.setDeviceMode, sonarMode)

		const friendlyName = (await sonarClient.getAllAudioDevicesAsync()).find(x => x.id === localSettings.targetedDeviceId)?.friendlyName ?? "";
		globalSettings.sonarMode = sonarMode;
		ActionSetMicrophoneDeviceTo.updateAudioDeviceGlobalSettings(
			globalSettings,
			localSettings.targetedDeviceId,
			friendlyName,
			localSettings.setDeviceMode,
			sonarMode)

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static async updateAvailableDevicesUIAsync(allDevices?: AudioDevice[]): Promise<void> {
		allDevices = allDevices ?? (await sonarClient.getAllInputAudioDevicesAsync())
		await streamDeck.ui.sendToPropertyInspector({
		event: "getInputDevices",
		items: allDevices
			.filter(x => x.dataFlow === DeviceDataFlow.Capture)
			.toSorted((left, right) => (left.friendlyName.localeCompare(right.friendlyName)))
			.map((x) => ({
				label: x.friendlyName,
				value: x.id
			}))
		});
	}

	private static async generateTitleAsync(localSettings: SetMicrophoneDeviceToSettings): Promise<string> {
		const deviceName = (await sonarClient.getAllAudioDevicesAsync()).find((x) => x.id == localSettings.targetedDeviceId)?.friendlyName ?? "Unknown";
		return wrapText(`Set Mic: ${deviceName}`, 9, localSettings.maxTitleLength);
	}

	private static getImagePath(globalSettings: GlobalSettings, localSettings: SetMicrophoneDeviceToSettings): string {
		const basePath = `imgs/actions/set-microphone-device-to/`;

		const currentChannel = ActionSetMicrophoneDeviceTo.getCurrentChannel(globalSettings, localSettings.setDeviceMode, globalSettings.sonarMode);
		if (currentChannel.deviceId === localSettings.targetedDeviceId)
			return basePath + "key-enabled";

		return basePath + "key";
	}

	private static async setCurrentAudioInputAsync(nextAudioDeviceId: string, rotationMode: SetMicrophoneDeviceModes, sonarMode: SonarMode) {
		switch (rotationMode) {
			case SetMicrophoneDeviceModes.ClassicOnly:
				return await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Microphone);
			case SetMicrophoneDeviceModes.StreamModeOnly:
				return await sonarClient.putStreamOutputAudioDeviceAsync(nextAudioDeviceId, StreamRedirectionEnum.Microphone);
			case SetMicrophoneDeviceModes.AutoSelect:
				if (sonarMode == SonarMode.Classic)
					return await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Microphone);

				if (sonarMode == SonarMode.Streaming)
					return await sonarClient.putStreamOutputAudioDeviceAsync(nextAudioDeviceId, StreamRedirectionEnum.Microphone);

				break;
			}

		throw logErrorAndThrow(logger, `Unable to update microphone mode for ${rotationMode} mode: ${sonarMode}`);
	}

	private static updateAudioDeviceGlobalSettings(
		globalSettings: GlobalSettings,
		deviceId: string,
		friendlyName: string,
		rotationMode: SetMicrophoneDeviceModes,
		sonarMode: SonarMode) {
		const channel = ActionSetMicrophoneDeviceTo.getCurrentChannel(globalSettings, rotationMode, sonarMode);

		channel.deviceId = deviceId;
		channel.deviceName = friendlyName;
	}

	private static getCurrentChannel(
		globalSettings: GlobalSettings,
		setDeviceMode: SetMicrophoneDeviceModes,
		sonarMode: SonarMode): DeviceData {
		switch (setDeviceMode) {
			case SetMicrophoneDeviceModes.ClassicOnly:
				return globalSettings.micChannel;
			case SetMicrophoneDeviceModes.StreamModeOnly:
				return globalSettings.streamMicChannel;
			case SetMicrophoneDeviceModes.AutoSelect:
				if (sonarMode == SonarMode.Classic)
					return globalSettings.micChannel;

				if (sonarMode == SonarMode.Streaming)
					return globalSettings.streamMicChannel;
		}

		throw logErrorAndThrow(logger, `Rotation Channel is not assigned ${setDeviceMode}`);
	}
}

/**
 * Settings for {@link ActionSetMicrophoneDeviceTo}.
 */
type SetMicrophoneDeviceToSettings = {
	setDeviceMode: SetMicrophoneDeviceModes,
	targetedDeviceId: string,
	maxTitleLength: number
};

enum SetMicrophoneDeviceModes {
	AutoSelect = "auto-select",
	ClassicOnly = "classic-only",
	StreamModeOnly = "stream-mode-only",
}
