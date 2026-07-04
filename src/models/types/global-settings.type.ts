import type { ChannelData, DeviceData, ExpandedDeviceData } from "./device-data.type";
import type { SonarMode } from "./sonar-models.type";

// Note not all values will be set on <DeviceData> object.
export type GlobalSettings = {
    // General
    chatMixBalance: number,
    sonarMode: SonarMode,

    // AudioChannels & Volume Mixers for Classic
    masterChannel: DeviceData,
    gameChannel: ExpandedDeviceData,
    chatChannel: ExpandedDeviceData,
    mediaChannel: ExpandedDeviceData,
    auxChannel: ExpandedDeviceData,
    micChannel: ExpandedDeviceData;

    // Audio Devices for Stream
    personalMixChannel: DeviceData,
    streamMixChannel: DeviceData,
    streamMicChannel: DeviceData,
    
    // Volume Mixers for Stream
    streamMasterPersonal: ChannelData,
    streamMasterBroadcast: ChannelData,
    streamGamePersonal: ChannelData,
    streamGameBroadcast: ChannelData,
    streamChatPersonal: ChannelData,
    streamChatBroadcast: ChannelData,
    streamMediaPersonal: ChannelData,
    streamMediaBroadcast: ChannelData,
    streamAuxPersonal: ChannelData,
    streamAuxBroadcast: ChannelData,
    streamMicPersonal: ChannelData,
    streamMicBroadcast: ChannelData,
}