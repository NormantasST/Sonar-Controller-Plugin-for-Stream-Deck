import type { DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { MUTE_CHANNEL } from "../constants/action-uuids.constants";
import type { DeviceData } from "../models/types/device-data.type";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import sonarClient from "../services/sonar-client";
import { DeviceRole, StreamDeviceRole } from "../models/types/sonar-models.type"
import { wrapText } from "../helpers/plugin-helper";

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
			case MuteChannels.StreamPersonalMaster:
				return globalSettings.streamMasterPersonal;
			case MuteChannels.StreamPersonalGame:
				return globalSettings.streamGamePersonal;
			case MuteChannels.StreamPersonalChat:
				return globalSettings.streamChatPersonal;
			case MuteChannels.StreamPersonalMedia:
				return globalSettings.streamMediaPersonal;
			case MuteChannels.StreamPersonalAux:
				return globalSettings.streamAuxPersonal;
			case MuteChannels.StreamPersonalMic:
				return globalSettings.streamMicPersonal;
			case MuteChannels.StreamBroadcastMaster:
				return globalSettings.streamMasterBroadcast;
			case MuteChannels.StreamBroadcastGame:
				return globalSettings.streamGameBroadcast;
			case MuteChannels.StreamBroadcastChat:
				return globalSettings.streamChatBroadcast;
			case MuteChannels.StreamBroadcastMedia:
				return globalSettings.streamMediaBroadcast;
			case MuteChannels.StreamBroadcastAux:
				return globalSettings.streamAuxBroadcast;
			case MuteChannels.StreamBroadcastMic:
				return globalSettings.streamMicBroadcast;
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
			case MuteChannels.StreamPersonalMaster:
				return sonarClient.setStreamMasterMuteAsync(newMuteState, StreamDeviceRole.Monitoring);
			case MuteChannels.StreamPersonalGame:
			case MuteChannels.StreamPersonalChat:
			case MuteChannels.StreamPersonalMedia:
			case MuteChannels.StreamPersonalAux:
			case MuteChannels.StreamPersonalMic:
				return sonarClient.setStreamChannelMuteAsync(newMuteState, ClassicMuteSettingsEnumMap.get(targetChannel)!, StreamDeviceRole.Monitoring);
			case MuteChannels.StreamBroadcastMaster:
				return sonarClient.setStreamMasterMuteAsync(newMuteState, StreamDeviceRole.Streaming);
			case MuteChannels.StreamBroadcastGame:
			case MuteChannels.StreamBroadcastChat:
			case MuteChannels.StreamBroadcastMedia:
			case MuteChannels.StreamBroadcastAux:
			case MuteChannels.StreamBroadcastMic:
				return sonarClient.setStreamChannelMuteAsync(newMuteState, ClassicMuteSettingsEnumMap.get(targetChannel)!, StreamDeviceRole.Streaming);
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

		return wrapText(output.trim(), 7);
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
	StreamPersonalGame = "stream-game-personal",
	StreamPersonalChat = "stream-chat-personal",
	StreamPersonalMaster = "stream-master-personal",
	StreamPersonalMedia = "stream-media-personal",
	StreamPersonalAux = "stream-aux-personal",
	StreamPersonalMic = "stream-mic-personal",
	StreamBroadcastGame = "stream-game-broadcast",
	StreamBroadcastChat = "stream-chat-broadcast",
	StreamBroadcastMaster = "stream-master-broadcast",
	StreamBroadcastMedia = "stream-media-broadcast",
	StreamBroadcastAux = "stream-aux-broadcast",
	StreamBroadcastMic = "stream-mic-broadcast",
}

export const ClassicMuteSettingsEnumMap = new Map<MuteChannels, DeviceRole>([
	[MuteChannels.ClassicGame, DeviceRole.Game],
	[MuteChannels.ClassicChat, DeviceRole.Chat],
	[MuteChannels.ClassicMedia, DeviceRole.Media],
	[MuteChannels.ClassicAux, DeviceRole.Aux],
	[MuteChannels.ClassicMic, DeviceRole.Microphone],
	[MuteChannels.StreamPersonalGame, DeviceRole.Game],
	[MuteChannels.StreamPersonalChat, DeviceRole.Chat],
	[MuteChannels.StreamPersonalMedia, DeviceRole.Media],
	[MuteChannels.StreamPersonalAux, DeviceRole.Aux],
	[MuteChannels.StreamPersonalMic, DeviceRole.Microphone],
	[MuteChannels.StreamBroadcastGame, DeviceRole.Game],
	[MuteChannels.StreamBroadcastChat, DeviceRole.Chat],
	[MuteChannels.StreamBroadcastMedia, DeviceRole.Media],
	[MuteChannels.StreamBroadcastAux, DeviceRole.Aux],
	[MuteChannels.StreamBroadcastMic, DeviceRole.Microphone],
]);

export const MuteChannelTranslations = new Map<MuteChannels, string>([
	[MuteChannels.ClassicMaster, "Master"],
	[MuteChannels.ClassicGame, "Game"],
	[MuteChannels.ClassicChat, "Chat"],
	[MuteChannels.ClassicMedia, "Media"],
	[MuteChannels.ClassicAux, "Aux"],
	[MuteChannels.ClassicMic, "Mic"],
	[MuteChannels.StreamPersonalMaster, "Master Personal"],
	[MuteChannels.StreamPersonalGame, "Game Personal"],
	[MuteChannels.StreamPersonalChat, "Chat Personal"],
	[MuteChannels.StreamPersonalMedia, "Media Personal"],
	[MuteChannels.StreamPersonalAux, "Aux Personal"],
	[MuteChannels.StreamPersonalMic, "Mic Personal"],
	[MuteChannels.StreamBroadcastMaster, "Master StreamMix"],
	[MuteChannels.StreamBroadcastGame, "Game StreamMix"],
	[MuteChannels.StreamBroadcastChat, "Chat StreamMix"],
	[MuteChannels.StreamBroadcastMedia, "Media StreamMix"],
	[MuteChannels.StreamBroadcastAux, "Aux StreamMix"],
	[MuteChannels.StreamBroadcastMic, "Mic StreamMix"],
]);
