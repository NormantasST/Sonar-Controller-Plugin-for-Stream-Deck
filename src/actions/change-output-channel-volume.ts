import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import { GlobalSettings } from "../models/types/global-settings.type";
import { CHANGE_OUTPUT_CHANNEL_VOLUME } from "../constants/action-uuids.constants";

const logger = streamDeck.logger.createScope("change-output-channel-volume");

@action({ UUID: CHANGE_OUTPUT_CHANNEL_VOLUME })
export class ChangeOutputChannelVolume extends SingletonAction<ChangeChannelVolumeSettings> implements INotifyableAction {
	static async updateThisAction(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await action.getSettings();

		await action.setTitle("TODO");
	}

	async notifyRelatedActions(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		streamDeck.actions.forEach(async (action) => {
			switch (action.manifestId) {
				case CHANGE_OUTPUT_CHANNEL_VOLUME:
					await ChangeOutputChannelVolume.updateThisAction(action);
					break;
			}
		});
	}

	override async onWillAppear(ev: WillAppearEvent<ChangeChannelVolumeSettings>): Promise<void> {
		await ChangeOutputChannelVolume.initializeActionAsync(ev.action);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ChangeChannelVolumeSettings> | any): Promise<void> {
		if (ev.id === undefined)
			await ChangeOutputChannelVolume.updateThisAction(ev.action);
	}

	override async onKeyDown(ev: KeyDownEvent<ChangeChannelVolumeSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		// TODO Add Logic for Changing

		await this.notifyRelatedActions(globalSettings);
	}

	static async initializeActionAsync(action: any) {
		await ChangeOutputChannelVolume.updateThisAction(action);
	}

}

/**
 * Settings for {@link ChangeOutputChannelVolume}.
 */
type ChangeChannelVolumeSettings = {
	targetChannel: ChangeChannelVolumeChannels,
	mode: ChangeChannelVolumeModes,
	changeChannelValue: number,
};

enum ChangeChannelVolumeChannels {
	ClassicMaster = "master",
	ClassicGame = "game"
}

enum ChangeChannelVolumeModes {
	IncreaseVolume = "master",
	DecreaseVolume = "game"
}