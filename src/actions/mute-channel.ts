import type { DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { MUTE_CHANNEL } from "../constants/action-uuids.constants";
import type { DeviceData } from "../models/types/device-data.type";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import sonarClient from "../services/sonar-client";
import { DeviceRole } from "../models/types/sonar-models.type"

const logger = streamDeck.logger.createScope("mute-channel");

@action({ UUID: MUTE_CHANNEL })
export class MuteChannel extends SingletonAction<MuteChannelSettings> implements INotifyableAction {
	public static async updateThisActionAsync(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await action.getSettings() as MuteChannelSettings;

		await action.setTitle(MuteChannel.generateTitle(globalSettings, localSettings));
		await action.setImage(MuteChannel.getImagePath(globalSettings, localSettings));
	}

	public async notifyRelatedActionsAsync(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		await Promise.all(streamDeck.actions.map(async (action) => {
			switch (action.manifestId) {
				case MUTE_CHANNEL:
					return MuteChannel.updateThisActionAsync(action);
			}
		}));
	}

	private static async initializeActionAsync(action: any) {
		// Auto Initialize Settings. Because Streamdeck does not.
		const settings = await action.getSettings();
		settings.targetChannel = settings.targetChannel ?? MuteChannels.ClassicMaster;
		settings.showTextComponents = settings.showTextComponents ?? ["channel", "status"];
		await action.setSettings(settings);

		await MuteChannel.updateThisActionAsync(action);
	}

	public override async onWillAppear(ev: WillAppearEvent<MuteChannelSettings>): Promise<void> {
		await MuteChannel.initializeActionAsync(ev.action);
	}

	public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MuteChannelSettings> | any): Promise<void> {
		if (ev.id === undefined)
			await MuteChannel.updateThisActionAsync(ev.action);
	}

	public override async onKeyDown(ev: KeyDownEvent<MuteChannelSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings() as MuteChannelSettings;
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const currentChannel = MuteChannel.getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		const newMuteState = !currentChannel.muted;

		await MuteChannel.updateMuteAsync(localSettings.targetChannel, newMuteState);

		MuteChannel.updateChannelGlobalSettings(globalSettings, localSettings.targetChannel, newMuteState);
		await streamDeck.settings.setGlobalSettings(globalSettings);

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static getChannelFromGlobalSettings(globalSettings: GlobalSettings, targetChannel: MuteChannels): DeviceData {
		switch (targetChannel) {
			case MuteChannels.ClassicMaster:
				return globalSettings.masterChannel;
			case MuteChannels.ClassicGame:
				return globalSettings.gameChannel;
			case MuteChannels.ClassicChat:
				return globalSettings.chatChannel;
			case MuteChannels.ClassicMedia:
				return globalSettings.mediaChannel;
			case MuteChannels.ClassicAux:
				return globalSettings.auxChannel;
			case MuteChannels.ClassicMic:
				return globalSettings.micChannel;
			default:
				throw logErrorAndThrow(logger, `Unknown target channel from global settings: ${targetChannel}`);
		}
	}

	private static updateMuteAsync(targetChannel: MuteChannels, newMuteState: boolean): Promise<void> {
		switch (targetChannel) {
			case MuteChannels.ClassicMaster:
				return sonarClient.setClassicMasterMuteAsync(newMuteState);
			case MuteChannels.ClassicGame:
			case MuteChannels.ClassicChat:
			case MuteChannels.ClassicMedia:
			case MuteChannels.ClassicAux:
			case MuteChannels.ClassicMic:
				return sonarClient.setClassicChannelMuteAsync(newMuteState, ClassicMuteSettingsEnumMap.get(targetChannel)!);
			default:
				throw logErrorAndThrow(logger, `Unknown target channel for muting: ${targetChannel}`);
		}
	}

	private static updateChannelGlobalSettings(
		globalSettings: GlobalSettings,
		targetChannel: MuteChannels,
		newMuteState: boolean) {
		const globalSettingsChannel = this.getChannelFromGlobalSettings(globalSettings, targetChannel);
		globalSettingsChannel.muted = newMuteState;
	}

	private static generateTitle(globalSettings: GlobalSettings, localSettings: MuteChannelSettings): string {
		const currentChannel = MuteChannel.getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);

		const simplifiedChannelName = MuteChannelTranslations.get(localSettings.targetChannel) ?? localSettings.targetChannel;
		const muteStatus = currentChannel.muted ? "Muted" : "Unmuted";

		const showChannel = localSettings.showTextComponents.includes("channel");
		const showStatus = localSettings.showTextComponents.includes("status");

		const output = ""
		+ (showChannel ? `${simplifiedChannelName}\r\n` : "")
		+ (showStatus ? `(${muteStatus})` : "");

		return output.trim();
	}

	private static getImagePath(globalSettings: GlobalSettings, localSettings: MuteChannelSettings): string {
		const basePath = `imgs/actions/mute-channel/`;
		const currentChannel = MuteChannel.getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);

		if (currentChannel.muted)
			return basePath + "key-muted";

		return basePath + "key-unmuted";
	}
}

/**
 * Settings for {@link MuteChannel}.
 */
type MuteChannelSettings = {
	targetChannel: MuteChannels
	showTextComponents: ("channel" | "status")[]
};

enum MuteChannels {
	ClassicMaster = "classic-master",
	ClassicGame = "classic-game",
	ClassicChat = "classic-chat",
	ClassicMedia = "classic-media",
	ClassicAux = "classic-aux",
	ClassicMic = "classic-mic",
}

export const ClassicMuteSettingsEnumMap = new Map<MuteChannels, DeviceRole>([
	[MuteChannels.ClassicGame, DeviceRole.Game],
	[MuteChannels.ClassicChat, DeviceRole.Chat],
	[MuteChannels.ClassicMedia, DeviceRole.Media],
	[MuteChannels.ClassicAux, DeviceRole.Aux],
	[MuteChannels.ClassicMic, DeviceRole.Microphone],
]);

export const MuteChannelTranslations = new Map<MuteChannels, string>([
	[MuteChannels.ClassicMaster, "Master"],
	[MuteChannels.ClassicGame, "Game"],
	[MuteChannels.ClassicChat, "Chat"],
	[MuteChannels.ClassicMedia, "Media"],
	[MuteChannels.ClassicAux, "Aux"],
	[MuteChannels.ClassicMic, "Mic"],
]);
