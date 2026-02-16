import type { Logger } from "@elgato/utils/logging";

export function logErrorAndThrow(logger: Logger, error: string) {
    logger.error(error);
    throw new Error(error);
}