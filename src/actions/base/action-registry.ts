import type { GlobalSettings } from "../../models/types/global-settings.type";

/**
 * An action that can re-render all of its visible instances from the given global settings.
 */
export interface IRefreshableAction {
	refreshAllAsync(globalSettings: GlobalSettings): Promise<void>;
}

// Actions look each other up here by manifest UUID instead of importing each other,
// which would create circular module dependencies.
const registry = new Map<string, IRefreshableAction>();

export function registerRefreshableAction(manifestId: string, action: IRefreshableAction): void {
	registry.set(manifestId, action);
}

export function getRefreshableAction(manifestId: string): IRefreshableAction | undefined {
	return registry.get(manifestId);
}

export function getAllRefreshableActions(): IRefreshableAction[] {
	return [...registry.values()];
}
