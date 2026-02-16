
export type AudioDevice = {
    id: string;
    friendlyName: string;
    dataFlow: DeviceDataFlow;
    role: DeviceRole;
}

export type ClassicRedirection = {
    deviceId: string;
    id: RedirectionEnum;
    isRunning: boolean;
}

export type FallbackSettings = {
    game: FallbackSetting[]
}

export type FallbackSetting = {
    id: string;
    isActive: boolean;
    isExcluded: boolean;
}

export enum DeviceRole {
    None = "none", // Marked for not Sonar Audio Devices.
    Game = "game",
    ChatCapture = "chatCapture",
    ChatRendered = "chatRenderer",
    Media = "media",
    Aux = "Aux",
}

export enum DeviceDataFlow {
    Capture = "capture", // Outputs Audio
    Render = "render", // Inputs Audio
}

export enum RedirectionEnum {
    Game = "game",
    Chat = "chat",
    Mic = "mic",
    Media = "media",
    Aux = "aux",
}

export enum RedirectionIntEnum {
    Game = 1,
    Chat = 2,
    Media = 7,
    Aux = 8,
}