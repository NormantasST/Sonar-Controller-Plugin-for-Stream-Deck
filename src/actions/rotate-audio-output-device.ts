import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { ROTATE_OUTPUT_DEVICES } from "../constants/action-uuids.constants";
import { INotifyableAction } from "../models/interfaces/notifyable-users.interface";
import { GlobalSettings } from "../models/types/global-settings.type";
import sonarClient from '.././services/sonar-client';
import { RedirectionEnum } from "../models/types/sonar-models.type";

const logger = streamDeck.logger.createScope("rotate-audio-output-device");

@action({ UUID: ROTATE_OUTPUT_DEVICES })
export class RotateOutputAudioDevice extends SingletonAction<RotateOutput> implements INotifyableAction {
	static async updateActionStateAsync(action: any): Promise<void> {
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		await action.setTitle(globalSettings.AllOutput!.deviceName);
	}

	override async onWillAppear(ev: WillAppearEvent<RotateOutput>): Promise<void> {
		const { settings } = ev.payload;
		await ev.action.setSettings(settings);

		await RotateOutputAudioDevice.updateActionStateAsync(ev.action);
	}

	override async onKeyDown(ev: KeyDownEvent<RotateOutput>): Promise<void> {
		const { settings: localSettings } = ev.payload;
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		
		const deviceRedirections = await sonarClient.getDeviceRedirectionsAsync();
		const gameRenderDevice = deviceRedirections.find((device) => device.id == RedirectionEnum.Game);

		const allDevices = await sonarClient.getAllAudioDevicesAsync();

		let availableDeviceIds: string[];
		if (localSettings.allowExcludedDevices)
			availableDeviceIds = allDevices.map((device) => device.id);
		else
		{
			const excludedGameDevices = await sonarClient.getAllExcludedGameAudioDevicesAsync()
			availableDeviceIds = excludedGameDevices.map((device) => device.id);
		}

		// Gets current selected device.
		const currentOutputDeviceIndex = availableDeviceIds.findIndex((id) => id == gameRenderDevice!.deviceId) ?? 0;
		const nextAudioDeviceIdIndex = currentOutputDeviceIndex + 1 < availableDeviceIds.length ? currentOutputDeviceIndex + 1 : 0;
		const nextAudioDeviceId = availableDeviceIds[nextAudioDeviceIdIndex];
		
		// Rotate Audio Device
		const nextAudioDeviceIndex = allDevices.findIndex((device) => device.id == nextAudioDeviceId);
		const nextAudioDevice = allDevices[nextAudioDeviceIndex];

		await sonarClient.putOutputAudioDeviceAsync(nextAudioDevice.id, RedirectionEnum.Game);
		await sonarClient.putOutputAudioDeviceAsync(nextAudioDevice.id, RedirectionEnum.Chat);
		await sonarClient.putOutputAudioDeviceAsync(nextAudioDevice.id, RedirectionEnum.Media);
		await sonarClient.putOutputAudioDeviceAsync(nextAudioDevice.id, RedirectionEnum.Aux);

		globalSettings.AllOutput!.deviceName = nextAudioDevice.friendlyName;
		globalSettings.AllOutput!.deviceId = nextAudioDevice.id;

		await streamDeck.settings.setGlobalSettings(globalSettings);
		await this.notifyActions(globalSettings);
	}

	async notifyActions(globalSettings: GlobalSettings): Promise<void> {
		await streamDeck.settings.setGlobalSettings(globalSettings);
		streamDeck.actions.forEach(async (action) => {
			switch (action.manifestId) {
				case ROTATE_OUTPUT_DEVICES:
					await RotateOutputAudioDevice.updateActionStateAsync(action);
					break;
			}
		});
	}
}

/**
 * Settings for {@link RotateOutputAudioDevice}.
 */
type RotateOutput = {
	allowExcludedDevices?: boolean
};
