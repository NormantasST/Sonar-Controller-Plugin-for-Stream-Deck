import sonarClient from './services/sonar-client';
import { DeviceRole, RedirectionEnum, StreamRedirectionEnum } from './models/types/sonar-models.type';
import type { GlobalSettings } from './models/types/global-settings.type';

export async function getCurrentSonarSettingsAsync(): Promise<GlobalSettings> {
    const classicRedirections = await sonarClient.getDeviceRedirectionsAsync();
    const streamRedirections = await sonarClient.getStreamDeviceRedirectionsAsync();

    const mode = await sonarClient.getSonarModeAsync();
    const chatMix = await sonarClient.getChatMixAsync();

    const allOutputDevices = await sonarClient.getAllOutputAudioDevicesAsync();
    const gameDevice = allOutputDevices.find(x => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Game)?.deviceId);
    const chatDevice = allOutputDevices.find(x => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Chat)?.deviceId);
    const mediaDevice = allOutputDevices.find(x => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Media)?.deviceId);
    const auxDevice = allOutputDevices.find(x => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Aux)?.deviceId);

    const personalDevice = allOutputDevices.find(x => x.id == streamRedirections.find((x) => x.streamRedirectionId == StreamRedirectionEnum.PersonalMix)?.deviceId);
    const streamMixDevice = allOutputDevices.find(x => x.id == streamRedirections.find((x) => x.streamRedirectionId == StreamRedirectionEnum.StreamMix)?.deviceId);

    const allInputDevices = await sonarClient.getAllInputAudioDevicesAsync();
    const classicMicDevice = allInputDevices.find(x => x.id == classicRedirections.find((x) => x.id == RedirectionEnum.Microphone)?.deviceId);
    const streamMicDevice = allInputDevices.find(x => x.id == streamRedirections.find((x) => x.streamRedirectionId == StreamRedirectionEnum.Microphone)?.deviceId);

    const classicVolumeSettings = await sonarClient.getClassicVolumeSettingsAsync();
    const streamVolumeSettings = await sonarClient.getStreamVolumeSettingsAsync();

    const currentConfig = await sonarClient.getCurrentConfigAsync();

    const globalSettings: GlobalSettings = {
        sonarMode: mode,
        chatMixBalance: chatMix.balance ?? 0,
        masterChannel: {
            deviceId: 'Master',
            deviceName: 'Master',
            volume: classicVolumeSettings?.masters?.classic?.volume ?? 0,
            muted: classicVolumeSettings?.masters?.classic?.muted ?? false,
        },
        micChannel: {
            deviceId: classicMicDevice?.id ?? 'Unknown',
            deviceName: classicMicDevice?.friendlyName ?? 'Unknown',
            profileId: currentConfig?.find((device) => device.virtualAudioDevice == DeviceRole.Microphone)?.id ?? 'Unknown',
            volume: classicVolumeSettings?.devices[DeviceRole.Microphone]?.classic?.volume ?? 0,
            muted: classicVolumeSettings?.devices[DeviceRole.Microphone]?.classic?.muted ?? false,
        },
        streamMicChannel: {
            deviceId: streamMicDevice?.id ?? 'Unknown',
            deviceName: streamMicDevice?.friendlyName ?? 'Unknown',
            volume: 0,
            muted: false,
        },
        gameChannel: {
            deviceId: gameDevice?.id ?? 'Unknown',
            deviceName: gameDevice?.friendlyName ?? 'Unknown',
            profileId: currentConfig?.find((device) => device.virtualAudioDevice == DeviceRole.Game)?.id ?? 'Unknown',
            volume: classicVolumeSettings?.devices[DeviceRole.Game]?.classic?.volume ?? 0,
            muted: classicVolumeSettings?.devices[DeviceRole.Game]?.classic?.muted ?? false,
        },
        chatChannel: {
            deviceId: chatDevice?.id ?? 'Unknown',
            deviceName: chatDevice?.friendlyName ?? 'Unknown',
            profileId: currentConfig?.find((device) => device.virtualAudioDevice == DeviceRole.Chat)?.id ?? 'Unknown',
            volume: classicVolumeSettings?.devices[DeviceRole.Chat]?.classic?.volume ?? 0,
            muted: classicVolumeSettings?.devices[DeviceRole.Chat]?.classic?.muted ?? false,
        },
        mediaChannel: {
            deviceId: mediaDevice?.id ?? 'Unknown',
            deviceName: mediaDevice?.friendlyName ?? 'Unknown',
            profileId: currentConfig?.find((device) => device.virtualAudioDevice == DeviceRole.Media)?.id ?? 'Unknown',
            volume: classicVolumeSettings?.devices[DeviceRole.Media]?.classic?.volume ?? 0,
            muted: classicVolumeSettings?.devices[DeviceRole.Media]?.classic?.muted ?? false,
        },
        auxChannel: {
            deviceId: auxDevice?.id ?? 'Unknown',
            deviceName: auxDevice?.friendlyName ?? 'Unknown',
            profileId: currentConfig?.find((device) => device.virtualAudioDevice == DeviceRole.Aux)?.id ?? 'Unknown',
            volume: classicVolumeSettings?.devices[DeviceRole.Aux]?.classic?.volume ?? 0,
            muted: classicVolumeSettings?.devices[DeviceRole.Aux]?.classic?.muted ?? false,
        },
        personalMixChannel: { 
            deviceId: personalDevice?.id ?? 'Unknown',
            deviceName: personalDevice?.friendlyName ?? 'Unknown',
            volume: 0,
            muted: false,
        },
        streamMixChannel: {
            deviceId: streamMixDevice?.id ?? 'Unknown',
            deviceName: streamMixDevice?.friendlyName ?? 'Unknown',
            volume: 0,
            muted: false,
        },
        streamMasterPersonal: {
            volume: streamVolumeSettings?.masters?.stream?.monitoring?.volume ?? 0  ,
            muted: streamVolumeSettings?.masters?.stream?.monitoring?.muted ?? false
        },
        streamMasterBroadcast: {
            volume: streamVolumeSettings?.masters?.stream?.streaming?.volume ?? 0  ,
            muted: streamVolumeSettings?.masters?.stream?.streaming?.muted ?? false
        },
        streamGamePersonal: {
            volume: streamVolumeSettings?.devices[DeviceRole.Game]?.stream?.monitoring?.volume ?? 0  ,
            muted: streamVolumeSettings?.devices[DeviceRole.Game]?.stream?.monitoring?.muted ?? false
        },
        streamGameBroadcast: {
            volume: streamVolumeSettings?.devices[DeviceRole.Game]?.stream?.streaming?.volume ?? 0  ,
            muted: streamVolumeSettings?.devices[DeviceRole.Game]?.stream?.streaming?.muted ?? false
        },
        streamChatPersonal: {
            volume: streamVolumeSettings?.devices[DeviceRole.Chat]?.stream?.monitoring?.volume ?? 0  ,
            muted: streamVolumeSettings?.devices[DeviceRole.Chat]?.stream?.monitoring?.muted ?? false
        },
        streamChatBroadcast: {
            volume: streamVolumeSettings?.devices[DeviceRole.Chat]?.stream?.streaming?.volume ?? 0  ,
            muted: streamVolumeSettings?.devices[DeviceRole.Chat]?.stream?.streaming?.muted ?? false
        },
        streamMediaPersonal: {
            volume: streamVolumeSettings?.devices[DeviceRole.Media]?.stream?.monitoring?.volume ?? 0  ,
            muted: streamVolumeSettings?.devices[DeviceRole.Media]?.stream?.monitoring?.muted ?? false
        },
        streamMediaBroadcast: {
            volume: streamVolumeSettings?.devices[DeviceRole.Media]?.stream?.streaming?.volume ?? 0  ,
            muted: streamVolumeSettings?.devices[DeviceRole.Media]?.stream?.streaming?.muted ?? false
        },
        streamAuxPersonal: {
            volume: streamVolumeSettings?.devices[DeviceRole.Aux]?.stream?.monitoring?.volume ?? 0  ,
            muted: streamVolumeSettings?.devices[DeviceRole.Aux]?.stream?.monitoring?.muted ?? false
        },
        streamAuxBroadcast: {
            volume: streamVolumeSettings?.devices[DeviceRole.Aux]?.stream?.streaming?.volume ?? 0  ,
            muted: streamVolumeSettings?.devices[DeviceRole.Aux]?.stream?.streaming?.muted ?? false
        },
        streamMicPersonal: {
            volume: streamVolumeSettings?.devices[DeviceRole.Microphone]?.stream?.monitoring?.volume ?? 0  ,
            muted: streamVolumeSettings?.devices[DeviceRole.Microphone]?.stream?.monitoring?.muted ?? false
        },
        streamMicBroadcast: {
            volume: streamVolumeSettings?.devices[DeviceRole.Microphone]?.stream?.streaming?.volume ?? 0  ,
            muted: streamVolumeSettings?.devices[DeviceRole.Microphone]?.stream?.streaming?.muted ?? false
        }
    };

    return globalSettings;
}
