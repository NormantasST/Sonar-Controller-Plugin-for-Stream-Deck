import type { DeviceData } from "./device-data.type";
import type { SonarMode } from "./sonar-models.type";

export type GlobalSettings = {
    gameChannel: DeviceData,
    chatChannel: DeviceData,
    mediaChannel: DeviceData,
    auxChannel: DeviceData,
    personalMixChannel: DeviceData,
    streamMixChannel: DeviceData,
    sonarMode: SonarMode
}