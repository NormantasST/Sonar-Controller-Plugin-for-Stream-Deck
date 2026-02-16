import streamDeck from '@elgato/streamdeck';
import sonarClient from './services/sonar-client';
import { RedirectionEnum } from './models/types/sonar-models.type';
import { logErrorAndThrow } from './helpers/streamdeck-logger-helper';
import { GlobalSettings } from './models/types/global-settings.type';

const logger = streamDeck.logger.createScope("rotate-audio-output-device");

export async function getCurrentSonarSettings(): Promise<GlobalSettings>
{
    const deviceRedirections = await sonarClient.getDeviceRedirectionsAsync();
    logger.debug(JSON.stringify(deviceRedirections));
    const gameRenderDevice = deviceRedirections.find((x) => x.id == RedirectionEnum.Game);
    if (gameRenderDevice === undefined)
        logErrorAndThrow(logger, `Game Render Device not found. Devices: ${JSON.stringify(deviceRedirections)}`);
    
    const allOutputDevices = await sonarClient.getAllOutputAudioDevicesAsync();
    const currentOutputDevice = allOutputDevices.find((x: { id: any; }) => x.id == gameRenderDevice!.deviceId);

    const globalSettings: GlobalSettings = {
        AllOutput: {
            deviceId: currentOutputDevice!.id!,
            deviceName: currentOutputDevice!.friendlyName,
        }
    };

    return globalSettings;
}