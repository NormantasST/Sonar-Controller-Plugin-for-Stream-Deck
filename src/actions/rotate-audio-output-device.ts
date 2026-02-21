import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { ROTATE_OUTPUT_DEVICES } from "../constants/action-uuids.constants";
import { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import { GlobalSettings } from "../models/types/global-settings.type";
import sonarClient from '.././services/sonar-client';
import { AudioDevice, RedirectionEnum, SonarMode, StreamRedirectionEnum } from "../models/types/sonar-models.type";
import { wrapText } from "../helpers/plugin-helper";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import { DeviceData } from "../models/types/device-data.type";
import { log } from "console";

const logger = streamDeck.logger.createScope("rotate-audio-output-device");

@action({ UUID: ROTATE_OUTPUT_DEVICES })
export class RotateOutputAudioDevice extends SingletonAction<RotateOutputSettings> implements INotifyableAction {
	static async updateThisAction(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await action.getSettings();

		await action.setTitle(RotateOutputAudioDevice.getTitleFromSettings(globalSettings, localSettings));
	}

	async notifyRelatedActions(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		streamDeck.actions.forEach(async (action) => {
			switch (action.manifestId) {
				case ROTATE_OUTPUT_DEVICES:
					await RotateOutputAudioDevice.updateThisAction(action);
					break;
			}
		});
	}

	override async onWillAppear(ev: WillAppearEvent<RotateOutputSettings>): Promise<void> {
		await RotateOutputAudioDevice.initializeActionAsync(ev.action);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<RotateOutputSettings> | any): Promise<void> {
		if (ev.id === undefined)
			await RotateOutputAudioDevice.updateThisAction(ev.action);
	}

	override async onKeyDown(ev: KeyDownEvent<RotateOutputSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const sonarMode = await sonarClient.getSonarModeAsync();
		const allDevices = await sonarClient.getAllAudioDevicesAsync();
		const currentRenderDeviceId = await RotateOutputAudioDevice.getCurrentDeviceIdAsync(globalSettings, localSettings.rotationMode, sonarMode);

		let availableDeviceIds = await RotateOutputAudioDevice.filterAvailableDevicesAsync(allDevices, localSettings.allowExcludedDevices ?? false);
		const nextAudioDevice = RotateOutputAudioDevice.getNextAudioDevice(allDevices, availableDeviceIds, currentRenderDeviceId);
		await RotateOutputAudioDevice.setCurrentAudioOutputAsync(nextAudioDevice.id, localSettings.rotationMode, sonarMode)

		globalSettings.sonarMode = sonarMode;
		RotateOutputAudioDevice.updateAudioDeviceGlobalSettings(
			globalSettings,
			nextAudioDevice.id,
			nextAudioDevice.friendlyName,
			localSettings.rotationMode,
			sonarMode)
		await streamDeck.settings.setGlobalSettings(globalSettings);

		await this.notifyRelatedActions(globalSettings);
	}

	static async initializeActionAsync(action: any) {
		await RotateOutputAudioDevice.updateThisAction(action);
	}

	static updateAudioDeviceGlobalSettings(
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

	static getCurrentChannel(
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
				if (sonarMode == SonarMode.Classic) {
					return globalSettings.gameChannel!;
				}

				if (sonarMode == SonarMode.Streaming) {
					return globalSettings.personalMixChannel!;
				}
				break;
		}

		throw logErrorAndThrow(logger, "Channel is not assigned");
	}

	static async setCurrentAudioOutputAsync(nextAudioDeviceId: string, rotationMode: RotationMode, sonarMode: SonarMode) {
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

	static getTitleFromSettings(globalSettings: GlobalSettings, localSettings: RotateOutputSettings) {
		const rotationMode = localSettings.rotationMode;
		const sonarMode = globalSettings.sonarMode

		const channel = RotateOutputAudioDevice.getCurrentChannel(globalSettings, rotationMode, sonarMode)
		const titleText = channel.deviceName;

		if (titleText == undefined)
			throw logErrorAndThrow(logger, `Related Channel for setting title on ${ROTATE_OUTPUT_DEVICES} is not found!`);

		return wrapText(titleText, 9, localSettings.maxTitleLength);
	}

	static async filterAvailableDevicesAsync(allDevices: AudioDevice[], allowExcludedDevices: boolean): Promise<string[]> {
		if (allowExcludedDevices)
			return allDevices.map((device) => device.id);
		else
		{
			const excludedGameDevices = await sonarClient.getAllExcludedGameAudioDevicesAsync()
			return excludedGameDevices.map((device) => device.id);
		}
	} 

	static async getCurrentDeviceIdAsync(
		globalSettings: GlobalSettings,
		rotationMode: RotationMode,
		sonarMode: SonarMode): Promise<string> {
		const channel = RotateOutputAudioDevice.getCurrentChannel(globalSettings, rotationMode, sonarMode)
		return channel.deviceId;
	}

	static getNextAudioDevice(allDevices: AudioDevice[], availableDeviceIds: string[], currentRenderDeviceId: string): AudioDevice {
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
	allowExcludedDevices?: boolean
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