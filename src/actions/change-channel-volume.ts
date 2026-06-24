import streamDeck from "@elgato/streamdeck";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import sonarClient from "../services/sonar-client";
import { DeviceRole } from "../models/types/sonar-models.type"
import type { GlobalSettings } from "../models/types/global-settings.type";
import type { DeviceData } from "../models/types/device-data.type";

const logger = streamDeck.logger.createScope("output-volume-mixer");

export async function updateVolumeAsync(targetChannel: ChangeChannelVolumeChannels, updatedVolume: number): Promise<void> {
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

export function initializeBase(settings: BaseChangeChannelVolumeSettings) {
	settings.targetChannel = settings.targetChannel ?? ChangeChannelVolumeChannels.ClassicMaster;
	settings.changeChannelValue = settings.changeChannelValue ?? 5;
}

export function getChannelFromGlobalSettings(globalSettings: GlobalSettings, targetChannel: ChangeChannelVolumeChannels): DeviceData {
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

export function updateAudioDeviceGlobalSettings(
	globalSettings: GlobalSettings,
	targetChannel: ChangeChannelVolumeChannels,
	updatedVolume: number) {
	const globalSettingsChannel = getChannelFromGlobalSettings(globalSettings, targetChannel);
	globalSettingsChannel.volume = updatedVolume;
}

export type BaseChangeChannelVolumeSettings = {
	targetChannel: ChangeChannelVolumeChannels,
	changeChannelValue: number,
};

export enum ChangeChannelVolumeChannels {
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
	[ChangeChannelVolumeChannels.StreamPersonalMaster, "Master (Personal)"],
	[ChangeChannelVolumeChannels.StreamPersonalGame, "Game (Personal)"],
	[ChangeChannelVolumeChannels.StreamPersonalChat, "Chat (Personal)"],
	[ChangeChannelVolumeChannels.StreamPersonalMedia, "Media (Personal)"],
	[ChangeChannelVolumeChannels.StreamPersonalAux, "Aux (Personal)"],
	[ChangeChannelVolumeChannels.StreamPersonalMic, "Mic (Personal)"],
	[ChangeChannelVolumeChannels.StreamBroadcastMaster, "Master (StreamMix)"],
	[ChangeChannelVolumeChannels.StreamBroadcastGame, "Game (StreamMix)"],
	[ChangeChannelVolumeChannels.StreamBroadcastChat, "Chat (StreamMix)"],
	[ChangeChannelVolumeChannels.StreamBroadcastMedia, "Media (StreamMix)"],
	[ChangeChannelVolumeChannels.StreamBroadcastAux, "Aux (StreamMix)"],
	[ChangeChannelVolumeChannels.StreamBroadcastMic, "Mic (StreamMix)"],
]);