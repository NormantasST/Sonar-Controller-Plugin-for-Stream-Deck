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
    Microphone = "chatCapture",
    Chat = "chatRenderer",
    Media = "media",
    Aux = "aux",
}

// 0, 4 are Unknown.
export enum ClassicVolumeChannelRoleInt {
    Game = 2,
    Chat = 1, // ChatRenderer
    Media = 5,
    Aux = 6,
    Microphone = 3, // ChatCapture
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

export type VolumeSettingsDevice = {
  volume: number;
  muted: boolean;
};

export type VolumeSettingsChannel = {
  stream: Record<string, VolumeSettingsDevice>;
  classic: VolumeSettingsDevice;
};

export type VolumeSettings = {
  masters: VolumeSettingsChannel;
  devices: Record<DeviceRole, VolumeSettingsChannel>;
};

export enum VolumeSettingsDeviceEnums {
    Classic = "classic",
    Streaming = "stream"
}

export type ChatMixResponse = {
    balance: number;
    state: number;
};
