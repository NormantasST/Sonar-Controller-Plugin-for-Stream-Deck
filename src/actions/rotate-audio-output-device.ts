import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { getAllAudioDevices, getDeviceRedirections, getSonarUrl, setOutputAudioDevice } from "../sonar-helper";
const logger = streamDeck.logger.createScope("rotate-audio-output-device");

/**
 * An example action class that displays a count that increments by one each time the button is pressed.
 */
@action({ UUID: "com.novil.steelseriessonar-by-novil.rotate-output-audio-device" })
export class RotateOutputAudioDevice extends SingletonAction<CounterSettings> {
	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}. In this example,
	 * we're setting the title to the "count" that is incremented in {@link RotateOutputAudioDevice.onKeyDown}.
	 */
	override async onWillAppear(ev: WillAppearEvent<CounterSettings>): Promise<void> {
		const { settings } = ev.payload;

		// Fetch Sonar API Local API.
		const sonarUrl = await getSonarUrl();
		
		// Fetch Current Devices.
		const deviceRedirections = await getDeviceRedirections(sonarUrl);
		const gameRenderDevice = deviceRedirections.find((x: { id: string; }) => x.id == "game");
		logger.debug(`Game Render Device: ${JSON.stringify(gameRenderDevice)}`);

		// Gets current selected device
		const allDevices = await getAllAudioDevices(sonarUrl);
		logger.debug(`Current Devices: ${JSON.stringify(allDevices)}`);

		const currentOutputDevice = allDevices.find((x: { id: any; }) => x.id == gameRenderDevice.deviceId);
		logger.debug(`Current Selected Device: ${JSON.stringify(currentOutputDevice)}`);

		settings.deviceName = currentOutputDevice.friendlyName;
		settings.deviceId = currentOutputDevice.id;

		await ev.action.setSettings(settings);
		return ev.action.setTitle(settings.deviceName);
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
	 * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
	 * and action information where applicable. In this example, our action will display a counter that increments by one each press. We track the current count on the action's persisted
	 * settings using `setSettings` and `getSettings`.
	 */
	override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
		// Update the count from the settings.
		const { settings } = ev.payload;

		// Fetch Sonar API Local API.
		const sonarUrl = await getSonarUrl();
		
		// Fetch Current Devices.
		const deviceRedirections = await getDeviceRedirections(sonarUrl);
		const gameRenderDevice = deviceRedirections.find((x: { id: string; }) => x.id == "game");

		// Gets current selected device.
		const allDevices = await getAllAudioDevices(sonarUrl);
		logger.debug(`Current Devices: ${JSON.stringify(allDevices)}`);
		const currentOutputDeviceIndex = allDevices.findIndex((x: { id: any; }) => x.id == gameRenderDevice.deviceId) ?? 0;
		const currentOutputDevice = allDevices[currentOutputDeviceIndex];

		// Rotate Audio Device
		const nextAudioDeviceIndex = currentOutputDeviceIndex + 1 < allDevices.length ? currentOutputDeviceIndex + 1 : 0;
		const nextAudioDevice = allDevices[nextAudioDeviceIndex];

		logger.debug(`Setting Audio Device (${nextAudioDeviceIndex}) to: ${JSON.stringify(nextAudioDevice)}`);
		await setOutputAudioDevice(sonarUrl, nextAudioDevice.id, 1);
		await setOutputAudioDevice(sonarUrl, nextAudioDevice.id, 2);
		await setOutputAudioDevice(sonarUrl, nextAudioDevice.id, 7);
		await setOutputAudioDevice(sonarUrl, nextAudioDevice.id, 8);

		settings.deviceName = nextAudioDevice.friendlyName;
		settings.deviceId = nextAudioDevice.id;

		await ev.action.setSettings(settings);
		return ev.action.setTitle(settings.deviceName);
	}
}

/**
 * Settings for {@link RotateOutputAudioDevice}.
 */
type CounterSettings = {
	deviceName: string;
	deviceId: string;
};
