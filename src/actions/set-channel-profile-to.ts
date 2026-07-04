import type { DidReceiveSettingsEvent, KeyDownEvent, SendToPluginEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { ACTION_SET_CHANNEL_PROFILE_TO } from "../constants/action-uuids.constants";
import type { ExpandedDeviceData } from "../models/types/device-data.type";
import sonarClient from "../services/sonar-client";
import type { JsonObject, JsonValue } from "@elgato/utils";
import type { ConfigResponse} from "../models/types/sonar-models.type";
import { DeviceRole } from "../models/types/sonar-models.type";
import { wrapText } from "../helpers/plugin-helper";

const logger = streamDeck.logger.createScope("set-profile-to");

@action({ UUID: ACTION_SET_CHANNEL_PROFILE_TO })
export class ActionSetChannelProfileTo extends SingletonAction<SetProfileToSettings> implements INotifyableAction {
	public static async updateThisActionAsync(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await action.getSettings() as SetProfileToSettings;

		await action.setTitle(await ActionSetChannelProfileTo.generateTitleAsync(localSettings));
		await action.setImage(ActionSetChannelProfileTo.getImagePath(globalSettings, localSettings));
	}

	public async notifyRelatedActionsAsync(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		await Promise.all(streamDeck.actions.map(async (action) => {
			switch (action.manifestId) {
				case ACTION_SET_CHANNEL_PROFILE_TO:
					return ActionSetChannelProfileTo.updateThisActionAsync(action);
			}
		}));
	}

	private static async initializeActionAsync(action: any) {
		// Auto Initialize Settings. Because Streamdeck does not.
		const settings = await action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		settings.targetChannel = settings.targetChannel ?? SetProfileToChannels.Game;
		settings.targetProfileId = settings.targetProfileId ?? ActionSetChannelProfileTo.getCurrentChannelProfile(globalSettings, settings.targetChannel);
		await action.setSettings(settings);

		await ActionSetChannelProfileTo.updateThisActionAsync(action);
	}

	public override async onWillAppear(ev: WillAppearEvent<SetProfileToSettings>): Promise<void> {
		await ActionSetChannelProfileTo.initializeActionAsync(ev.action);
	}

	public previousChannel: SetProfileToChannels | undefined = undefined;
	public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SetProfileToSettings> | any): Promise<void> {
		logger.info("Called: onDidReceiveSettings");
		const localSettings = await ev.action.getSettings() as SetProfileToSettings;

		// Selected Channel has Changed. Update available profiles.
		if (this.previousChannel !== localSettings.targetChannel) {
			const allProfiles = await sonarClient.getConfigsAsync();
			await ActionSetChannelProfileTo.updateAvailableProfilesUIAsync(localSettings.targetChannel, allProfiles);

			// if profile does not exist or belong to device reset to current selected profile for that channel.
			const currentProfile = allProfiles.find((x) => x.id == localSettings.targetProfileId);
			if (currentProfile === undefined || currentProfile.virtualAudioDevice !== ProfileChannelTranslations.get(localSettings.targetChannel)) {
				const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
				localSettings.targetProfileId = ActionSetChannelProfileTo.getCurrentChannelProfile(globalSettings, localSettings.targetChannel);
				await ev.action.setSettings(localSettings);
			}
		}

		if (ev.id === undefined)
			await ActionSetChannelProfileTo.updateThisActionAsync(ev.action);

		this.previousChannel = localSettings.targetChannel;
	}

	public override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, JsonObject>): Promise<void> {
		const localSettings = await ev.action.getSettings() as SetProfileToSettings;

		if (ev.payload instanceof Object && "event" in ev.payload && ev.payload.event === "getProfiles") 
			await ActionSetChannelProfileTo.updateAvailableProfilesUIAsync(localSettings.targetChannel);

	}

	public override async onKeyDown(ev: KeyDownEvent<SetProfileToSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings() as SetProfileToSettings;
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		// Set Current Channel Profile to Target Profile
		const targetChannel = ActionSetChannelProfileTo.getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		targetChannel.profileId = localSettings.targetProfileId;
		await streamDeck.settings.setGlobalSettings(globalSettings);

		// Update Profile on Sonar
		await Promise.all([
			sonarClient.selectConfigAsync(localSettings.targetProfileId),
			this.notifyRelatedActionsAsync(globalSettings),
		]);
	}

	private static async updateAvailableProfilesUIAsync(targetChannel: SetProfileToChannels, allProfiles?: ConfigResponse[]): Promise<void> {
		allProfiles = allProfiles ?? (await sonarClient.getConfigsAsync())
		await streamDeck.ui.sendToPropertyInspector({
		event: "getProfiles",
		items: allProfiles
			.filter((x) => x.virtualAudioDevice == ProfileChannelTranslations.get(targetChannel))
			.toSorted((left, right) =>
				(left.isPreset === right.isPreset ? 0 : left.isPreset ? 1 : -1) ||
				left.name.localeCompare(right.name))
			.map((x) => ({
				label: x.name,
				value: x.id
			}))
		});
	}

	private static getCurrentChannelProfile(globalSettings: GlobalSettings, targetChannel: SetProfileToChannels): string {
		return ActionSetChannelProfileTo.getChannelFromGlobalSettings(globalSettings, targetChannel).profileId
	}

	private static getChannelFromGlobalSettings(globalSettings: GlobalSettings, targetChannel: SetProfileToChannels): ExpandedDeviceData {
		switch (targetChannel) {
			case SetProfileToChannels.Game:
				return globalSettings.gameChannel;
			case SetProfileToChannels.Chat:
				return globalSettings.chatChannel;
			case SetProfileToChannels.Media:
				return globalSettings.mediaChannel;
			case SetProfileToChannels.Aux:
				return globalSettings.auxChannel;
			case SetProfileToChannels.Mic:
				return globalSettings.micChannel;
		}
	}

	private static async generateTitleAsync(localSettings: SetProfileToSettings): Promise<string> {
		const channelName = SetProfileToChannelsTranslations.get(localSettings.targetChannel) ?? "Unknown";
		const profileName = (await sonarClient.getConfigsAsync()).find((x) => x.id == localSettings.targetProfileId)?.name ?? "Unknown";
		return wrapText(`${channelName}: ${profileName}`);
	}

	private static getImagePath(globalSettings: GlobalSettings, localSettings: SetProfileToSettings): string {
		const basePath = `imgs/actions/set-channel-profile-to/`;

		const currentChannel = ActionSetChannelProfileTo.getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		if (currentChannel.profileId === localSettings.targetProfileId)
			return basePath + "key-enabled";

		return basePath + "key";
	}
}

enum SetProfileToChannels {
	Game = "game",
	Chat = "chat",
	Media = "media",
	Aux = "aux",
	Mic = "mic",
}

export const SetProfileToChannelsTranslations = new Map<SetProfileToChannels, string>([
	[SetProfileToChannels.Game, "Game"],
	[SetProfileToChannels.Chat, "Chat"],
	[SetProfileToChannels.Media, "Media"],
	[SetProfileToChannels.Aux, "Aux"],
	[SetProfileToChannels.Mic, "Mic"],
]);

export const ProfileChannelTranslations = new Map<SetProfileToChannels, DeviceRole>([
	[SetProfileToChannels.Game, DeviceRole.Game],
	[SetProfileToChannels.Chat, DeviceRole.Chat],
	[SetProfileToChannels.Media, DeviceRole.Media],
	[SetProfileToChannels.Aux, DeviceRole.Aux],
	[SetProfileToChannels.Mic, DeviceRole.Microphone],
]);

/**
 * Settings for {@link SetProfileToSettings}.
 */
type SetProfileToSettings = {
	targetChannel: SetProfileToChannels,
	targetProfileId: string
};
