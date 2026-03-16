import type { DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { CHAT_MIX_CONTROLLER } from "../constants/action-uuids.constants";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import sonarClient from "../services/sonar-client";

const logger = streamDeck.logger.createScope("chat-mix-controller");

@action({ UUID: CHAT_MIX_CONTROLLER })
export class ChatMixController extends SingletonAction<ChatMixControllerSettings> implements INotifyableAction {
	public static async updateThisActionAsync(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await action.getSettings() as ChatMixControllerSettings;

		await action.setTitle(ChatMixController.generateTitle(globalSettings, localSettings));
		await action.setImage(ChatMixController.getImagePath(globalSettings, localSettings));
	}

	public async notifyRelatedActionsAsync(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		await Promise.all(streamDeck.actions.map(async (action) => {
			switch (action.manifestId) {
				case CHAT_MIX_CONTROLLER:
					return ChatMixController.updateThisActionAsync(action);
			}
		}));
	}

	private static async initializeActionAsync(action: any) {
		// Auto Initialize Settings. Because Streamdeck does not.
		const settings = await action.getSettings();
		settings.channel = settings.channel ?? ChatMixControllerChannels.Chat;
		settings.mode = settings.mode ?? ChatMixControllerModes.Increase;
		settings.changeValue = settings.changeValue ?? 0.05;
		settings.showTextComponents = settings.showTextComponents ?? ["change", "channel", "status"];
		await action.setSettings(settings);

		await ChatMixController.updateThisActionAsync(action);
	}

	public override async onWillAppear(ev: WillAppearEvent<ChatMixControllerSettings>): Promise<void> {
		await ChatMixController.initializeActionAsync(ev.action);
	}

	public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<ChatMixControllerSettings> | any): Promise<void> {
		if (ev.id === undefined)
			await ChatMixController.updateThisActionAsync(ev.action);
	}

	public override async onKeyDown(ev: KeyDownEvent<ChatMixControllerSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings() as ChatMixControllerSettings;
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const updatedBalance = ChatMixController.getUpdatedChatMixBalance(localSettings, globalSettings);
		await sonarClient.setChatMixAsync(updatedBalance);

		globalSettings.chatMixBalance = updatedBalance;
		await streamDeck.settings.setGlobalSettings(globalSettings);

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static getUpdatedChatMixBalance(localSettings: ChatMixControllerSettings, globalSettings: GlobalSettings): number {
		const currentBalance = globalSettings.chatMixBalance ?? 0;
		const changeValue = localSettings.changeValue;

		if (localSettings.mode === ChatMixControllerModes.Increase)
			switch (localSettings.channel) {
				case ChatMixControllerChannels.Chat:
					return Math.min(currentBalance + changeValue, 1);
				case ChatMixControllerChannels.Game:
					return Math.max(currentBalance - changeValue, -1);
				default:
					throw logErrorAndThrow(logger, `Can't get updated balance for mode: ${localSettings.mode}`);
			}

		if (localSettings.mode === ChatMixControllerModes.SetVolume)
			switch (localSettings.channel) {
				case ChatMixControllerChannels.Chat:
					return Math.min(changeValue, 1);
				case ChatMixControllerChannels.Game:
					return Math.max(changeValue * -1, -1);
				default:
					throw logErrorAndThrow(logger, `Can't get updated balance for mode: ${localSettings.mode}`);
			}

		throw logErrorAndThrow(logger, `Can't get updated balance for mode: ${localSettings.mode}`);
	}

	private static generateTitle(globalSettings: GlobalSettings, localSettings: ChatMixControllerSettings): string {
		const changeValuePercentage = Math.round(localSettings.changeValue * 100);
		const currentBalancePercentage = Math.round(globalSettings.chatMixBalance * 100) ?? 0;

		const multiplier = localSettings.channel == ChatMixControllerChannels.Chat ? 1 : -1;
		const sign = currentBalancePercentage * multiplier >= 0 ? "+" : "-";

		const showChange = localSettings.showTextComponents.includes("change");
		const showChannel = localSettings.showTextComponents.includes("channel");
		const showStatus = localSettings.showTextComponents.includes("status");

		if (localSettings.mode == ChatMixControllerModes.Increase)
			return (""
				+ (showChange ? `+${changeValuePercentage}%\r\n` : "")
				+ (showChannel ? `${ChatMixTranslations.get(localSettings.channel)}\r\n` : "")
				+ (showStatus ? `(${sign}${Math.abs(currentBalancePercentage)}%)` : "")).trim()

		if (localSettings.mode == ChatMixControllerModes.SetVolume)
			return (""
				+ (showChange ? `Set\r\n` : "")
				+ (showChannel ? `${ChatMixTranslations.get(localSettings.channel)}\r\n` : "")
				+ (showStatus ? `To +${changeValuePercentage}%` : "")).trim()

		throw logErrorAndThrow(logger, `Can't generate title for mode: ${localSettings.mode}`);
	}

	private static getImagePath(globalSettings: GlobalSettings, localSettings: ChatMixControllerSettings): string {
		const basePath = `imgs/actions/chat-mix-controller/`;
		if (localSettings.mode === ChatMixControllerModes.SetVolume)
			switch (localSettings.channel) {
				case ChatMixControllerChannels.Game:
					return basePath + "key-game-set-to";
				case ChatMixControllerChannels.Chat:
					return basePath + "key-chat-set-to";
			}

		const chatMixBalance = globalSettings.chatMixBalance ?? 0;
		logger.info(`ChatMix Balance: ${chatMixBalance} mode: ${localSettings.mode} channel: ${localSettings.channel}`);
		if (localSettings.mode === ChatMixControllerModes.Increase) 
			switch (localSettings.channel) {
				case ChatMixControllerChannels.Game:
					if (chatMixBalance > 0)
						return basePath + "key-game-negative";

					if (chatMixBalance == 0)
						return basePath + "key-game-0";

					if (chatMixBalance < 0 && chatMixBalance >= -0.35)
						return basePath + "key-game-10";

					if (chatMixBalance < -0.35 && chatMixBalance > -1)
						return basePath + "key-game-50";

					if (chatMixBalance == -1)
						return basePath + "key-game-100";
					break;	
				case ChatMixControllerChannels.Chat:
					if (chatMixBalance < 0)
						return basePath + "key-chat-negative";

					if (chatMixBalance == 0)
						return basePath + "key-chat-0";

					if (chatMixBalance > 0 && chatMixBalance <= 0.35)
						return basePath + "key-chat-10";

					if (chatMixBalance > 0.35 && chatMixBalance < 1)
						return basePath + "key-chat-50";

					if (chatMixBalance == 1)
						return basePath + "key-chat-100";
					break;	
			}
		
		throw logErrorAndThrow(logger, `Unknown mode for generating image path: ${localSettings.mode} channel: ${localSettings.channel} balance: ${chatMixBalance}`);
	}
}

/**
 * Settings for {@link ChatMixController}.
 */
type ChatMixControllerSettings = {
	channel: ChatMixControllerChannels,
	mode: ChatMixControllerModes,
	changeValue: number,
	showTextComponents: ("change" | "channel" | "status")[]
};

enum ChatMixControllerChannels {
	Chat = "chat",
	Game = "game"
}

enum ChatMixControllerModes {
	Increase = "increase",
	SetVolume = "set-volume"
}

export const ChatMixTranslations = new Map<ChatMixControllerChannels, string>([
	[ChatMixControllerChannels.Chat, "Chat"],
	[ChatMixControllerChannels.Game, "Game"],
]);