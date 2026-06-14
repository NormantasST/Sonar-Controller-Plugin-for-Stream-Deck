export function initializeBase(settings: BaseChatMixControllerSettings) {
	settings.changeValue = settings.changeValue ?? 0.05;
}

export type BaseChatMixControllerSettings = {
	changeValue: number,
};