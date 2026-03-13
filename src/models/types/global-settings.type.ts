import type { DeviceData } from "./device-data.type";
import type { SonarMode } from "./sonar-models.type";

export type GlobalSettings = {
    chatMixBalance: number,
    sonarMode: SonarMode,
    masterChannel: DeviceData,
    micChannel: DeviceData;
    gameChannel: DeviceData,
    chatChannel: DeviceData,
    mediaChannel: DeviceData,
    auxChannel: DeviceData,
    personalMixChannel: DeviceData,
    streamMixChannel: DeviceData,
}