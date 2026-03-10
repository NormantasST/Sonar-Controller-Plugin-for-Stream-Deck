import type { DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { VOLUME_MIXER as OUTPUT_VOLUME_MIXER } from "../constants/action-uuids.constants";
import type { DeviceData } from "../models/types/device-data.type";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import sonarClient from "../services/sonar-client";
import { DeviceRole } from "../models/types/sonar-models.type";

const logger = streamDeck.logger.createScope("output-volume-mixer");

@action({ UUID: OUTPUT_VOLUME_MIXER })
export class ChangeChannelVolume extends SingletonAction<ChangeChannelVolumeSettings> implements INotifyableAction {
	public static async updateThisActionAsync(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await action.getSettings() as ChangeChannelVolumeSettings;

		await action.setTitle(ChangeChannelVolume.generateTitle(globalSettings, localSettings));
		// TODO Add Image Updating.
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
		// Auto Initialize Settings. Becase Streamdeck does not.
		const settings = await action.getSettings();
		settings.targetChannel = settings.targetChannel ?? ChangeChannelVolumeChannels.ClassicMaster;
		settings.mode = settings.mode ?? ChangeChannelVolumeModes.IncreaseVolume;
		settings.changeChannelValue = settings.changeChannelValue ?? 5;
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
		switch (localSettings.mode) {
			case ChangeChannelVolumeModes.SetVolumeTo:
				return `Set ${localSettings.targetChannel} \r\n To ${localSettings.changeChannelValue}%`;
			case ChangeChannelVolumeModes.IncreaseVolume:
				return `+${localSettings.changeChannelValue}% \r\n ${localSettings.targetChannel.replace(" ", "\r\n")} \r\n (${Math.round(currentChanel.volume * 100)}%)`;
			case ChangeChannelVolumeModes.DecreaseVolume:
				return `-${localSettings.changeChannelValue}% \r\n ${localSettings.targetChannel.replace(" ", "\r\n")} \r\n (${Math.round(currentChanel.volume * 100)}%)`;
			default:
				throw logErrorAndThrow(logger, `Unknown mode for generating title: ${localSettings.mode}`);
		}
	}
}

/**
 * Settings for {@link ChangeChannelVolume}.
 */
type ChangeChannelVolumeSettings = {
	targetChannel: ChangeChannelVolumeChannels,
	mode: ChangeChannelVolumeModes,
	changeChannelValue: number,
};

enum ChangeChannelVolumeChannels {
	ClassicMaster = "Classic Master",
	ClassicGame = "Classic Game",
	ClassicChat = "Classic Chat",
	ClassicMedia = "Classic Media",
	ClassicAux = "Classic Aux",
	ClassicMic = "Classic Mic",
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