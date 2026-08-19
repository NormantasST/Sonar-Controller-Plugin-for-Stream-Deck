import type { KeyDownEvent } from "@elgato/streamdeck";
import streamDeck, { action } from "@elgato/streamdeck";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { ACTION_CHAT_MIX_CONTROLLER } from "../constants/action-uuids.constants";
import { logErrorAndThrow } from "../helpers/streamdeck-logger-helper";
import sonarClient from "../services/sonar-client";
import { ChatMixState } from "../models/types/sonar-models.type";
import type { BaseChatMixControllerSettings } from "./chat-mix-controller";
import type { VisibleAction } from "./base/sonar-action";
import { SonarAction } from "./base/sonar-action";

const logger = streamDeck.logger.createScope("chat-mix-controller");

@action({ UUID: ACTION_CHAT_MIX_CONTROLLER })
export class ActionChatMixController extends SonarAction<ActionChatMixControllerSettings> {
	protected override readonly relatedActionUuids = [ACTION_CHAT_MIX_CONTROLLER];

	protected override applyDefaultSettings(settings: ActionChatMixControllerSettings): void {
		settings.channel = settings.channel ?? ChatMixControllerChannels.Chat;
		settings.mode = settings.mode ?? ChatMixControllerModes.Increase;
		settings.changeValue = settings.changeValue ?? 0.05;
		settings.showTextComponents = settings.showTextComponents ?? ["change", "channel", "status"];
	}

	protected override async refreshActionAsync(action: VisibleAction<ActionChatMixControllerSettings>, globalSettings: GlobalSettings, localSettings: ActionChatMixControllerSettings): Promise<void> {
		await action.setTitle(ActionChatMixController.generateTitle(globalSettings, localSettings));
		await action.setImage(ActionChatMixController.getImagePath(globalSettings, localSettings));
	}

	public override async onKeyDown(ev: KeyDownEvent<ActionChatMixControllerSettings>): Promise<void> {
		const localSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const chatMix = await sonarClient.getChatMixAsync();
		globalSettings.chatMixBalance = chatMix.balance;
		globalSettings.chatMixState = chatMix.state;

		if (chatMix.state === ChatMixState.FiniteWheel) {
			logger.info("ChatMix balance is owned by a hardware wheel; ignoring key press.");
			await this.notifyRelatedActionsAsync(globalSettings);
			return;
		}

		const updateBalance = ActionChatMixController.getUpdatedChatMixBalance(localSettings, globalSettings);
		await sonarClient.setChatMixAsync(updateBalance);

		globalSettings.chatMixBalance = updateBalance;

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static getUpdatedChatMixBalance(localSettings: ActionChatMixControllerSettings, globalSettings: GlobalSettings): number {
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

	private static generateTitle(globalSettings: GlobalSettings, localSettings: ActionChatMixControllerSettings): string {
		const changeValuePercentage = Math.round(localSettings.changeValue * 100);
		const currentBalancePercentage = Math.round(globalSettings.chatMixBalance * 100) ?? 0;

		const multiplier = localSettings.channel == ChatMixControllerChannels.Chat ? 1 : -1;
		const sign = currentBalancePercentage * multiplier >= 0 ? "+" : "-";

		const showChange = localSettings.showTextComponents.includes("change");
		const showChannel = localSettings.showTextComponents.includes("channel");
		const showStatus = localSettings.showTextComponents.includes("status");

		// The balance is read-only while a hardware ChatMix wheel owns it.
		const statusText = globalSettings.chatMixState === ChatMixState.FiniteWheel
			? "(HW)"
			: `(${sign}${Math.abs(currentBalancePercentage)}%)`;

		if (localSettings.mode == ChatMixControllerModes.Increase)
			return (""
				+ (showChange ? `+${changeValuePercentage}%\r\n` : "")
				+ (showChannel ? `${ChatMixTranslations.get(localSettings.channel)}\r\n` : "")
				+ (showStatus ? statusText : "")).trim()

		if (localSettings.mode == ChatMixControllerModes.SetVolume)
			return (""
				+ (showChange ? `Set\r\n` : "")
				+ (showChannel ? `${ChatMixTranslations.get(localSettings.channel)}\r\n` : "")
				+ (showStatus ? `To +${changeValuePercentage}%` : "")).trim()

		throw logErrorAndThrow(logger, `Can't generate title for mode: ${localSettings.mode}`);
	}

	private static getImagePath(globalSettings: GlobalSettings, localSettings: ActionChatMixControllerSettings): string {
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

type ActionChatMixControllerSettings = BaseChatMixControllerSettings & {
	channel: ChatMixControllerChannels,
	mode: ChatMixControllerModes,
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
