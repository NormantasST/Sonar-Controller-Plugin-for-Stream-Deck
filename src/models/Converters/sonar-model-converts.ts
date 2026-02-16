import { RedirectionEnum, RedirectionIntEnum } from "../types/sonar-models.type";

export const RedirectionEnumMap = new Map<RedirectionEnum, RedirectionIntEnum>([
    [RedirectionEnum.Game, RedirectionIntEnum.Game],
    [RedirectionEnum.Chat, RedirectionIntEnum.Chat],
    [RedirectionEnum.Media, RedirectionIntEnum.Media],
    [RedirectionEnum.Aux, RedirectionIntEnum.Aux],
]);