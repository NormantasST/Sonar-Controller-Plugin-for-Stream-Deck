import type { DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { VOLUME_MIXER as OUTPUT_VOLUME_MIXER } from "../constants/action-uuids.constants";
import type { DeviceData } from "../models/types/device-data.type";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import sonarClient from "../services/sonar-client";
import { DeviceRole } from "../models/types/sonar-models.type"

const logger = streamDeck.logger.createScope("output-volume-mixer");

@action({ UUID: OUTPUT_VOLUME_MIXER })
export class ChangeChannelVolume extends SingletonAction<ChangeChannelVolumeSettings> implements INotifyableAction {
	public static async updateThisActionAsync(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await action.getSettings() as ChangeChannelVolumeSettings;

		await action.setTitle(ChangeChannelVolume.generateTitle(globalSettings, localSettings));
		await action.setImage(ChangeChannelVolume.getImagePath(globalSettings, localSettings));
	}

	public async notifyRelatedActionsAsync(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		await Promise.all(streamDeck.actions.map(async (action) => {
			switch (action.manifestId) {
				case OUTPUT_VOLUME_MIXER:
					return ChangeChannelVolume.updateThisActionAsync(action);
			}
		}));
	}

	private static async initializeActionAsync(action: any) {
		// Auto Initialize Settings. Because Streamdeck does not.
		const settings = await action.getSettings();
		settings.targetChannel = settings.targetChannel ?? ChangeChannelVolumeChannels.ClassicMaster;
		settings.mode = settings.mode ?? ChangeChannelVolumeModes.IncreaseVolume;
		settings.changeChannelValue = settings.changeChannelValue ?? 5;
		settings.showTextComponents = settings.showTextComponents ?? ["mode", "channel", "output"];
		await action.setSettings(settings);

		await ChangeChannelVolume.updateThisActionAsync(action);
	}

	public override async onWillAppear(ev: WillAppearEvent<ChangeChannelVolumeSettings>): Promise<void> {
		await ChangeChannelVolume.initializeActionAsync(ev.action);
	}

	public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ChangeChannelVolumeSettings> | any): Promise<void> {
		if (ev.id === undefined)
			await ChangeChannelVolume.updateThisActionAsync(ev.action);
	}

	public override async onKeyDown(ev: KeyDownEvent<ChangeChannelVolumeSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings() as ChangeChannelVolumeSettings;
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const updatedVolume = ChangeChannelVolume.getUpdatedVolume(localSettings, globalSettings);
		await ChangeChannelVolume.updateVolumeAsync(localSettings.targetChannel, updatedVolume);

		ChangeChannelVolume.updateAudioDeviceGlobalSettings(
			globalSettings,
			localSettings.targetChannel,
			updatedVolume);
		await streamDeck.settings.setGlobalSettings(globalSettings);

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static getUpdatedVolume(localSettings: ChangeChannelVolumeSettings, globalSettings: GlobalSettings): number {
		if (localSettings.mode === ChangeChannelVolumeModes.SetVolumeTo)
			return localSettings.changeChannelValue / 100;

		const currentChannel = this.getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		const currentVolume = currentChannel.volume ?? 0;
		switch (localSettings.mode) {
			case ChangeChannelVolumeModes.IncreaseVolume:
				return Math.min(currentVolume + localSettings.changeChannelValue / 100, 1);
			case ChangeChannelVolumeModes.DecreaseVolume:
				return Math.max(currentVolume - localSettings.changeChannelValue / 100, 0);
			default:
				throw logErrorAndThrow(logger, `Can't get update volume for Target Channel: ${localSettings.mode}`);
		}
	}

	private static getChannelFromGlobalSettings(globalSettings: GlobalSettings, targetChannel: ChangeChannelVolumeChannels): DeviceData {
		switch (targetChannel) {
			case ChangeChannelVolumeChannels.ClassicMaster:
				return globalSettings.masterChannel;
			case ChangeChannelVolumeChannels.ClassicGame:
				return globalSettings.gameChannel;
			case ChangeChannelVolumeChannels.ClassicChat:
				return globalSettings.chatChannel;
			case ChangeChannelVolumeChannels.ClassicMedia:
				return globalSettings.mediaChannel;
			case ChangeChannelVolumeChannels.ClassicAux:
				return globalSettings.auxChannel;
			case ChangeChannelVolumeChannels.ClassicMic:
				return globalSettings.micChannel;
			default:
				throw logErrorAndThrow(logger, `Unknown target channel from global settings: ${targetChannel}`);
		}
	}

	private static updateVolumeAsync(targetChannel: ChangeChannelVolumeChannels, updatedVolume: number): Promise<void> {
		switch (targetChannel) {
			case ChangeChannelVolumeChannels.ClassicMaster:
				return sonarClient.setClassicMasterVolumeAsync(updatedVolume);
			case ChangeChannelVolumeChannels.ClassicGame:
			case ChangeChannelVolumeChannels.ClassicChat:
			case ChangeChannelVolumeChannels.ClassicMedia:
			case ChangeChannelVolumeChannels.ClassicAux:
			case ChangeChannelVolumeChannels.ClassicMic:
				return sonarClient.setClassicChannelVolumeAsync(updatedVolume, ClassicVolumeSettingsEnumMap.get(targetChannel)!);
			default:
				throw logErrorAndThrow(logger, `Unknown target channel for updating volume: ${targetChannel}`);
		}
	}

	private static updateAudioDeviceGlobalSettings(
		globalSettings: GlobalSettings,
		targetChannel: ChangeChannelVolumeChannels,
		updatedVolume: number) {
		const globalSettingsChannel = this.getChannelFromGlobalSettings(globalSettings, targetChannel);
		globalSettingsChannel.volume = updatedVolume;
	}

	private static generateTitle(globalSettings: GlobalSettings, localSettings: ChangeChannelVolumeSettings): string {
		const currentChanel = ChangeChannelVolume.getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		const simplifiedChannelName = VolumeChannelTranslations.get(localSettings.targetChannel) ?? localSettings.targetChannel;

		const showMode = localSettings.showTextComponents.includes("mode");
		const showChannel = localSettings.showTextComponents.includes("channel");
		const showOutput = localSettings.showTextComponents.includes("output");

		switch (localSettings.mode) {
			case ChangeChannelVolumeModes.SetVolumeTo:
				const setVolumeTitle = ""
					+ (showMode ? "Set\r\n" : "")
					+ (showChannel ? `${simplifiedChannelName}\r\n` : "")
					+ (showOutput ? `To ${localSettings.changeChannelValue}%` : "");
				return setVolumeTitle.trim();
			case ChangeChannelVolumeModes.IncreaseVolume:
			case ChangeChannelVolumeModes.DecreaseVolume:
				const sign = localSettings.mode === ChangeChannelVolumeModes.IncreaseVolume ? "+" : "-";
				const changeVolumeTitle = ""
					+ (showMode ? `${sign}${localSettings.changeChannelValue}%\r\n` : "")
					+ (showChannel ? `${simplifiedChannelName.replace(" ", "\r\n")}\r\n` : "")
					+ (showOutput ? `(${Math.round(currentChanel.volume * 100)}%)` : "");
				return changeVolumeTitle.trim();
			default:
				throw logErrorAndThrow(logger, `Unknown mode for generating title: ${localSettings.mode}`);
		}
	}

	private static getImagePath(globalSettings: GlobalSettings, localSettings: ChangeChannelVolumeSettings): string {
		const basePath = `imgs/actions/change-channel-volume/`;
		if (localSettings.mode === ChangeChannelVolumeModes.SetVolumeTo)
			return basePath + "key-set-to";

		const volume = ChangeChannelVolume.getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel).volume ?? 0;
		logger.info(`Volume ${volume} mode: ${localSettings.mode}`);
		if (localSettings.mode === ChangeChannelVolumeModes.IncreaseVolume){
			if (volume == 1) // 100
				return basePath + "key-100";

			if (volume >= 0.70 && volume < 1) // From 65 to 100
				return basePath + "key-75";

			if (volume >= 0.50 && volume < 0.70) // From 50 to 65
				return basePath + "key-60";

			if (volume < 0.50) // Under 50
				return basePath + "key-increase-empty";
		}

		if (localSettings.mode === ChangeChannelVolumeModes.DecreaseVolume){
			if (volume >= 0.50) // Over 50
				return basePath + "key-decrease-empty";

			if (volume > 0.30 && volume < 0.50) // from 50 to 35
				return basePath + "key-40";

			if (volume > 0 && volume <= 0.30) // From 0 to 35
				return basePath + "key-25";

			if (volume ==0) // 0
				return basePath + "key-0";
		}

		throw logErrorAndThrow(logger, `Unknown mode for generating image path: ${localSettings.mode}`);
	}
}

/**
 * Settings for {@link ChangeChannelVolume}.
 */
type ChangeChannelVolumeSettings = {
	targetChannel: ChangeChannelVolumeChannels,
	mode: ChangeChannelVolumeModes,
	changeChannelValue: number,
	showTextComponents: ("mode" | "channel" | "output")[]
};

enum ChangeChannelVolumeChannels {
	ClassicMaster = "classic-master",
	ClassicGame = "classic-game",
	ClassicChat = "classic-chat",
	ClassicMedia = "classic-media",
	ClassicAux = "classic-aux",
	ClassicMic = "classic-mic",
}

enum ChangeChannelVolumeModes {
	SetVolumeTo = "setVolumeTo",
	IncreaseVolume = "increase",
	DecreaseVolume = "decrease"
}

export const ClassicVolumeSettingsEnumMap = new Map<ChangeChannelVolumeChannels, DeviceRole>([
	[ChangeChannelVolumeChannels.ClassicGame, DeviceRole.Game],
	[ChangeChannelVolumeChannels.ClassicChat, DeviceRole.Chat],
	[ChangeChannelVolumeChannels.ClassicMedia, DeviceRole.Media],
	[ChangeChannelVolumeChannels.ClassicAux, DeviceRole.Aux],
	[ChangeChannelVolumeChannels.ClassicMic, DeviceRole.Microphone],
]);

export const VolumeChannelTranslations = new Map<ChangeChannelVolumeChannels, string>([
	[ChangeChannelVolumeChannels.ClassicMaster, "Master"],
	[ChangeChannelVolumeChannels.ClassicGame, "Game"],
	[ChangeChannelVolumeChannels.ClassicChat, "Chat"],
	[ChangeChannelVolumeChannels.ClassicMedia, "Media"],
	[ChangeChannelVolumeChannels.ClassicAux, "Aux"],
	[ChangeChannelVolumeChannels.ClassicMic, "Mic"],
]);