import type { DialAction, DidReceiveSettingsEvent, KeyAction, WillAppearEvent } from "@elgato/streamdeck";
import streamDeck, { SingletonAction } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import type { INotifyableAction } from "../../models/interfaces/notifyable-users.interface";
import type { GlobalSettings } from "../../models/types/global-settings.type";
import type { IRefreshableAction } from "./action-registry";
import { getRefreshableAction } from "./action-registry";

const logger = streamDeck.logger.createScope("sonar-action");

/**
 * A visible instance of an action, as provided by Stream Deck events or {@link SingletonAction.actions}.
 */
export type VisibleAction<TSettings extends JsonObject> = DialAction<TSettings> | KeyAction<TSettings>;

/**
 * Every {@link SingletonAction} event handler that gets routed to an action instance.
 */
const GUARDED_EVENT_HANDLERS = [
	"onDialDown",
	"onDialRotate",
	"onDialUp",
	"onDidReceiveResources",
	"onDidReceiveSettings",
	"onKeyDown",
	"onKeyUp",
	"onPropertyInspectorDidAppear",
	"onPropertyInspectorDidDisappear",
	"onSendToPlugin",
	"onTitleParametersDidChange",
	"onTouchTap",
	"onWillAppear",
	"onWillDisappear",
] as const;

type GuardedEventHandlerName = (typeof GUARDED_EVENT_HANDLERS)[number];
type GuardedEvent = { action?: { showAlert?(): Promise<void> } };
type GuardedEventHandler = (ev: GuardedEvent) => Promise<void> | void;

/**
 * Base class for all Sonar actions. Implements the shared lifecycle once:
 * settings initialization on appearance, re-rendering on settings changes,
 * and fan-out to related actions after global state changes.
 */
export abstract class SonarAction<TSettings extends JsonObject> extends SingletonAction<TSettings> implements INotifyableAction, IRefreshableAction {
	constructor() {
		super();
		// The SDK's event router awaits handlers without catching, so a throw (e.g. Sonar
		// rejecting a request while in the wrong mode) becomes an unhandled rejection that
		// kills the plugin process. Guard every handler: log, show the key alert, survive.
		for (const name of GUARDED_EVENT_HANDLERS)
			this.guardEventHandler(name);
	}

	private guardEventHandler(name: GuardedEventHandlerName): void {
		// The handlers have heterogeneous event types; they are only called here with the
		// event the SDK routed to them, so widening through `unknown` is safe.
		const handler = this[name] as unknown as GuardedEventHandler | undefined;
		if (handler === undefined)
			return;

		const guarded: GuardedEventHandler = async (ev) => {
			try {
				await handler.call(this, ev);
			} catch (error) {
				const details = error instanceof Error ? error.stack ?? error.message : JSON.stringify(error);
				logger.error(`Unhandled error in ${name} of ${this.manifestId}: ${details}`);
				await ev.action?.showAlert?.();
			}
		};
		(this as unknown as Record<GuardedEventHandlerName, GuardedEventHandler>)[name] = guarded;
	}

	/**
	 * Manifest UUIDs of the actions (usually including this one) whose visuals depend on the
	 * global state this action modifies. Resolved through the action registry.
	 */
	protected abstract readonly relatedActionUuids: string[];

	/**
	 * Fills in defaults for settings Stream Deck has not persisted yet.
	 */
	protected abstract applyDefaultSettings(settings: TSettings, globalSettings: GlobalSettings): void;

	/**
	 * Re-renders a single visible action instance (title, image, dial feedback).
	 */
	protected abstract refreshActionAsync(action: VisibleAction<TSettings>, globalSettings: GlobalSettings, localSettings: TSettings): Promise<void>;

	public async refreshAllAsync(globalSettings: GlobalSettings): Promise<void> {
		await Promise.all(this.actions.map(async (action) => {
			const localSettings = await action.getSettings();
			return this.refreshActionAsync(action, globalSettings, localSettings);
		}));
	}

	public async notifyRelatedActionsAsync(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		await Promise.all(this.relatedActionUuids
			.map((uuid) => getRefreshableAction(uuid))
			.filter((action) => action !== undefined)
			.map((action) => action.refreshAllAsync(globalSettings)));
	}

	public override async onWillAppear(ev: WillAppearEvent<TSettings>): Promise<void> {
		// Stream Deck does not persist manifest defaults, so fill them in on first appearance.
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		const localSettings = await ev.action.getSettings();
		this.applyDefaultSettings(localSettings, globalSettings);
		await ev.action.setSettings(localSettings);

		await this.refreshActionAsync(ev.action, globalSettings, localSettings);
	}

	public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<TSettings>): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		await this.refreshActionAsync(ev.action, globalSettings, ev.payload.settings);
	}
}
