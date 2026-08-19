import type { KeyDownEvent, SendToPluginEvent } from "@elgato/streamdeck";
import streamDeck, { action } from "@elgato/streamdeck";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { ROTATE_OUTPUT_DEVICES, ACTION_SET_OUTPUT_DEVICE_TO } from "../constants/action-uuids.constants";
import sonarClient from "../services/sonar-client";
import type { JsonObject, JsonValue } from "@elgato/utils";
import { DeviceDataFlow, RedirectionEnum, SonarMode, StreamRedirectionEnum, type AudioDevice} from "../models/types/sonar-models.type";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import type { DeviceData } from "../models/types/device-data.type";
import { wrapText } from "../helpers/plugin-helper";
import type { VisibleAction } from "./base/sonar-action";
import { SonarAction } from "./base/sonar-action";

const logger = streamDeck.logger.createScope("set-output-device-to");

@action({ UUID: ACTION_SET_OUTPUT_DEVICE_TO })
export class ActionSetOutputDeviceTo extends SonarAction<SetOutputDeviceToSettings> {
	protected override readonly relatedActionUuids = [ACTION_SET_OUTPUT_DEVICE_TO, ROTATE_OUTPUT_DEVICES];

	protected override applyDefaultSettings(settings: SetOutputDeviceToSettings, globalSettings: GlobalSettings): void {
		settings.setDeviceMode = settings.setDeviceMode ?? SetOutputDeviceModes.AllAutoDetect;
		settings.targetedDeviceId = settings.targetedDeviceId ?? (globalSettings.sonarMode === SonarMode.Classic ? globalSettings.gameChannel.deviceId : globalSettings.personalMixChannel.deviceId);
		settings.maxTitleLength = settings.maxTitleLength ?? 35;
	}

	protected override async refreshActionAsync(action: VisibleAction<SetOutputDeviceToSettings>, globalSettings: GlobalSettings, localSettings: SetOutputDeviceToSettings): Promise<void> {
		await action.setTitle(await ActionSetOutputDeviceTo.generateTitleAsync(localSettings));
		await action.setImage(ActionSetOutputDeviceTo.getImagePath(globalSettings, localSettings));
	}

	public override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, JsonObject>): Promise<void> {
		if (ev.payload instanceof Object && "event" in ev.payload && ev.payload.event === "getOutputDevices")
			await ActionSetOutputDeviceTo.updateAvailableDevicesUIAsync();
	}

	public override async onKeyDown(ev: KeyDownEvent<SetOutputDeviceToSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const sonarMode = await sonarClient.getSonarModeAsync();

		await ActionSetOutputDeviceTo.setCurrentAudioOutputAsync(localSettings.targetedDeviceId, localSettings.setDeviceMode, sonarMode)

		const friendlyName = (await sonarClient.getAllAudioDevicesAsync()).find(x => x.id === localSettings.targetedDeviceId)?.friendlyName ?? "";
		globalSettings.sonarMode = sonarMode;
		ActionSetOutputDeviceTo.updateAudioDeviceGlobalSettings(
			globalSettings,
			localSettings.targetedDeviceId,
			friendlyName,
			localSettings.setDeviceMode,
			sonarMode)

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static async updateAvailableDevicesUIAsync(allDevices?: AudioDevice[]): Promise<void> {
		allDevices = allDevices ?? (await sonarClient.getAllAudioDevicesAsync())
		await streamDeck.ui.sendToPropertyInspector({
		event: "getOutputDevices",
		items: allDevices
			.filter(x => x.dataFlow === DeviceDataFlow.Render)
			.toSorted((left, right) => (left.friendlyName.localeCompare(right.friendlyName)))
			.map((x) => ({
				label: x.friendlyName,
				value: x.id
			}))
		});
	}

	private static async generateTitleAsync(localSettings: SetOutputDeviceToSettings): Promise<string> {
		const channelName = SetOutputDeviceToChannelsTranslations.get(localSettings.setDeviceMode) ?? "Unknown";
		const deviceName = (await sonarClient.getAllAudioDevicesAsync()).find((x) => x.id == localSettings.targetedDeviceId)?.friendlyName ?? "Unknown";
		return wrapText(`Set ${channelName}: ${deviceName}`, 11, localSettings.maxTitleLength);
	}

	private static getImagePath(globalSettings: GlobalSettings, localSettings: SetOutputDeviceToSettings): string {
		const basePath = `imgs/actions/set-output-device-to/`;

		const currentChannel = ActionSetOutputDeviceTo.getCurrentChannel(globalSettings, localSettings.setDeviceMode, globalSettings.sonarMode);
		if (currentChannel.deviceId === localSettings.targetedDeviceId)
			return basePath + "key-enabled";

		return basePath + "key";
	}

	private static getCurrentChannel(
		globalSettings: GlobalSettings,
		setOutputDeviceMode: SetOutputDeviceModes,
		sonarMode: SonarMode): DeviceData {
		switch (setOutputDeviceMode) {
			case SetOutputDeviceModes.Game:
			case SetOutputDeviceModes.AllClassic:
				return globalSettings.gameChannel!;
			case SetOutputDeviceModes.Chat:
				return globalSettings.chatChannel!;
			case SetOutputDeviceModes.Media:
				return globalSettings.mediaChannel!;
			case SetOutputDeviceModes.Aux:
				return globalSettings.auxChannel!;
			case SetOutputDeviceModes.PersonalMix:
			case SetOutputDeviceModes.AllStreaming:
				return globalSettings.personalMixChannel!;
			case SetOutputDeviceModes.StreamMix:
				return globalSettings.streamMixChannel!;
			case SetOutputDeviceModes.AllAutoDetect:
				if (sonarMode == SonarMode.Classic)
					return globalSettings.gameChannel!;

				if (sonarMode == SonarMode.Streaming)
					return globalSettings.personalMixChannel!;

				break;
		}

		throw logErrorAndThrow(logger, `Set Output Device Channel is not assigned ${setOutputDeviceMode}`);
	}

	private static updateAudioDeviceGlobalSettings(
		globalSettings: GlobalSettings,
		deviceId: string,
		friendlyName: string,
		setOutputDeviceMode: SetOutputDeviceModes,
		sonarMode: SonarMode) {
		const channel = ActionSetOutputDeviceTo.getCurrentChannel(globalSettings, setOutputDeviceMode, sonarMode)

		if (channel === undefined)
			throw logErrorAndThrow(logger, "Channel is not assigned");

		channel!.deviceId = deviceId;
		channel!.deviceName = friendlyName;
	}

	private static async setCurrentAudioOutputAsync(nextAudioDeviceId: string, setOutputDeviceMode: SetOutputDeviceModes, sonarMode: SonarMode) {
		switch (setOutputDeviceMode) {
			case SetOutputDeviceModes.Game:
				await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Game);
				break;
			case SetOutputDeviceModes.Chat:
				await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Chat);
				break;
			case SetOutputDeviceModes.Media:
				await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Media);
				break;
			case SetOutputDeviceModes.Aux:
				await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Aux);
				break;
			case SetOutputDeviceModes.PersonalMix:
				await sonarClient.putStreamOutputAudioDeviceAsync(nextAudioDeviceId, StreamRedirectionEnum.PersonalMix);
				break;
			case SetOutputDeviceModes.StreamMix:
				await sonarClient.putStreamOutputAudioDeviceAsync(nextAudioDeviceId, StreamRedirectionEnum.StreamMix);
				break;
			case SetOutputDeviceModes.AllAutoDetect:
			case SetOutputDeviceModes.AllClassic:
			case SetOutputDeviceModes.AllStreaming:
				if (setOutputDeviceMode == SetOutputDeviceModes.AllClassic ||
					(sonarMode == SonarMode.Classic && setOutputDeviceMode == SetOutputDeviceModes.AllAutoDetect)) {
					await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Game);
					await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Chat);
					await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Media);
					await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Aux);
				}

				if (setOutputDeviceMode == SetOutputDeviceModes.AllStreaming ||
					(sonarMode == SonarMode.Streaming && setOutputDeviceMode == SetOutputDeviceModes.AllAutoDetect)) {
					await sonarClient.putStreamOutputAudioDeviceAsync(nextAudioDeviceId, StreamRedirectionEnum.PersonalMix);
					await sonarClient.putStreamOutputAudioDeviceAsync(nextAudioDeviceId, StreamRedirectionEnum.StreamMix);
				}
				break;
		}
	}
}

/**
 * Settings for {@link ActionSetOutputDeviceTo}.
 */
type SetOutputDeviceToSettings = {
	setDeviceMode: SetOutputDeviceModes,
	targetedDeviceId: string,
	maxTitleLength: number
};

enum SetOutputDeviceModes {
	AllAutoDetect = "all-auto-detect",
	AllClassic = "all-classic",
	Game = "classic-game",
	Chat = "classic-chat",
	Media = "classic-media",
	Aux = "classic-aux",
	AllStreaming = "all-stream",
	PersonalMix = "stream-personal-mix",
	StreamMix = "stream-stream-mix",
}

export const SetOutputDeviceToChannelsTranslations = new Map<SetOutputDeviceModes, string>([
	[SetOutputDeviceModes.AllAutoDetect, "All"],
	[SetOutputDeviceModes.AllClassic, "All"],
	[SetOutputDeviceModes.AllStreaming, "All"],
	[SetOutputDeviceModes.Game, "Game"],
	[SetOutputDeviceModes.Chat, "Chat"],
	[SetOutputDeviceModes.Media, "Media"],
	[SetOutputDeviceModes.Aux, "Aux"],
	[SetOutputDeviceModes.PersonalMix, "Personal Mix"],
	[SetOutputDeviceModes.StreamMix, "Stream Mix"],
]);
