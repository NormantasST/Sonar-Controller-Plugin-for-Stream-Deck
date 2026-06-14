import type { DialRotateEvent, DidReceiveSettingsEvent, TouchTapEvent, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import type { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../models/types/global-settings.type";
import { initializeBase, type BaseChatMixControllerSettings } from "./chat-mix-controller";
import { ACTION_CHAT_MIX_CONTROLLER, DIAL_CHAT_MIX_CONTROLLER } from "../constants/action-uuids.constants";
import { ActionChatMixController } from "./chat-mix-controller.action";
import sonarClient from "../services/sonar-client";

const logger = streamDeck.logger.createScope("chat-mix-controller-dial");

@action({ UUID: DIAL_CHAT_MIX_CONTROLLER })
export class DialChatMixController extends SingletonAction<BaseChatMixControllerSettings> implements INotifyableAction {
	public static async updateThisActionAsync(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		await action.setTitle(DialChatMixController.generateTitle());
		if (action.isDial()){
			const currentMixValue = globalSettings.chatMixBalance ?? 0;
			await action.setFeedback({
				indicator: {
					value: DialChatMixController.calculateShownVolume(currentMixValue),
				},
			});
		}
	}

	public async notifyRelatedActionsAsync(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		await Promise.all(streamDeck.actions.map(async (action) => {
			switch (action.manifestId) {
				case DIAL_CHAT_MIX_CONTROLLER:
					return DialChatMixController.updateThisActionAsync(action);
				case ACTION_CHAT_MIX_CONTROLLER:
					return ActionChatMixController.updateThisActionAsync(action);
			}
		}));
	}

	private static async initializeAsync(action: any) {
		// Auto Initialize Settings. Because Streamdeck does not.
		const settings = await action.getSettings() as BaseChatMixControllerSettings;
		initializeBase(settings);
		
		await action.setSettings(settings);
		await DialChatMixController.updateThisActionAsync(action);
	}

	public override async onWillAppear(ev: WillAppearEvent<BaseChatMixControllerSettings>): Promise<void> {
		await DialChatMixController.initializeAsync(ev.action);
	}

	public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<BaseChatMixControllerSettings> | any): Promise<void> {
		if (ev.id === undefined)
			await DialChatMixController.updateThisActionAsync(ev.action);
	}

	public override async onDialRotate(ev: DialRotateEvent<BaseChatMixControllerSettings>): Promise<void> {
		logger.info(`Dial Rotate with settings: ${JSON.stringify(ev)}`);

		const localSettings = await ev.action.getSettings() as BaseChatMixControllerSettings;
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const currentBalance = globalSettings.chatMixBalance;
		const updateBalance = DialChatMixController.calculateUpdatedVolume(currentBalance, ev.payload.ticks, localSettings.changeValue);
		await sonarClient.setChatMixAsync(updateBalance);

		globalSettings.chatMixBalance = updateBalance;
		await streamDeck.settings.setGlobalSettings(globalSettings);

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	public override async onTouchTap(ev: TouchTapEvent): Promise<void> {
		logger.info(`Dial Rotate with settings: ${JSON.stringify(ev)}`);

		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		const updateBalance = 0;
		await sonarClient.setChatMixAsync(updateBalance);

		globalSettings.chatMixBalance = updateBalance;
		await streamDeck.settings.setGlobalSettings(globalSettings);

		await this.notifyRelatedActionsAsync(globalSettings);
	}

	private static calculateUpdatedVolume(currentVolume: number, ticks: number, changeValue: number): number{
		return Math.min(Math.max(currentVolume += ticks * changeValue, -1), 1);
	}

	private static calculateShownVolume(currentVolume: number): number{
		const normalizedValue = (currentVolume + 1) / 2; // Normalize from -1 - 1 to 0 - 1
		return normalizedValue * 100; // Convert to percentage
	}

	private static generateTitle(): string {
		return "ChatMix";	
	}
}