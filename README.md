
<p align="center">

<img src="https://www.tricamtech.com/TRiCAM_logos/Orange_logos/TRiCAM_orange_gray.png" width="300">

</p>


# Homebridge Blynk Server Dimmer Plugin

This is a Homebridge plugin for use with Blynk Server enabled IOT devices.

This is based on my own designed devices and can be used at your own risk.

## Blynk Requirements

This plugin requires your Blynk enabled device to use specific pins: (this will change on next revision)

V2 - On/Off of light and power status report.
V3 - Brightness set and report.

## Homebridge Config
{
    "accessory": "HTTP-Blynk-Dimmer",
    "name": "A Fancy Light",
    "token": "6a2e16cbc5874bed9ea966c286db03f0",
    "serverApi": "http://localhost:8080",
    "logLevel": 0,
    "pollingInterval": 6000,
    "timeout": 3000
}
