
'use strict'

const request = require('request');
var pollingtoevent = require('polling-to-event');


let Service, Characteristic

module.exports = (homebridge) => {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-HTTP-Blynk-Dimmer', 'HTTP-Blynk-Dimmer', DimmerAccessory)
//  homebridge.registerAccessory('homebridge-http-relay', 'HTTP-SWITCH', RelayAccessory)
}

class DimmerAccessory{
  httpRequest(url, body, method, callback) {
    var callbackMethod = callback;

    request({
        url: url,
        body: body,
        method: this.httpMethod,
        timeout: this.timeout,
        rejectUnauthorized: false,
        forever:true

      },
      function(error, response, responseBody) {
        if (callbackMethod) {
          callbackMethod(error, response, responseBody)
        }
      })
  }
  constructor (log, config) {
    this.log = log
    this.config = config
    this.brightness = 0

    this.token = config.token;
    this.serverApi = config.serverApi || "http://localhost:8080"
    this.logLevel = config.logLevel || 0;
    this.httpMethod = "GET";
    this.timeout = config.timeout || 3000;
    this.pollingInterval = config.pollingInterval || 6000;

    this.aliveUrl = this.serverApi + "/" + this.token + "/isHardwareConnected";
    this.statusUrl = this.serverApi + "/" + this.token + "/get/V1";
    this.onUrl = this.serverApi + "/" + this.token + "/update/V1?value=1";
    this.offUrl = this.serverApi + "/" + this.token + "/update/V1?value=0";
    this.setBrightnessUrl = this.serverApi + "/" + this.token + "/update/V3?value=";
    this.getBrightnessUrl =  this.serverApi + "/" + this.token + "/get/V3";


    this.service = new Service.Lightbulb(this.config.name);

    var that = this;

    if (this.statusUrl) {
        that.log("loglevel: ",this.logLevel);
      var aliveemitter = pollingtoevent(function(done) {
        that.httpRequest(this.aliveUrl, "", "GET", function(error, response, body) {
          if(that.logLevel){that.log("aliveUrl: ",this.aliveUrl);}
          if(that.logLevel == 2){ //make 2!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
          that.log('Status:', response.statusCode);
          that.log('Headers:', JSON.stringify(response.headers));
          that.log('Response:', body);
          }
          if (error) {
            that.log('HTTP get alive function failed: %s', error.message);
            try {
              done(new Error("Network failure that must not stop homebridge!"));
            } catch (err) {
              that.log(err.message);
            }
          } else {
            if(that.logLevel){that.log('Alive Response:', body);
            }
            if(body=='false'){
              that.deviceAlive = 0;
                that.log("Device is Dead, Will Re-Poll Soon");
                try {
                  done(new Error("Device network failure that must not stop homebridge!"));
                } catch (err) {
                  that.log(err.message);
                }
            }else{
              that.deviceAlive = 1;
              if(that.logLevel){that.log("Device is alive, Will check powerStatus:");that.log("statusUrl: ",this.statusUrl);}
              that.httpRequest(this.statusUrl, "", "GET", function(error, response, body) {
                if (error) {
                  that.log('HTTP get status function failed: %s', error.message);
                  try {
                    done(new Error("Network failure that must not stop homebridge!"));
                  } catch (err) {
                    that.log(err.message);
                  }
                } else {
                  if(that.logLevel){that.log("process Status begin");}
                  done(null, body);
                }
              })
            }
          }
        })
      }, {
        interval: that.pollingInterval,
        eventName: "alivepoll"
      });

      aliveemitter.on("alivepoll", function(status) {
        if(that.logLevel){that.log("powerState:", status);              }
        that.service.getCharacteristic(Characteristic.On).updateValue(status);
        if (status){if(that.logLevel){that.log("Device is ON");}
        }else{if(that.logLevel){that.log("Device is OFF");}}
      });

      that.log("this.getBrightnessUrl: ",this.getBrightnessUrl);
      var statusemitter = pollingtoevent(function(done) {
        that.httpRequest(this.getBrightnessUrl, "", "GET", function(error, response, body) {
          if (error) {
            that.log('HTTP get brightness function failed: %s', error.message);
            try {
              done(new Error("Network failure that must not stop homebridge!"));
            } catch (err) {
              that.log(err.message);
            }
          } else {
            done(null, body);
          }
        })
      }, {
        interval: that.pollingInterval,
        eventName: "brightnessPoll"
      });

      statusemitter.on("brightnessPoll", function(responseBody) {
          var status =  responseBody.match(/"(.*?)"/)[1];
              status = (status*100)/1023;
        if(that.logLevel){that.log("Brightness Level:", status);}
          that.service.getCharacteristic(Characteristic.Brightness).updateValue(status);
        });

    }//end if status
  }//end constructer

  getServices () {
    const informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, 'TRiCAM IOT')
        .setCharacteristic(Characteristic.Model, 'http-dimmer')
        .setCharacteristic(Characteristic.SerialNumber, 'home-http-dimmer')

    this.service.getCharacteristic(Characteristic.On)
      .on('get', this.getOnCharacteristicHandler.bind(this))
      .on('set', this.setOnCharacteristicHandler.bind(this))

    this.service.getCharacteristic(Characteristic.Brightness)
      .on('get', this.getBrightness.bind(this))
      .on('set', this.setBrightness.bind(this));

    return [informationService, this.service]
  }

  getBrightness (callback) {
    request(`${this.getBrightnessUrl}`, (err, resp, body) => {
      if(err){
        this.log(err)
      }
      body=parseInt(body/10.24)
      callback(null, parseInt(body))
    })
  }

  setBrightness (value, callback) {
    value = this.brightness = (value*10.24)
    this.log('setting brightness ', value);
    this.log(`${this.setBrightnessUrl}${value}`);
    request(`${this.setBrightnessUrl}${value}`, (err, resp, body) => {
      callback(null, value)
    })
  }

  setOnCharacteristicHandler (value, callback) {
    this.isOn = value
    if(value === true){
      this.log(this.onUrl);
      request(this.onUrl, (err, resp, body) => {
        callback(null)
      })
    } else {
        this.log(this.offUrl);
      request(this.offUrl, (err, resp, body) => {
        callback(null)
      })
    }
  }

  getOnCharacteristicHandler (callback) {
    request(`${this.statusUrl}`, (err, resp, body) => {
      if(body == 0){
        this.isOn = false
      } else {
        this.log()
        this.isOn = true
      }
      callback(null, this.isOn)
    })
  }
}
