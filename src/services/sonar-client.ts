import streamDeck from '@elgato/streamdeck';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import type { Response } from "node-fetch";
import fetch from "node-fetch";
import type { AudioDevice, ClassicRedirection, DeviceRole, FallbackSetting, FallbackSettings, RedirectionEnum, SonarMode, StreamRedirection, StreamRedirectionEnum, VolumeSettings } from '../models/types/sonar-models.type';
import { logErrorAndThrow } from '../helpers/streamdeck-logger-helper';
import { ClassicVolumeSettingsEnumMap, RedirectionEnumMap, StreamRedirectionEnumMap } from '../models/converters/sonar-model-converts';

const logger = streamDeck.logger.createScope("sonar-client");

class SonarClient {
    private sonarUrl: string | undefined;
    private httpAgent: HttpAgent | undefined;
    private httpsAgent: HttpsAgent | undefined;

    constructor() { }

    // Updates Channel into Output to selected id.
    public async putStreamOutputAudioDeviceAsync(deviceId: string, redirectionId: StreamRedirectionEnum): Promise<void> {
        const channel = StreamRedirectionEnumMap.get(redirectionId);
        await this.doHttpRequestAsync(`/StreamRedirections/${channel}/deviceId/${deviceId}`, "PUT");
    }

    public async putOutputAudioDeviceAsync(deviceId: string, redirectionId: RedirectionEnum): Promise<void> {
        const channel = RedirectionEnumMap.get(redirectionId);
        await this.doHttpRequestAsync(`/ClassicRedirections/${channel}/deviceId/${deviceId}`, "PUT");
    }

    public async getSonarModeAsync(): Promise<SonarMode> {
        return this.doHttpRequestAsync<SonarMode>("/Mode", "GET");
    }

    // Gets all excluded devices (list options: chatRenderer, game, chatCapture, media, aux)
    public async getAllExcludedGameAudioDevicesAsync(): Promise<FallbackSetting[]> {
        const response = await this.doHttpRequestAsync<FallbackSettings>("/FallbackSettings/lists", "GET");
        return response.game.filter((device) => device.isActive && !device.isExcluded);
    }

    public getDeviceRedirectionsAsync(): Promise<ClassicRedirection[]> {
        return this.doHttpRequestAsync<ClassicRedirection[]>("/ClassicRedirections", "GET");
    }

    public getStreamDeviceRedirectionsAsync(): Promise<StreamRedirection[]> {
        return this.doHttpRequestAsync<StreamRedirection[]>("/StreamRedirections", "GET");
    }

    public async getAllOutputAudioDevicesAsync(): Promise<AudioDevice[]> {
        const response = await this.getAllAudioDevicesAsync();
        return response.filter((device) => device.role == "none" && device.dataFlow == "render");
    }

    public getAllAudioDevicesAsync(): Promise<AudioDevice[]> {
        return this.doHttpRequestAsync<AudioDevice[]>("/AudioDevices", "GET");
    }

    public getClassicVolumeSettingsAsync(): Promise<VolumeSettings> {
		return this.doHttpRequestAsync<VolumeSettings>(`/VolumeSettings/classic`, "GET");
    }

    public setClassicMasterVolumeAsync(updatedVolume: number): Promise<void> {
		return this.doHttpRequestAsync(`/VolumeSettings/classic/Master/Volume/${updatedVolume}`, "PUT");
	}

	public setClassicChannelVolumeAsync(updatedVolume: number, targetChannel: DeviceRole): Promise<void> {
        const channel = ClassicVolumeSettingsEnumMap.get(targetChannel);
		return this.doHttpRequestAsync(`/VolumeSettings/classic/${channel}/Volume/${updatedVolume}`, "PUT");
	}

    private async doHttpRequestAsync<TResponse>(route: string, method: string, searchParams?: Record<string, string>, body?: object): Promise<TResponse> {
        let uri = await this.generateHttpRequestUriAsync(route, searchParams);
        const requestBody = {
            agent: this.getHttpAgent(),
            method: method,
            body: !!body ? JSON.stringify(body) : undefined
        }

        let response: Response | undefined;

        try {
            response = await fetch(uri, requestBody);
        } catch (error: any) {
            // Sonar URL is not static and can change after requests.
            // We Retry in case of URL has changed or not found.
            if (!!error.code && error.code === "ECONNREFUSED") {
                logger.info("Sonar Client got ECONNREFUSED. Trying to regenerate HTTP URI");

                this.sonarUrl = await this.fetchSonarUrlAsync();
                uri = await this.generateHttpRequestUriAsync(route, searchParams);
                response = await fetch(uri, requestBody);
            }

            logger.info(`Error Body: ${JSON.stringify(error)}`)
        }

        if (response === undefined) 
            throw logErrorAndThrow(logger, `Response is undefined.`);

        if (!response.ok)
            throw logErrorAndThrow(logger, `Error doing a Sonar Client Request: StatusCode: ${response.status} Body: ${JSON.stringify(response.body)}`)

        return await response.json() as TResponse;
    }

    private async generateHttpRequestUriAsync(route: string, searchParams: Record<string, string> | undefined): Promise<string> {
        let uri = await this.getSonarUrlAsync() + route;
        if (!!searchParams)
            uri += uri + "?" + new URLSearchParams(searchParams).toString();

        return uri;
    }

    private async fetchSonarUrlAsync(): Promise<string> {
        const apiResponse = await fetch('https://127.0.0.1:6327/subApps', { agent: this.getHttpsAgent() });

        // TODO: Add proper Typescript type.
        const content = await apiResponse.json() as any;
        return content.subApps.sonar.metadata.webServerAddress;
    }

    private async getSonarUrlAsync() {
        this.sonarUrl ??= await this.fetchSonarUrlAsync();
        return this.sonarUrl;
    }

    private getHttpAgent() {
        this.httpAgent ??= this.generateHttpAgent();
        return this.httpAgent;
    }

    private generateHttpAgent(): HttpAgent {
        return new HttpAgent();
    }

    private generateHttpsUnauthorizedAgent(): HttpsAgent {
        return new HttpsAgent({ rejectUnauthorized: false });
    }

    private getHttpsAgent(): HttpsAgent {
        this.httpsAgent ??= this.generateHttpsUnauthorizedAgent();
        return this.httpsAgent;
    }
}

export default new SonarClient();