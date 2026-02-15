import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { getAllAudioDevices, getAllExcludedAudioDevices as getOnlyNotExcludedDevices, getDeviceRedirections, getSonarUrl, setOutputAudioDevice } from "../sonar-helper";
import { GlobalSettings } from "../models/global-settings-types";
import { ROTATE_OUTPUT_DEVICES } from "../action-ids";
import { INotifyableAction } from "../models/interfaces";

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
		// Update the count from the settings.
		const { settings: localSettings } = ev.payload;
		const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

		// Fetch Sonar API Local API.
		const sonarUrl = await getSonarUrl();
		
		// Fetch Current Devices.
		const deviceRedirections = await getDeviceRedirections(sonarUrl);
		const gameRenderDevice = deviceRedirections.find((x: { id: string; }) => x.id == "game");

		// Exclude Excluded Devices
		const allDevices = await getAllAudioDevices(sonarUrl);
		let deviceIds: any[];

		if (localSettings.allowExcludedDevices)
			deviceIds = allDevices
		else
			deviceIds = await getOnlyNotExcludedDevices(sonarUrl, "game");

		// Gets current selected device.
		const currentOutputDeviceIndex = deviceIds.findIndex((x: { id: any; }) => x.id == gameRenderDevice.deviceId) ?? 0;
		const nextAudioDeviceIndex = currentOutputDeviceIndex + 1 < deviceIds.length ? currentOutputDeviceIndex + 1 : 0;
		const nextAudioDeviceId = deviceIds[nextAudioDeviceIndex].id;
		
		// Rotate Audio Device
		const nextAudioDevice = allDevices[allDevices.findIndex((x: { id: any; }) => x.id == nextAudioDeviceId)]

		await setOutputAudioDevice(sonarUrl, nextAudioDevice.id, 1);
		await setOutputAudioDevice(sonarUrl, nextAudioDevice.id, 2);
		await setOutputAudioDevice(sonarUrl, nextAudioDevice.id, 7);
		await setOutputAudioDevice(sonarUrl, nextAudioDevice.id, 8);

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
