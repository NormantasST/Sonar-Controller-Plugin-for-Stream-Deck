import type { DialRotateEvent, TouchTapEvent } from "@elgato/streamdeck";
import streamDeck, { action } from "@elgato/streamdeck";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { initializeBase, type BaseChatMixControllerSettings } from "./chat-mix-controller";
import { ACTION_CHAT_MIX_CONTROLLER, DIAL_CHAT_MIX_CONTROLLER } from "../constants/action-uuids.constants";
import sonarClient from "../services/sonar-client";
import { ChatMixState } from "../models/types/sonar-models.type";
import type { VisibleAction } from "./base/sonar-action";
import { SonarAction } from "./base/sonar-action";

const logger = streamDeck.logger.createScope("chat-mix-controller-dial");

@action({ UUID: DIAL_CHAT_MIX_CONTROLLER })
export class DialChatMixController extends SonarAction<BaseChatMixControllerSettings> {
	protected override readonly relatedActionUuids = [DIAL_CHAT_MIX_CONTROLLER, ACTION_CHAT_MIX_CONTROLLER];

	protected override applyDefaultSettings(settings: BaseChatMixControllerSettings): void {
		initializeBase(settings);
	}

	protected override async refreshActionAsync(action: VisibleAction<BaseChatMixControllerSettings>, globalSettings: GlobalSettings, _localSettings: BaseChatMixControllerSettings): Promise<void> {
		await action.setTitle(DialChatMixController.generateTitle(globalSettings));
		if (action.isDial()){
			const currentMixValue = globalSettings.chatMixBalance ?? 0;
			await action.setFeedback({
				indicator: {
					value: DialChatMixController.calculateShownVolume(currentMixValue),
				},
			});
		}
	}

	public override async onDialRotate(ev: DialRotateEvent<BaseChatMixControllerSettings>): Promise<void> {
		logger.info(`Dial Rotate with settings: ${JSON.stringify(ev)}`);

		const localSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const chatMix = await sonarClient.getChatMixAsync();
		globalSettings.chatMixBalance = chatMix.balance;
		globalSettings.chatMixState = chatMix.state;

		if (chatMix.state === ChatMixState.FiniteWheel) {
			logger.info("ChatMix balance is owned by a hardware wheel; ignoring dial rotation.");
			await ev.action.showAlert();
			await this.notifyRelatedActionsAsync(globalSettings);
			return;
		}

		const updateBalance = DialChatMixController.calculateUpdatedVolume(chatMix.balance, ev.payload.ticks, localSettings.changeValue);
		await sonarClient.setChatMixAsync(updateBalance);

		globalSettings.chatMixBalance = updateBalance;

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	public override async onTouchTap(ev: TouchTapEvent<BaseChatMixControllerSettings>): Promise<void> {
		logger.info(`Dial Touch with settings: ${JSON.stringify(ev)}`);

		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const chatMix = await sonarClient.getChatMixAsync();
		globalSettings.chatMixBalance = chatMix.balance;
		globalSettings.chatMixState = chatMix.state;

		if (chatMix.state === ChatMixState.FiniteWheel) {
			logger.info("ChatMix balance is owned by a hardware wheel; ignoring touch tap.");
			await ev.action.showAlert();
			await this.notifyRelatedActionsAsync(globalSettings);
			return;
		}

		const updateBalance = 0;
		await sonarClient.setChatMixAsync(updateBalance);

		globalSettings.chatMixBalance = updateBalance;

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static calculateUpdatedVolume(currentVolume: number, ticks: number, changeValue: number): number{
		return Math.min(Math.max(currentVolume += ticks * changeValue, -1), 1);
	}

	private static calculateShownVolume(currentVolume: number): number{
		const normalizedValue = (currentVolume + 1) / 2; // Normalize from -1 - 1 to 0 - 1
		return normalizedValue * 100; // Convert to percentage
	}

	private static generateTitle(globalSettings: GlobalSettings): string {
		if (globalSettings.chatMixState === ChatMixState.FiniteWheel)
			return "ChatMix\r\nBlocked (HW)";

		return "ChatMix";
	}
}
