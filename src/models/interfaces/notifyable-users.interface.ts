import type { GlobalSettings } from "../types/global-settings.type";

export interface INotifyableAction{
    notifyRelatedActionsAsync(globalSettings: GlobalSettings): Promise<void>
}