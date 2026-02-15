import { GlobalSettings } from "./global-settings-types";

export interface INotifyableAction{
    notifyActions(globalSettings: GlobalSettings): Promise<void>
}