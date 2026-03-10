import { ClassicVolumeChannelRoleInt, DeviceRole, RedirectionEnum, RedirectionIntEnum, StreamRedirectionEnum, StreamRedirectionIntEnum } from "../types/sonar-models.type";

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

export const ClassicVolumeSettingsEnumMap = new Map<DeviceRole, ClassicVolumeChannelRoleInt>([
    [DeviceRole.Game, ClassicVolumeChannelRoleInt.Game],
    [DeviceRole.Chat, ClassicVolumeChannelRoleInt.Chat],
    [DeviceRole.Media, ClassicVolumeChannelRoleInt.Media],
    [DeviceRole.Aux, ClassicVolumeChannelRoleInt.Aux],
    [DeviceRole.Microphone, ClassicVolumeChannelRoleInt.Microphone],
]);