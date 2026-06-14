import type { DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { ACTION_VOLUME_MIXER as ACTION_OUTPUT_VOLUME_MIXER, DIAL_VOLUME_MIXER } from "../constants/action-uuids.constants";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import type { BaseChangeChannelVolumeSettings} from "./change-channel-volume";
import { getChannelFromGlobalSettings, initializeBase, updateAudioDeviceGlobalSettings, updateVolumeAsync, VolumeChannelTranslations } from "./change-channel-volume";
import { DialChangeChannelVolume } from "./change-channel-volume.dial";

const logger = streamDeck.logger.createScope("output-volume-mixer-action");

@action({ UUID: ACTION_OUTPUT_VOLUME_MIXER })
export class ActionChangeChannelVolume extends SingletonAction<ActionChangeChannelVolumeSettings> implements INotifyableAction {
	public static async updateThisActionAsync(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await action.getSettings() as ActionChangeChannelVolumeSettings;

		await action.setTitle(ActionChangeChannelVolume.generateTitle(globalSettings, localSettings));
		await action.setImage(ActionChangeChannelVolume.getImagePath(globalSettings, localSettings));
	}

	public async notifyRelatedActionsAsync(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		await Promise.all(streamDeck.actions.map(async (action) => {
			switch (action.manifestId) {
				case ACTION_OUTPUT_VOLUME_MIXER:
					return ActionChangeChannelVolume.updateThisActionAsync(action);
				case DIAL_VOLUME_MIXER:
					return DialChangeChannelVolume.updateThisActionAsync(action);
			}
		}));
	}

	private static async initializeAsync(action: any) {
		// Auto Initialize Settings. Because Streamdeck does not.
		const settings = await action.getSettings();
		initializeBase(settings);
		settings.mode = settings.mode ?? ChangeChannelVolumeModes.IncreaseVolume;
		settings.showTextComponents = settings.showTextComponents ?? ["mode", "channel", "output"];
		await action.setSettings(settings);

		await ActionChangeChannelVolume.updateThisActionAsync(action);
	}

	public override async onWillAppear(ev: WillAppearEvent<ActionChangeChannelVolumeSettings>): Promise<void> {
		await ActionChangeChannelVolume.initializeAsync(ev.action);
	}

	public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ActionChangeChannelVolumeSettings> | any): Promise<void> {
		if (ev.id === undefined)
			await ActionChangeChannelVolume.updateThisActionAsync(ev.action);
	}

	public override async onKeyDown(ev: KeyDownEvent<ActionChangeChannelVolumeSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings() as ActionChangeChannelVolumeSettings;
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const updatedVolume = ActionChangeChannelVolume.getButtonUpdatedVolume(localSettings, globalSettings);
		await updateVolumeAsync(localSettings.targetChannel, updatedVolume);

		updateAudioDeviceGlobalSettings(globalSettings, localSettings.targetChannel, updatedVolume);
		await streamDeck.settings.setGlobalSettings(globalSettings);

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static getButtonUpdatedVolume(localSettings: ActionChangeChannelVolumeSettings, globalSettings: GlobalSettings): number {
		if (localSettings.mode === ChangeChannelVolumeModes.SetVolumeTo)
			return localSettings.changeChannelValue / 100;

		const currentChannel = getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
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

	private static generateTitle(globalSettings: GlobalSettings, localSettings: ActionChangeChannelVolumeSettings): string {
		const currentChannel = getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
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
					+ (showOutput ? `(${Math.round(currentChannel.volume * 100)}%)` : "");
				return changeVolumeTitle.trim();
			default:
				throw logErrorAndThrow(logger, `Unknown mode for generating title: ${localSettings.mode}`);
		}
	}

	private static getImagePath(globalSettings: GlobalSettings, localSettings: ActionChangeChannelVolumeSettings): string {
		const basePath = `imgs/actions/change-channel-volume/`;
		if (localSettings.mode === ChangeChannelVolumeModes.SetVolumeTo)
			return basePath + "key-set-to";

		const volume = getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel).volume ?? 0;
		logger.info(`Volume ${volume} mode: ${localSettings.mode}`);
		if (localSettings.mode === ChangeChannelVolumeModes.IncreaseVolume) {
			if (volume == 1) // 100
				return basePath + "key-100";

			if (volume >= 0.70 && volume < 1) // From 65 to 100
				return basePath + "key-75";

			if (volume >= 0.50 && volume < 0.70) // From 50 to 65
				return basePath + "key-60";

			if (volume < 0.50) // Under 50
				return basePath + "key-increase-empty";
		}

		if (localSettings.mode === ChangeChannelVolumeModes.DecreaseVolume) {
			if (volume >= 0.50) // Over 50
				return basePath + "key-decrease-empty";

			if (volume > 0.30 && volume < 0.50) // from 50 to 35
				return basePath + "key-40";

			if (volume > 0 && volume <= 0.30) // From 0 to 35
				return basePath + "key-25";

			if (volume == 0) // 0
				return basePath + "key-0";
		}

		throw logErrorAndThrow(logger, `Unknown mode for generating image path: ${localSettings.mode}`);
	}
}

/**
 * Settings for {@link ActionChangeChannelVolume}.
 */
type ActionChangeChannelVolumeSettings = BaseChangeChannelVolumeSettings & {
	mode: ChangeChannelVolumeModes,
	showTextComponents: ("mode" | "channel" | "output")[]
};

enum ChangeChannelVolumeModes {
	SetVolumeTo = "setVolumeTo",
	IncreaseVolume = "increase",
	DecreaseVolume = "decrease"
}