export type ChannelData = {
	volume: number;
	muted: boolean;
}

export type DeviceData = ChannelData & {
	deviceName: string;
	deviceId: string;
}

export type ExpandedDeviceData = DeviceData & {
	profileId: string;
}