import type { KeyDownEvent } from "@elgato/streamdeck";
import streamDeck, { action } from "@elgato/streamdeck";
import { ACTION_SET_OUTPUT_DEVICE_TO, ROTATE_OUTPUT_DEVICES } from "../constants/action-uuids.constants";
import type { GlobalSettings } from "../models/types/global-settings.type";
import sonarClient from '.././services/sonar-client';
import type { AudioDevice } from "../models/types/sonar-models.type";
import { RedirectionEnum, SonarMode, StreamRedirectionEnum } from "../models/types/sonar-models.type";
import { wrapText } from "../helpers/plugin-helper";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import type { DeviceData } from "../models/types/device-data.type";
import type { VisibleAction } from "./base/sonar-action";
import { SonarAction } from "./base/sonar-action";

const logger = streamDeck.logger.createScope("rotate-audio-output-device");

@action({ UUID: ROTATE_OUTPUT_DEVICES })
export class RotateOutputAudioDevice extends SonarAction<RotateOutputSettings> {
	protected override readonly relatedActionUuids = [ROTATE_OUTPUT_DEVICES, ACTION_SET_OUTPUT_DEVICE_TO];

	protected override applyDefaultSettings(settings: RotateOutputSettings): void {
		settings.rotationMode = settings.rotationMode ?? RotationMode.AllAutoDetect;
		settings.maxTitleLength = settings.maxTitleLength ?? 20;
		settings.allowExcludedDevices = settings.allowExcludedDevices ?? false;
	}

	protected override async refreshActionAsync(action: VisibleAction<RotateOutputSettings>, globalSettings: GlobalSettings, localSettings: RotateOutputSettings): Promise<void> {
		await action.setTitle(RotateOutputAudioDevice.getTitleFromSettings(globalSettings, localSettings));
	}

	public override async onKeyDown(ev: KeyDownEvent<RotateOutputSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const sonarMode = await sonarClient.getSonarModeAsync();
		const allDevices = await sonarClient.getAllOutputAudioDevicesAsync();
		const currentRenderDeviceId = await RotateOutputAudioDevice.getCurrentDeviceIdAsync(globalSettings, localSettings.rotationMode, sonarMode);

		const availableDeviceIds = await RotateOutputAudioDevice.filterAvailableDevicesAsync(allDevices, localSettings.allowExcludedDevices ?? false);
		const nextAudioDevice = RotateOutputAudioDevice.getNextAudioDevice(allDevices, availableDeviceIds, currentRenderDeviceId);
		if (nextAudioDevice.id === undefined)
			throw logErrorAndThrow(logger, "Next audio device is not assigned");

		await RotateOutputAudioDevice.setCurrentAudioOutputAsync(nextAudioDevice.id, localSettings.rotationMode, sonarMode)

		globalSettings.sonarMode = sonarMode;
		RotateOutputAudioDevice.updateAudioDeviceGlobalSettings(
			globalSettings,
			nextAudioDevice.id,
			nextAudioDevice.friendlyName,
			localSettings.rotationMode,
			sonarMode)

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static updateSingularAudioDeviceGlobalSettings(
		globalSettings: GlobalSettings,
		deviceId: string,
		friendlyName: string,
		rotationMode: RotationMode,
		sonarMode: SonarMode) {
		const channel = RotateOutputAudioDevice.getCurrentChannel(globalSettings, rotationMode, sonarMode)

		if (channel === undefined)
			throw logErrorAndThrow(logger, "Channel is not assigned");

		channel!.deviceId = deviceId;
		channel!.deviceName = friendlyName;
	}

	private static updateAudioDeviceGlobalSettings(
		globalSettings: GlobalSettings,
		deviceId: string,
		friendlyName: string,
		rotationMode: RotationMode,
		sonarMode: SonarMode) {
		switch (rotationMode) {
			case RotationMode.Game:
				RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.Game, sonarMode);
				break;
			case RotationMode.Chat:
				RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.Chat, sonarMode);
				break;
			case RotationMode.Media:
				RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.Media, sonarMode);
				break;
			case RotationMode.Aux:
				RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.Aux, sonarMode);
				break;
			case RotationMode.PersonalMix:
				RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.PersonalMix, sonarMode);
				break;
			case RotationMode.StreamMix:
				RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.StreamMix, sonarMode);
				break;
			case RotationMode.AllAutoDetect:
			case RotationMode.AllClassic:
			case RotationMode.AllStreaming:
				if (rotationMode == RotationMode.AllClassic ||
					(sonarMode == SonarMode.Classic && rotationMode == RotationMode.AllAutoDetect)) {
						RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.Game, sonarMode);
						RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.Chat, sonarMode);
						RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.Media, sonarMode);
						RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.Aux, sonarMode);
				}

				if (rotationMode == RotationMode.AllStreaming ||
					(sonarMode == SonarMode.Streaming && rotationMode == RotationMode.AllAutoDetect)) {
					RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.PersonalMix, sonarMode);
					RotateOutputAudioDevice.updateSingularAudioDeviceGlobalSettings(globalSettings, deviceId, friendlyName, RotationMode.StreamMix, sonarMode);
				}
				break;
		}
	}

	private static getCurrentChannel(
		globalSettings: GlobalSettings,
		rotationMode: RotationMode,
		sonarMode: SonarMode): DeviceData {
		switch (rotationMode) {
			case RotationMode.Game:
			case RotationMode.AllClassic:
				return globalSettings.gameChannel!;
			case RotationMode.Chat:
				return globalSettings.chatChannel!;
			case RotationMode.Media:
				return globalSettings.mediaChannel!;
			case RotationMode.Aux:
				return globalSettings.auxChannel!;
			case RotationMode.PersonalMix:
			case RotationMode.AllStreaming:
				return globalSettings.personalMixChannel!;
			case RotationMode.StreamMix:
				return globalSettings.streamMixChannel!;
			case RotationMode.AllAutoDetect:
				if (sonarMode == SonarMode.Classic)
					return globalSettings.gameChannel!;

				if (sonarMode == SonarMode.Streaming)
					return globalSettings.personalMixChannel!;

				break;
		}

		throw logErrorAndThrow(logger, `Rotation Channel is not assigned ${rotationMode}`);
	}

	private static async setCurrentAudioOutputAsync(nextAudioDeviceId: string, rotationMode: RotationMode, sonarMode: SonarMode) {
		switch (rotationMode) {
			case RotationMode.Game:
				await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Game);
				break;
			case RotationMode.Chat:
				await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Chat);
				break;
			case RotationMode.Media:
				await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Media);
				break;
			case RotationMode.Aux:
				await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Aux);
				break;
			case RotationMode.PersonalMix:
				await sonarClient.putStreamOutputAudioDeviceAsync(nextAudioDeviceId, StreamRedirectionEnum.PersonalMix);
				break;
			case RotationMode.StreamMix:
				await sonarClient.putStreamOutputAudioDeviceAsync(nextAudioDeviceId, StreamRedirectionEnum.StreamMix);
				break;
			case RotationMode.AllAutoDetect:
			case RotationMode.AllClassic:
			case RotationMode.AllStreaming:
				if (rotationMode == RotationMode.AllClassic ||
					(sonarMode == SonarMode.Classic && rotationMode == RotationMode.AllAutoDetect)) {
					await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Game);
					await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Chat);
					await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Media);
					await sonarClient.putOutputAudioDeviceAsync(nextAudioDeviceId, RedirectionEnum.Aux);
				}

				if (rotationMode == RotationMode.AllStreaming ||
					(sonarMode == SonarMode.Streaming && rotationMode == RotationMode.AllAutoDetect)) {
					await sonarClient.putStreamOutputAudioDeviceAsync(nextAudioDeviceId, StreamRedirectionEnum.PersonalMix);
					await sonarClient.putStreamOutputAudioDeviceAsync(nextAudioDeviceId, StreamRedirectionEnum.StreamMix);
				}
				break;
		}
	}

	private static getTitleFromSettings(globalSettings: GlobalSettings, localSettings: RotateOutputSettings) {
		const rotationMode = localSettings.rotationMode;
		const sonarMode = globalSettings.sonarMode

		const channel = RotateOutputAudioDevice.getCurrentChannel(globalSettings, rotationMode, sonarMode)
		const titleText = channel.deviceName;

		if (titleText == undefined)
			throw logErrorAndThrow(logger, `Related Channel for setting title on ${ROTATE_OUTPUT_DEVICES} is not found!`);

		return wrapText(titleText, 9, localSettings.maxTitleLength);
	}

	private static async filterAvailableDevicesAsync(allDevices: AudioDevice[], allowExcludedDevices: boolean): Promise<string[]> {
		if (allowExcludedDevices)
			return allDevices.map((device) => device.id ?? "Unknown");
		else {
			const excludedGameDevices = await sonarClient.getAllExcludedGameAudioDevicesAsync()
			return excludedGameDevices.map((device) => device.id ?? "Unknown");
		}
	}

	private static async getCurrentDeviceIdAsync(
		globalSettings: GlobalSettings,
		rotationMode: RotationMode,
		sonarMode: SonarMode): Promise<string> {
		const channel = RotateOutputAudioDevice.getCurrentChannel(globalSettings, rotationMode, sonarMode)
		return channel.deviceId ?? "Unknown";
	}

	private static getNextAudioDevice(allDevices: AudioDevice[], availableDeviceIds: string[], currentRenderDeviceId: string): AudioDevice {
		const currentOutputDeviceIndex = availableDeviceIds.findIndex((id) => id == currentRenderDeviceId) ?? 0;
		const nextAudioDeviceIdIndex = currentOutputDeviceIndex + 1 < availableDeviceIds.length ? currentOutputDeviceIndex + 1 : 0;
		const nextAudioDeviceId = availableDeviceIds[nextAudioDeviceIdIndex];

		const nextAudioDeviceIndex = allDevices.findIndex((device) => device.id == nextAudioDeviceId);
		return allDevices[nextAudioDeviceIndex];
	}
}

/**
 * Settings for {@link RotateOutputAudioDevice}.
 */
type RotateOutputSettings = {
	rotationMode: RotationMode,
	maxTitleLength: number,
	allowExcludedDevices: boolean,
};

enum RotationMode {
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
