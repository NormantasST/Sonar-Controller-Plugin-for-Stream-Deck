# Sonar Controller - Plugin for Stream Deck

<img src="./docs/images/Marketplace Thumbnail.jpg" alt="Logo" width="500"/>

Stream Deck plugin to control Steel Series Sonar application. As this is a hobby non-commercial there are no promises to maintain and keep the project updated. 

## Donating / Commercial Use

This project is free to use for personal and commercial use. It would be nice to contribute any amount to my [PayPal](https://www.paypal.com/donate/?hosted_button_id=M7YRNV44SUZV6) as Software Developers can not live on *free* if you find value from the project :)

## Features

### General


- Data is Synced between Actions (buttons) using Events by notifying all Actions of a change. This allows to keep uniformed information between Actions.
- Data is periodically Synced from Sonar every 60 seconds in case changes happened from SteelSeries Sonar Application.

### Rotate Audio Output

- **Rotates your current output device.**
- User can select if they want to include or exclude `Excluded Devices`.

## Basic Setup

1. Install Node.js + NPM. Recommended to use [Node.js v20.20.0 (LTS)](https://nodejs.org/en/download). To manage Node versions it is recommended to use [Node Version Manager (NVM)](https://www.nvmnode.com/guide/download.html).

2. From root of the repository run `npm ci` to install all the node dependencies.

3. To run local build run `npm run watch`. 'Sonar Controller' plugin should appear on your Stream Deck.

> 📓 *Note:* To Package the plugin for publishing run `npm run package`. It will generate a `com.novil.steelseriessonar-by-novil.streamDeckPlugin` file. It is used to publish the plugin on [Makers Console](https://maker.elgato.com) which allows users to download the plugin via [Elgato Marketplace](https://marketplace.elgato.com).

## Special Thanks!

[SteelSeries GG - Sonar API reverse engineering](https://github.com/wex/sonar-rev) by Niko Hujanen for reverse engineering the OpenAPI definition which helped writing the tool.

## Developers

<img src="./docs/images/NovilLogo.png" alt="Logo" width="500"/>


Normantas Stankevičius - Lead Developer.