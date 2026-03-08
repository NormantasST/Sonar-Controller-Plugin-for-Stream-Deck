export type AudioDevice = {
    id?: string;
    friendlyName: string;
    dataFlow: DeviceDataFlow;
    role: DeviceRole;
}

export type ClassicRedirection = {
    deviceId: string;
    id: RedirectionEnum;
    isRunning: boolean;
}

export type StreamRedirection = {
    deviceId: string;
    streamRedirectionId: StreamRedirectionEnum;
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
    Microphone = "mic",
    Media = "media",
    Aux = "aux",
}

export enum RedirectionIntEnum {
    Game = 1,
    Chat = 2,
    Microphone = 3,
    Media = 7,
    Aux = 8,
}

export enum StreamRedirectionEnum {
    PersonalMix = "monitoring",
    StreamMix = "streaming",
    Microphone = "mic",
}

export enum StreamRedirectionIntEnum {
    StreamMix = 0,
    PersonalMix = 1,
    Microphone = 2,
}

export enum SonarMode {
    Classic = "classic",
    Streaming = "stream"
}