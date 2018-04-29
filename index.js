'use strict'

const bgh = require('./lib/bgh')
const Promise = require('bluebird')

exports.handler = (request, context, callback) => {
  let directive = request.directive.header.name
  switch (directive) {
    case 'Discover': {
      handleDiscovery(request, callback)
      break
    }

    default: {
      const errorMessage = `Directive not supported: ${directive}`
      console.log('[ERROR] %s', errorMessage)
      callback(new Error(errorMessage))
    }
  }
}

function handleDiscovery (request, callback) {
  const userAccessToken = request.directive.payload.scope.token.trim()

  getDevicesFromBGHService(userAccessToken).then((endpoint) => {
    var payload = {
      endpoints: [ endpoint ]
    }
    var header = request.directive.header
    header.name = 'Discover.Response'
    console.log('DEBUG', 'Discovery Response: ', JSON.stringify({ header: header, payload: payload }))
    callback(null, { event: { header: header, payload: payload } })
  })
}

function getDevicesFromBGHService (token) {
  const device = new bgh.Device()
  device.setToken(token)

  return new Promise((resolve, reject) => {
    device.enumHomes().then((data) => {
      device.setHomeId(data[0].HomeID)
      device.GetDataPacket().then((data) => {
        let device = data.Devices[0]

        let endpoint = {
          endpointId: device.DeviceID,
          manufacturerName: 'BGH',
          friendlyName: device.Description,
          description: 'BGH Smart Home device.',
          displayCategories: ['THERMOSTAT'],
          cookie: {},
          capabilities: [{
            type: 'AlexaInterface',
            interface: 'Alexa.ThermostatController',
            version: '3',
            properties: {
              supported: [
                { 'name': 'lowerSetpoint' },
                { 'name': 'targetSetpoint' },
                { 'name': 'upperSetpoint' },
                { 'name': 'thermostatMode' }
              ],
              proactivelyReported: false,
              retrievable: true
            }
          }]
        }
        resolve(endpoint)
      }).catch((e) => {
        console.log(e)
      })
    }).catch((e) => {
      console.log(e)
    })
  })
}
