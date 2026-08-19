import { StreamDeviceRoleInt } from "../types/sonar-models.type";
import { VolumeChannelRoleInt, DeviceRole, RedirectionEnum, RedirectionIntEnum, StreamRedirectionEnum, StreamRedirectionIntEnum, StreamDeviceRole } from "../types/sonar-models.type";

export const RedirectionEnumMap = new Map<RedirectionEnum, RedirectionIntEnum>([
    [RedirectionEnum.Game, RedirectionIntEnum.Game],
    [RedirectionEnum.Chat, RedirectionIntEnum.Chat],
    [RedirectionEnum.Microphone, RedirectionIntEnum.Microphone],
    [RedirectionEnum.Media, RedirectionIntEnum.Media],
    [RedirectionEnum.Aux, RedirectionIntEnum.Aux],
]);

export const StreamRedirectionEnumMap = new Map<StreamRedirectionEnum, StreamRedirectionIntEnum>([
    [StreamRedirectionEnum.PersonalMix, StreamRedirectionIntEnum.PersonalMix],
    [StreamRedirectionEnum.StreamMix, StreamRedirectionIntEnum.StreamMix],
    [StreamRedirectionEnum.Microphone, StreamRedirectionIntEnum.Microphone],
]);

export const VolumeSettingsRoleEnumMap = new Map<DeviceRole, VolumeChannelRoleInt>([
    [DeviceRole.Game, VolumeChannelRoleInt.Game],
    [DeviceRole.Chat, VolumeChannelRoleInt.Chat],
    [DeviceRole.Media, VolumeChannelRoleInt.Media],
    [DeviceRole.Aux, VolumeChannelRoleInt.Aux],
    [DeviceRole.Microphone, VolumeChannelRoleInt.Microphone],
]);

export const StreamerVolumeSettingsSubChannelEnumMap = new Map<StreamDeviceRole, StreamDeviceRoleInt>([
    [StreamDeviceRole.Monitoring, StreamDeviceRoleInt.Monitoring],
    [StreamDeviceRole.Streaming, StreamDeviceRoleInt.Streaming],
]);