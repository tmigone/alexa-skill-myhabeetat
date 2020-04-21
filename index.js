const MyHabeetat = require('myhabeetat')

exports.handler = async function (request, context) {
  let { namespace, name: directive } = request.directive.header
  console.log('-------------------------')
  console.log(`DEBUG: Request received - Namespace: ${namespace} - Directive: ${directive}`)
  console.log(request)

  switch (namespace) {
    case 'Alexa':
      if (directive === 'ReportState') {
        console.log(`DEBUG: ReportState request ${JSON.stringify(request)}`)
        await handleStateReports(request, context)
      }
      break
    case 'Alexa.Discovery':
      if (directive === 'Discover') {
        console.log(`DEBUG: Discover request ${JSON.stringify(request)}`)
        await handleDiscovery(request, context)
      }
      break

    case 'Alexa.PowerController':
      if (directive === 'TurnOn' || directive === 'TurnOff') {
        console.log(`DEBUG: TurnOn or TurnOff Request ${JSON.stringify(request)}`)
        await handlePowerControl(request, context)
      }
      break

    case "Alexa.ThermostatController":
      if (directive === 'SetTargetTemperature' || directive === 'SetThermostatMode') {
        console.log(`DEBUG: SetTargetTemperature or SetThermostatMode Request ${JSON.stringify(request)}`)
        await handleThermostatControl(request, context)
      }
      break

    default: {
      console.log(`DEBUG:Namespace not supported: ${namespace}`)
    }
  }
}

async function handleDiscovery (request, context) {
  let { token } = request.directive.payload.scope
  let { messageId } = request.directive.header

  // Process directive --> MyHabeetat API calls
  let homes = await MyHabeetat.getHomes(token)
  let devices = await MyHabeetat.getDevices(token, homes[ 0 ])

  // Response
  let response = {
    event: {
      header: {
        namespace: 'Alexa.Discovery',
        name: 'Discover.Response',
        payloadVersion: '3',
        messageId: `${messageId}-R`
      },
      payload: {
        endpoints: buildEndpointsFromDevices(devices)
      }
    }
  }
  console.log(`DEBUG: Discovery Response ${JSON.stringify(response)}`)
  context.succeed(response)
}

async function handlePowerControl (request, context) {
  let { name: directive, correlationToken, messageId } = request.directive.header
  let { id, model, endpoint } = request.directive.endpoint.cookie
  let { token } = request.directive.endpoint.scope
  let result

  // Process directive --> MyHabeetat API calls
  if (directive === "TurnOn") {
    let success = await MyHabeetat.turnOnDevice(token, parseInt(model), endpoint)
    result = success ? "ON" : "OFF"
  }
  else if (directive === "TurnOff") {
    let success = await MyHabeetat.turnOffDevice(token, parseInt(model), endpoint)
    result = success ? "OFF" : "ON"
  }

  // Response
  let response = {
    context: {
      properties: [ {
        namespace: "Alexa.PowerController",
        name: "powerState",
        value: result,
        timeOfSample: new Date(),
        uncertaintyInMilliseconds: 50
      } ]
    },
    event: {
      header: {
        namespace: 'Alexa',
        name: 'Response',
        payloadVersion: '3',
        messageId: `${messageId}-R`,
        correlationToken: correlationToken
      },
      endpoint: {
        scope: {
          type: "BearerToken",
          token: token
        },
        endpointId: id
      },
      payload: {}
    }
  }
  console.log(`DEBUG: Alexa.PowerController ${JSON.stringify(response)}`)
  context.succeed(response)
}

async function handleThermostatControl (request, context) {
  let { name: directive, correlationToken, messageId } = request.directive.header
  let { id, model, endpoint } = request.directive.endpoint.cookie
  let { token } = request.directive.endpoint.scope
  let { thermostatMode, targetSetpoint } = request.directive.payload
  let result, propName

  // Process directive --> MyHabeetat API calls
  if (directive === "SetTargetTemperature") {
    let success = await MyHabeetat.setDeviceStatus(token, parseInt(model), endpoint, { targetTemperature: targetSetpoint.value })
    result = success ? targetSetpoint.value : null // TODO: handle MyHabeetat error
    propName = 'targetSetpoint'
  }
  else if (directive === "SetThermostatMode") {
    let success = await MyHabeetat.setDeviceStatus(token, parseInt(model), endpoint, { mode: thermostatMode.value })
    result = success ? thermostatMode.value : null // TODO: handle MyHabeetat error
    propName = 'thermostatMode'
  }


  // Response
  let response = {
    context: {
      properties: [ {
        namespace: "Alexa.ThermostatController",
        name: propName,
        value: result,
        timeOfSample: new Date(),
        uncertaintyInMilliseconds: 50
      } ]
    },
    event: {
      header: {
        namespace: 'Alexa',
        name: 'Response',
        payloadVersion: '3',
        messageId: `${messageId}-R`,
        correlationToken: correlationToken
      },
      endpoint: {
        scope: {
          type: "BearerToken",
          token: token
        },
        endpointId: id
      },
      payload: {}
    }
  }
  console.log(`DEBUG: Alexa.ThermostatController ${JSON.stringify(response)}`)
  context.succeed(response)
}

async function handleStateReports (request, context) {
  let { correlationToken, messageId } = request.directive.header
  let { id, home } = request.directive.endpoint.cookie
  let { token } = request.directive.endpoint.scope

  // Process directive --> MyHabeetat API calls
  let status = await MyHabeetat.getDeviceStatus(token, parseInt(home), parseInt(id))

  // Response
  let timestamp = new Date().toISOString()
  let response = {
    context: {
      properties: [ {
        namespace: "Alexa.ThermostatController",
        name: "targetSetpoint",
        value: {
          value: status.targetTemperature,
          scale: "CELSIUS"
        },
        timeOfSample: timestamp,
        uncertaintyInMilliseconds: 0
      }, {
        namespace: "Alexa.ThermostatController",
        name: "thermostatMode",
        value: status.mode,
        timeOfSample: timestamp,
        uncertaintyInMilliseconds: 0
      }, {
        namespace: "Alexa.TemperatureSensor",
        name: "temperature",
        value: status.temperature,
        timeOfSample: timestamp,
        uncertaintyInMilliseconds: 0
      }, {
        namespace: "Alexa.PowerController",
        name: "powerState",
        value: status.mode === 'OFF' ? 'OFF' : 'ON',
        timeOfSample: timestamp,
        uncertaintyInMilliseconds: 0
      } ]
    },
    event: {
      header: {
        namespace: 'Alexa',
        name: 'StateReport',
        payloadVersion: '3',
        messageId: `${messageId}-R`,
        correlationToken: correlationToken
      },
      endpoint: {
        scope: {
          type: "BearerToken",
          token: token
        },
        endpointId: id
      },
      payload: {}
    }
  }

  context.succeed(response)
}

function buildEndpointsFromDevices (devices) {
  let endpoints = []
  for (const device of devices) {
    endpoints.push({
      endpointId: device.id,
      manufacturerName: "Solidmation",
      friendlyName: device.name,
      description: "BGH Smart Control device",
      displayCategories: [ "THERMOSTAT" ],
      cookie: {
        id: device.id,
        name: device.name,
        home: device.home,
        model: device.model,
        endpoint: device.endpoint
      },
      capabilities: [
        {
          type: "AlexaInterface",
          interface: "Alexa.ThermostatController",
          version: "3",
          properties: {
            supported: [
              { name: "targetSetpoint" },
              { name: "thermostatMode" }
            ],
            proactivelyReported: false,
            retrievable: true
          },
          configuration: {
            supportedModes: [ "AUTO", "HEAT", "COOL", "OFF" ],
            supportsScheduling: false
          }
        },
        {
          type: "AlexaInterface",
          interface: "Alexa.PowerController",
          version: "3",
          properties: {
            supported: [ { name: "powerState" } ],
            proactivelyReported: false,
            retrievable: true
          }
        },
        {
          type: "AlexaInterface",
          interface: "Alexa.TemperatureSensor",
          version: "3",
          properties: {
            supported: [ { name: "temperature" } ],
            proactivelyReported: false,
            retrievable: true
          }
        },
        {
          type: "AlexaInterface",
          interface: "Alexa",
          version: "3"
        }
      ]
    })
  }
  return endpoints
}
