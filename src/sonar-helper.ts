import streamDeck from '@elgato/streamdeck';
import sonarClient from './services/sonar-client';
import { RedirectionEnum, StreamRedirectionEnum } from './models/types/sonar-models.type';
import { GlobalSettings } from './models/types/global-settings.type';

const logger = streamDeck.logger.createScope("sonar-helper");

export async function getCurrentSonarSettings(): Promise<GlobalSettings>
{
    const classicRedirections = await sonarClient.getDeviceRedirectionsAsync();
    const streamRedirections = await sonarClient.getStreamDeviceRedirectionsAsync();
    logger.debug(JSON.stringify(classicRedirections));

    const mode = await sonarClient.getSonarModeAsync();

    const allOutputDevices = await sonarClient.getAllOutputAudioDevicesAsync();
    const gameDevice = allOutputDevices.find((x: { id: any; }) => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Game)?.deviceId);
    const chatDevice = allOutputDevices.find((x: { id: any; }) => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Chat)?.deviceId);
    const mediaDevice = allOutputDevices.find((x: { id: any; }) => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Media)?.deviceId);
    const auxDevice = allOutputDevices.find((x: { id: any; }) => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Aux)?.deviceId);

    const personalDevice = allOutputDevices.find((x: { id: any; }) => x.id == streamRedirections.find((x) => x.streamRedirectionId == StreamRedirectionEnum.PersonalMix)?.deviceId);
    const streamMixDevice = allOutputDevices.find((x: { id: any; }) => x.id == streamRedirections.find((x) => x.streamRedirectionId == StreamRedirectionEnum.StreamMix)?.deviceId);

    const globalSettings: GlobalSettings = {
        sonarMode: mode,
        gameChannel: {
            deviceId: gameDevice?.id ?? 'Unknown',
            deviceName: gameDevice?.friendlyName ?? 'Unknown',
        },
        chatChannel: {
            deviceId: chatDevice?.id ?? 'Unknown',
            deviceName: chatDevice?.friendlyName ?? 'Unknown',
        },
        mediaChannel: {
            deviceId: mediaDevice?.id ?? 'Unknown',
            deviceName: mediaDevice?.friendlyName ?? 'Unknown',
        },
        auxChannel: {
            deviceId: auxDevice?.id ?? 'Unknown',
            deviceName: auxDevice?.friendlyName ?? 'Unknown',
        },
        personalMixChannel: {
            deviceId: personalDevice?.id ?? 'Unknown',
            deviceName: personalDevice?.friendlyName ?? 'Unknown',
        },
        streamMixChannel: {
            deviceId: streamMixDevice?.id ?? 'Unknown',
            deviceName: streamMixDevice?.friendlyName ?? 'Unknown',
        }
    };

    return globalSettings;
}