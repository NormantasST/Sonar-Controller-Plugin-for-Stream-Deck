import type { DialRotateEvent, TouchTapEvent } from "@elgato/streamdeck";
import streamDeck, { action } from "@elgato/streamdeck";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { ACTION_MUTE_CHANNEL, ACTION_VOLUME_MIXER, DIAL_VOLUME_MIXER } from "../constants/action-uuids.constants";
import type { BaseChangeChannelVolumeSettings} from "./change-channel-volume";
import { ChangeChannelVolumeChannels, ClassicVolumeSettingsEnumMap, getChannelFromGlobalSettings, initializeBase, updateAudioDeviceGlobalSettings, updateVolumeAsync, VolumeChannelTranslations } from "./change-channel-volume";
import sonarClient from "../services/sonar-client";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import { StreamDeviceRole } from "../models/types/sonar-models.type";
import type { VisibleAction } from "./base/sonar-action";
import { SonarAction } from "./base/sonar-action";

const logger = streamDeck.logger.createScope("output-volume-mixer-dial");

@action({ UUID: DIAL_VOLUME_MIXER })
export class DialChangeChannelVolume extends SonarAction<BaseChangeChannelVolumeSettings> {
	protected override readonly relatedActionUuids = [DIAL_VOLUME_MIXER, ACTION_VOLUME_MIXER, ACTION_MUTE_CHANNEL];

	protected override applyDefaultSettings(settings: BaseChangeChannelVolumeSettings): void {
		initializeBase(settings);
	}

	protected override async refreshActionAsync(action: VisibleAction<BaseChangeChannelVolumeSettings>, globalSettings: GlobalSettings, localSettings: BaseChangeChannelVolumeSettings): Promise<void> {
		await action.setTitle(DialChangeChannelVolume.generateTitle(globalSettings, localSettings));

		if (action.isDial()){
			const currentChanel = getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
			logger.info(`Updating dial feedback with volume: ${currentChanel.volume}`);
			await action.setFeedback({
				icon: DialChangeChannelVolume.getIcon(globalSettings, localSettings),
				indicator: {
					value: currentChanel.volume * 100,
				},
			});
		}
	}

	public override async onDialRotate(ev: DialRotateEvent<BaseChangeChannelVolumeSettings>): Promise<void> {
		logger.info(`Dial Rotate with settings: ${JSON.stringify(ev)}`);

		const localSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const currentChanel = getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		const updatedVolume = DialChangeChannelVolume.calculateUpdatedVolume(currentChanel.volume, ev.payload.ticks, localSettings.changeChannelValue);

		await updateVolumeAsync(localSettings.targetChannel, updatedVolume);

		updateAudioDeviceGlobalSettings(globalSettings, localSettings.targetChannel, updatedVolume);

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	public override async onTouchTap(ev: TouchTapEvent<BaseChangeChannelVolumeSettings>): Promise<void> {
		logger.info(`Dial Touch with settings: ${JSON.stringify(ev)}`);

		const localSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const currentChanel = getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		const newMuteState = !currentChanel.muted;

		await DialChangeChannelVolume.updateMuteAsync(localSettings.targetChannel, newMuteState);

		currentChanel.muted = newMuteState;

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static calculateUpdatedVolume(currentVolume: number, ticks: number, changeValue: number): number{
		return Math.min(Math.max(currentVolume += (ticks * changeValue) / 100, 0), 1);
	}

	private static getIcon(globalSettings: GlobalSettings, localSettings: BaseChangeChannelVolumeSettings) {
		const channelData = getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		const basePath = `imgs/actions/change-channel-volume/`;

		if (channelData.muted)
			return `${basePath}icon-muted`;

		return `${basePath}icon`;
	}

	private static generateTitle(globalSettings: GlobalSettings, localSettings: BaseChangeChannelVolumeSettings): string {
		const channelName = VolumeChannelTranslations.get(localSettings.targetChannel) ?? localSettings.targetChannel;

		const channelData = getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		const isMutedText = channelData.muted ? " (M)" : "";

		return `${channelName} ${isMutedText}`.trim();
	}

	private static updateMuteAsync(targetChannel: ChangeChannelVolumeChannels, newMuteState: boolean): Promise<void> {
		switch (targetChannel) {
			case ChangeChannelVolumeChannels.ClassicMaster:
				return sonarClient.setClassicMasterMuteAsync(newMuteState);
			case ChangeChannelVolumeChannels.ClassicGame:
			case ChangeChannelVolumeChannels.ClassicChat:
			case ChangeChannelVolumeChannels.ClassicMedia:
			case ChangeChannelVolumeChannels.ClassicAux:
			case ChangeChannelVolumeChannels.ClassicMic:
				return sonarClient.setClassicChannelMuteAsync(newMuteState, ClassicVolumeSettingsEnumMap.get(targetChannel)!);
			case ChangeChannelVolumeChannels.StreamPersonalMaster:
				return sonarClient.setStreamMasterMuteAsync(newMuteState, StreamDeviceRole.Monitoring);
			case ChangeChannelVolumeChannels.StreamPersonalGame:
			case ChangeChannelVolumeChannels.StreamPersonalChat:
			case ChangeChannelVolumeChannels.StreamPersonalMedia:
			case ChangeChannelVolumeChannels.StreamPersonalAux:
			case ChangeChannelVolumeChannels.StreamPersonalMic:
				return sonarClient.setStreamChannelMuteAsync(newMuteState, ClassicVolumeSettingsEnumMap.get(targetChannel)!, StreamDeviceRole.Monitoring);
			case ChangeChannelVolumeChannels.StreamBroadcastMaster:
				return sonarClient.setStreamMasterMuteAsync(newMuteState, StreamDeviceRole.Streaming);
			case ChangeChannelVolumeChannels.StreamBroadcastGame:
			case ChangeChannelVolumeChannels.StreamBroadcastChat:
			case ChangeChannelVolumeChannels.StreamBroadcastMedia:
			case ChangeChannelVolumeChannels.StreamBroadcastAux:
			case ChangeChannelVolumeChannels.StreamBroadcastMic:
				return sonarClient.setStreamChannelMuteAsync(newMuteState, ClassicVolumeSettingsEnumMap.get(targetChannel)!, StreamDeviceRole.Streaming);
			default:
				throw logErrorAndThrow(logger, `Unknown target channel for muting: ${targetChannel}`);
		}
	}
}
