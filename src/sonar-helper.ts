import sonarClient from './services/sonar-client';
import { DeviceRole, RedirectionEnum, StreamRedirectionEnum } from './models/types/sonar-models.type';
import type { GlobalSettings } from './models/types/global-settings.type';

export async function getCurrentSonarSettingsAsync(): Promise<GlobalSettings> {
    const classicRedirections = await sonarClient.getDeviceRedirectionsAsync();
    const streamRedirections = await sonarClient.getStreamDeviceRedirectionsAsync();

    const mode = await sonarClient.getSonarModeAsync();

    const allOutputDevices = await sonarClient.getAllOutputAudioDevicesAsync();
    const gameDevice = allOutputDevices.find(x => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Game)?.deviceId);
    const chatDevice = allOutputDevices.find(x => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Chat)?.deviceId);
    const mediaDevice = allOutputDevices.find(x => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Media)?.deviceId);
    const auxDevice = allOutputDevices.find(x => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Aux)?.deviceId);

    const personalDevice = allOutputDevices.find(x => x.id == streamRedirections.find((x) => x.streamRedirectionId == StreamRedirectionEnum.PersonalMix)?.deviceId);
    const streamMixDevice = allOutputDevices.find(x => x.id == streamRedirections.find((x) => x.streamRedirectionId == StreamRedirectionEnum.StreamMix)?.deviceId);

    const classicVolumeSettings = await sonarClient.getClassicVolumeSettingsAsync();

    const globalSettings: GlobalSettings = {
        sonarMode: mode,
        masterChannel: {
            deviceId: 'Master',
            deviceName: 'Master',
            volume: classicVolumeSettings?.masters?.classic?.volume ?? 0,
        },
        micChannel: {
            deviceId: 'Microphone',
            deviceName: 'Microphone',
            volume: classicVolumeSettings?.devices[DeviceRole.Microphone]?.classic?.volume ?? 0,
        },
        gameChannel: {
            deviceId: gameDevice?.id ?? 'Unknown',
            deviceName: gameDevice?.friendlyName ?? 'Unknown',
            volume: classicVolumeSettings?.devices[DeviceRole.Game]?.classic?.volume ?? 0,
        },
        chatChannel: {
            deviceId: chatDevice?.id ?? 'Unknown',
            deviceName: chatDevice?.friendlyName ?? 'Unknown',
            volume: classicVolumeSettings?.devices[DeviceRole.Chat]?.classic?.volume ?? 0,
        },
        mediaChannel: {
            deviceId: mediaDevice?.id ?? 'Unknown',
            deviceName: mediaDevice?.friendlyName ?? 'Unknown',
            volume: classicVolumeSettings?.devices[DeviceRole.Media]?.classic?.volume ?? 0,
        },
        auxChannel: {
            deviceId: auxDevice?.id ?? 'Unknown',
            deviceName: auxDevice?.friendlyName ?? 'Unknown',
            volume: classicVolumeSettings?.devices[DeviceRole.Aux]?.classic?.volume ?? 0,
        },
        personalMixChannel: {
            deviceId: personalDevice?.id ?? 'Unknown',
            deviceName: personalDevice?.friendlyName ?? 'Unknown',
            volume: 0,
        },
        streamMixChannel: {
            deviceId: streamMixDevice?.id ?? 'Unknown',
            deviceName: streamMixDevice?.friendlyName ?? 'Unknown',
            volume: 0
        }
    };

    return globalSettings;
}