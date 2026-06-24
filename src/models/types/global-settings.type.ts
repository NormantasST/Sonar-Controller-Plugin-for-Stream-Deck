import type { DeviceData } from "./device-data.type";
import type { SonarMode } from "./sonar-models.type";

// Note not all values will be set on <DeviceData> object.
export type GlobalSettings = {
    // General
    chatMixBalance: number,
    sonarMode: SonarMode,

    // AudioChannels & Volume Mixers for Classic
    masterChannel: DeviceData,
    gameChannel: DeviceData,
    chatChannel: DeviceData,
    mediaChannel: DeviceData,
    auxChannel: DeviceData,
    micChannel: DeviceData;

    // Audio Devices for Stream
    personalMixChannel: DeviceData,
    streamMixChannel: DeviceData,
    streamMicChannel: DeviceData,
    
    // Volume Mixers for Stream
    streamMasterPersonal: DeviceData,
    streamMasterBroadcast: DeviceData,
    streamGamePersonal: DeviceData,
    streamGameBroadcast: DeviceData,
    streamChatPersonal: DeviceData,
    streamChatBroadcast: DeviceData,
    streamMediaPersonal: DeviceData,
    streamMediaBroadcast: DeviceData,
    streamAuxPersonal: DeviceData,
    streamAuxBroadcast: DeviceData,
    streamMicPersonal: DeviceData,
    streamMicBroadcast: DeviceData,
}