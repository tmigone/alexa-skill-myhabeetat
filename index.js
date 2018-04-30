'use strict'

const BGH = require('bgh-smart-control')

exports.handler = async (request, context, callback) => {
  let directive = request.directive.header.name
  switch (directive) {
    case 'Discover': {
      await handleDiscovery(request, callback)
      break
    }

    default: {
      const errorMessage = `Directive not supported: ${directive}`
      console.log('[ERROR] %s', errorMessage)
      callback(new Error(errorMessage))
    }
  }
}

async function handleDiscovery (request, callback) {
  try {
    const userAccessToken = request.directive.payload.scope.token.trim()

    let endpoint = await getDevicesFromBGHService(userAccessToken)
    var payload = {
      endpoints: [ endpoint ]
    }
    var header = request.directive.header
    header.name = 'Discover.Response'
    console.log('DEBUG', 'Discovery Response: ', JSON.stringify({ header: header, payload: payload }))
    callback(null, { event: { header: header, payload: payload } })
  } catch (error) {
    console.log(error)
  }
}

async function getDevicesFromBGHService (token) {
  try {
    let bgh = new BGH()
    bgh.setAccessToken(token)
    let device = await bgh.getDevice()

    let endpoint = {
      endpointId: device.id,
      manufacturerName: 'BGH',
      friendlyName: device.name,
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
    return endpoint
  } catch (error) {
    console.log(error)
  }
}
