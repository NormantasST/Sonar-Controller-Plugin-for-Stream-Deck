import type { DialRotateEvent, DidReceiveSettingsEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { ACTION_MUTE_CHANNEL, ACTION_VOLUME_MIXER, DIAL_VOLUME_MIXER } from "../constants/action-uuids.constants";
import type { BaseChangeChannelVolumeSettings} from "./change-channel-volume";
import { getChannelFromGlobalSettings, initializeBase, updateAudioDeviceGlobalSettings, updateVolumeAsync, VolumeChannelTranslations } from "./change-channel-volume";
import { ActionChangeChannelVolume } from "./change-channel-volume.action";
import { ActionMuteChannel } from "./mute-channel";

const logger = streamDeck.logger.createScope("output-volume-mixer-dial");

@action({ UUID: DIAL_VOLUME_MIXER })
export class DialChangeChannelVolume extends SingletonAction<BaseChangeChannelVolumeSettings> implements INotifyableAction {
	public static async updateThisActionAsync(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await action.getSettings() as BaseChangeChannelVolumeSettings;

		await action.setTitle(DialChangeChannelVolume.generateTitle(globalSettings, localSettings));

		if (action.isDial()){
			const currentChanel = getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
			
			logger.info(`Updating dial feedback with volume: ${currentChanel.volume}`);
			await action.setFeedback({
				indicator: {
					value: currentChanel.volume * 100,
				},
			});
		}
	}

	public async notifyRelatedActionsAsync(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		await Promise.all(streamDeck.actions.map(async (action) => {
			switch (action.manifestId) {
				case DIAL_VOLUME_MIXER:
					return DialChangeChannelVolume.updateThisActionAsync(action);
				case ACTION_VOLUME_MIXER:
					return ActionChangeChannelVolume.updateThisActionAsync(action);
				case ACTION_MUTE_CHANNEL:
					return ActionMuteChannel.updateThisActionAsync(action);
			}
		}));
	}

	private static async initializeAsync(action: any) {
		// Auto Initialize Settings. Because Streamdeck does not.
		const settings = await action.getSettings();
		initializeBase(settings);
		await action.setSettings(settings);

		await DialChangeChannelVolume.updateThisActionAsync(action);
	}

	public override async onWillAppear(ev: WillAppearEvent<BaseChangeChannelVolumeSettings>): Promise<void> {
		await DialChangeChannelVolume.initializeAsync(ev.action);
	}

	public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<BaseChangeChannelVolumeSettings> | any): Promise<void> {
		if (ev.id === undefined)
			await DialChangeChannelVolume.updateThisActionAsync(ev.action);
	}

	public override async onDialRotate(ev: DialRotateEvent<BaseChangeChannelVolumeSettings>): Promise<void> {
		logger.info(`Dial Rotate with settings: ${JSON.stringify(ev)}`);

		const localSettings = await ev.action.getSettings() as BaseChangeChannelVolumeSettings;
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const currentChanel = getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		const updatedVolume = DialChangeChannelVolume.calculateUpdatedVolume(currentChanel.volume, ev.payload.ticks, localSettings.changeChannelValue);

		await updateVolumeAsync(localSettings.targetChannel, updatedVolume);

		updateAudioDeviceGlobalSettings(globalSettings, localSettings.targetChannel, updatedVolume);
		await streamDeck.settings.setGlobalSettings(globalSettings);

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static calculateUpdatedVolume(currentVolume: number, ticks: number, changeValue: number): number{
		return Math.min(Math.max(currentVolume += (ticks * changeValue) / 100, 0), 1);
	}

	private static generateTitle(globalSettings: GlobalSettings, localSettings: BaseChangeChannelVolumeSettings): any {
		return VolumeChannelTranslations.get(localSettings.targetChannel) ?? localSettings.targetChannel;
	}
}