import streamDeck from '@elgato/streamdeck';
import https from 'https';
import http from 'http'
import fetch from "node-fetch";
import { GlobalSettings } from './models/global-settings-types';
import { ROTATE_OUTPUT_DEVICES } from './action-ids';
import { RotateOutputAudioDevice } from './actions/rotate-audio-output-device';

const logger = streamDeck.logger.createScope("rotate-audio-output-device");

export async function getSonarUrl(): Promise<string> {
    const apiResponse = await fetch('https://127.0.0.1:6327/subApps', { agent: generateHttpsUnauothorizedAgent(),});

    // TODO: Add proper Typescript type.
    const content = await apiResponse.json() as any;
    return content.subApps.sonar.metadata.webServerAddress;
}

// Shows What (Game, Media, Chat, Aux, Microphone) to what Device id is redirected.
export async function getDeviceRedirections(sonarApiUrl: string): Promise<any[]> {
    const apiResponse = await fetch(`${sonarApiUrl}/ClassicRedirections`, { agent: generateHttpUnauothorizedAgent(),});

    // TODO: Add proper Typescript type.
    const content = await apiResponse.json() as any;
    return content;
}

// Gets all audio (input, output) devices on users PC, included Sonar devices.
export async function getAllAudioDevices(sonarApiUrl: string): Promise<any[]> {
    const apiResponse = await fetch(`${sonarApiUrl}/AudioDevices`, { agent: generateHttpUnauothorizedAgent(),});

    const content = await apiResponse.json() as any;
    return content.filter((device: { dataFlow: string; role: string; }) =>
        device.role == "none" && device.dataFlow == "render");
}

// 1 - Game, 2 -> Chat, 7-> Media, 8 -> Aux

// Gets all audio (input, output) devices on users PC, included Sonar devices.
export async function setOutputAudioDevice(sonarApiUrl: string, deviceId: string, channel: number): Promise<void> {
    const apiResponse = await fetch(`${sonarApiUrl}/ClassicRedirections/${channel}/deviceId/${deviceId}`,
        {
            agent: generateHttpUnauothorizedAgent(),
            method: "PUT",
        });

    if (!apiResponse.ok)
        logger.error(JSON.stringify(apiResponse));

    return;
}

// Generate unauthorized agent as SteelSeries GG runs on local unauthorized (insecure) network.
export function generateHttpsUnauothorizedAgent(): https.Agent {
    return new https.Agent({ rejectUnauthorized: false });
}

export function generateHttpUnauothorizedAgent(): http.Agent {
    return new http.Agent();
}

// Gets all excluded devices (list options: chatRenderer, game, chatCapture, media, aux)
export async function getAllExcludedAudioDevices(sonarApiUrl: string, deviceList: string): Promise<any[]> {
    const apiResponse = await fetch(`${sonarApiUrl}/FallbackSettings/lists`, { agent: generateHttpUnauothorizedAgent(),});

    const content = await apiResponse.json() as any;
    return content[deviceList].filter((device: { isActive: string; isExcluded: string; }) =>
        device.isActive && !device.isExcluded);
}

export async function getCurrentSonarSettings(): Promise<GlobalSettings>
{
    // Fetch Sonar API Local API.
    const sonarUrl = await getSonarUrl();
    
    // Fetch Current Devices.
    const deviceRedirections = await getDeviceRedirections(sonarUrl);
    const gameRenderDevice = deviceRedirections.find((x: { id: string; }) => x.id == "game");

    // Gets current selected device
    const allDevices = await getAllAudioDevices(sonarUrl);

    const currentOutputDevice = allDevices.find((x: { id: any; }) => x.id == gameRenderDevice.deviceId);
		

    const globalSettings: GlobalSettings = {
        AllOutput: {
            deviceId: currentOutputDevice.id,
            deviceName: currentOutputDevice.friendlyName,
        }
    };

    return globalSettings;
}

export async function notifyAll()
{
    streamDeck.actions.forEach(async (action) => {
        switch (action.manifestId) {
            case ROTATE_OUTPUT_DEVICES:
                await RotateOutputAudioDevice.updateActionStateAsync(action);
                break;
        }
    });
}