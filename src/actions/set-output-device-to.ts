import type { DidReceiveSettingsEvent, KeyDownEvent, SendToPluginEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { ROTATE_OUTPUT_DEVICES, ACTION_SET_OUTPUT_DEVICE_TO } from "../constants/action-uuids.constants";
import sonarClient from "../services/sonar-client";
import type { JsonObject, JsonValue } from "@elgato/utils";
import { DeviceDataFlow, type AudioDevice} from "../models/types/sonar-models.type";
import { RotateOutputAudioDevice } from "./rotate-audio-output-device";

// const logger = streamDeck.logger.createScope("set-profile-to");

@action({ UUID: ACTION_SET_OUTPUT_DEVICE_TO })
export class ActionSetChannelProfileTo extends SingletonAction<SetOutputDeviceToSettings> implements INotifyableAction {
	public static async updateThisActionAsync(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await action.getSettings() as SetOutputDeviceToSettings;

		await action.setTitle(await ActionSetChannelProfileTo.generateTitleAsync());
		await action.setImage(ActionSetChannelProfileTo.getImagePath(globalSettings, localSettings));
	}

	public async notifyRelatedActionsAsync(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		await Promise.all(streamDeck.actions.map(async (action) => {
			switch (action.manifestId) {
				case ACTION_SET_OUTPUT_DEVICE_TO:
					return ActionSetChannelProfileTo.updateThisActionAsync(action);
				case ROTATE_OUTPUT_DEVICES:
					return RotateOutputAudioDevice.updateThisActionAsync(action);
			}
		}));
	}

	private static async initializeActionAsync(action: any) {
		// Auto Initialize Settings. Because Streamdeck does not.
		const settings = await action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		settings.setDeviceMode = settings.targetChannel ?? SetOutputDeviceModes.AllAutoDetect;
		settings.targetedDeviceId = settings.targetProfileId ?? globalSettings.gameChannel.deviceId;
		await action.setSettings(settings);

		await ActionSetChannelProfileTo.updateThisActionAsync(action);
	}

	public override async onWillAppear(ev: WillAppearEvent<SetOutputDeviceToSettings>): Promise<void> {
		await ActionSetChannelProfileTo.initializeActionAsync(ev.action);
	}

	public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SetOutputDeviceToSettings> | any): Promise<void> {
		if (ev.id === undefined)
			await ActionSetChannelProfileTo.updateThisActionAsync(ev.action);
	}

	public override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, JsonObject>): Promise<void> {
		if (ev.payload instanceof Object && "event" in ev.payload && ev.payload.event === "getProfiles") 
			await ActionSetChannelProfileTo.updateAvailableProfilesUIAsync();
	}

	public override async onKeyDown(ev: KeyDownEvent<SetOutputDeviceToSettings>): Promise<void> {
		await ev.action.getSettings() as SetOutputDeviceToSettings;
		await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		// TODO
	}

	private static async updateAvailableProfilesUIAsync(allDevices?: AudioDevice[]): Promise<void> {
		allDevices = allDevices ?? (await sonarClient.getAllAudioDevicesAsync())
		await streamDeck.ui.sendToPropertyInspector({
		event: "getProfiles",
		items: allDevices
			.filter(x => x.dataFlow === DeviceDataFlow.Render)
			.toSorted((left, right) => (left.friendlyName.localeCompare(right.friendlyName)))
			.map((x) => ({
				label: x.friendlyName,
				value: x.id
			}))
		});
	}

	private static async generateTitleAsync(): Promise<string> {
		// TOOD
		return "TODO";
	}

	private static getImagePath(globalSettings: GlobalSettings, localSettings: SetOutputDeviceToSettings): string {
		const basePath = `imgs/actions/set-channel-profile-to/`;

		const currentChannel = ActionSetChannelProfileTo.getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		if (currentChannel.profileId === localSettings.targetProfileId)
			return basePath + "key-enabled";

		return basePath + "key";
	}
}

/**
 * Settings for {@link RotateOutputAudioDevice}.
 */
type SetOutputDeviceToSettings = {
	setDeviceMode: SetOutputDeviceModes,
	targetedDeviceId: number,
};

enum SetOutputDeviceModes {
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