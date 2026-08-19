import type { DidReceiveSettingsEvent, KeyDownEvent, SendToPluginEvent } from "@elgato/streamdeck";
import streamDeck, { action } from "@elgato/streamdeck";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { ACTION_SET_CHANNEL_PROFILE_TO } from "../constants/action-uuids.constants";
import type { ExpandedDeviceData } from "../models/types/device-data.type";
import sonarClient from "../services/sonar-client";
import type { JsonObject, JsonValue } from "@elgato/utils";
import type { ConfigResponse} from "../models/types/sonar-models.type";
import { DeviceRole } from "../models/types/sonar-models.type";
import { wrapText } from "../helpers/plugin-helper";
import type { VisibleAction } from "./base/sonar-action";
import { SonarAction } from "./base/sonar-action";

const logger = streamDeck.logger.createScope("set-profile-to");

@action({ UUID: ACTION_SET_CHANNEL_PROFILE_TO })
export class ActionSetChannelProfileTo extends SonarAction<SetProfileToSettings> {
	protected override readonly relatedActionUuids = [ACTION_SET_CHANNEL_PROFILE_TO];

	protected override applyDefaultSettings(settings: SetProfileToSettings, globalSettings: GlobalSettings): void {
		settings.targetChannel = settings.targetChannel ?? SetProfileToChannels.Game;
		settings.targetProfileId = settings.targetProfileId ?? ActionSetChannelProfileTo.getCurrentChannelProfile(globalSettings, settings.targetChannel);
	}

	protected override async refreshActionAsync(action: VisibleAction<SetProfileToSettings>, globalSettings: GlobalSettings, localSettings: SetProfileToSettings): Promise<void> {
		await action.setTitle(await ActionSetChannelProfileTo.generateTitleAsync(localSettings));
		await action.setImage(ActionSetChannelProfileTo.getImagePath(globalSettings, localSettings));
	}

	public previousChannel: SetProfileToChannels | undefined = undefined;
	public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SetProfileToSettings>): Promise<void> {
		logger.info("Called: onDidReceiveSettings");
		const localSettings = ev.payload.settings;

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

		await super.onDidReceiveSettings(ev);

		this.previousChannel = localSettings.targetChannel;
	}

	public override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, JsonObject>): Promise<void> {
		const localSettings = await ev.action.getSettings<SetProfileToSettings>();

		if (ev.payload instanceof Object && "event" in ev.payload && ev.payload.event === "getProfiles")
			await ActionSetChannelProfileTo.updateAvailableProfilesUIAsync(localSettings.targetChannel);
	}

	public override async onKeyDown(ev: KeyDownEvent<SetProfileToSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		// Set Current Channel Profile to Target Profile
		const targetChannel = ActionSetChannelProfileTo.getChannelFromGlobalSettings(globalSettings, localSettings.targetChannel);
		targetChannel.profileId = localSettings.targetProfileId;

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
 * Settings for {@link ActionSetChannelProfileTo}.
 */
type SetProfileToSettings = {
	targetChannel: SetProfileToChannels,
	targetProfileId: string
};
