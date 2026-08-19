import { SonarMode } from "../models/types/sonar-models.type";

// The volume-mixer and mute actions share the same channel identifiers
// ("classic-master", "stream-game-personal", ...), so the mapping works on the
// raw values and stays valid for both enums.
const classicToStreamPersonal = new Map<string, string>([
	["classic-master", "stream-master-personal"],
	["classic-game", "stream-game-personal"],
	["classic-chat", "stream-chat-personal"],
	["classic-media", "stream-media-personal"],
	["classic-aux", "stream-aux-personal"],
	["classic-mic", "stream-mic-personal"],
]);

const streamToClassic = new Map<string, string>([
	["stream-master-personal", "classic-master"],
	["stream-master-broadcast", "classic-master"],
	["stream-game-personal", "classic-game"],
	["stream-game-broadcast", "classic-game"],
	["stream-chat-personal", "classic-chat"],
	["stream-chat-broadcast", "classic-chat"],
	["stream-media-personal", "classic-media"],
	["stream-media-broadcast", "classic-media"],
	["stream-aux-personal", "classic-aux"],
	["stream-aux-broadcast", "classic-aux"],
	["stream-mic-personal", "classic-mic"],
	["stream-mic-broadcast", "classic-mic"],
]);

/**
 * Maps a configured channel to the channel Sonar actually accepts writes for in the
 * given mode: classic channels resolve to their streamer "personal" counterpart while
 * in stream mode, and streamer channels resolve to the classic channel while in
 * classic mode. Channels matching the current mode are returned unchanged.
 */
export function resolveChannelForMode<TChannel extends string>(targetChannel: TChannel, sonarMode: SonarMode): TChannel {
	const resolved = sonarMode === SonarMode.Streaming
		? classicToStreamPersonal.get(targetChannel)
		: streamToClassic.get(targetChannel);

	// Both maps only contain values from the shared channel identifier set.
	return (resolved ?? targetChannel) as TChannel;
}
