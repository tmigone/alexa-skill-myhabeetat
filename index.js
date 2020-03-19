const MyHabeetat = require('myhabeetat')

exports.handler = async function (request, context) {
  log("DEBUG:", "Request", JSON.stringify(request));
  if (request.directive.header.namespace === 'Alexa.Discovery' && request.directive.header.name === 'Discover') {
    log("DEBUG:", "Discover request", JSON.stringify(request));
    await handleDiscovery(request, context, "");
  }
  else if (request.directive.header.namespace === 'Alexa.PowerController') {
    if (request.directive.header.name === 'TurnOn' || request.directive.header.name === 'TurnOff') {
      log("DEBUG:", "TurnOn or TurnOff Request", JSON.stringify(request));
      handlePowerControl(request, context);
    }
  }

  async function handleDiscovery (request, context) {
    const token = request.directive.payload.scope.token.trim()
    let homes = await MyHabeetat.getHomes(token)
    let devices = await MyHabeetat.getDevices(token, homes[ 0 ])

    var payload = {
      "endpoints":
        [
          {
            "endpointId": devices[ 0 ].id,
            "manufacturerName": "Solidmation",
            "friendlyName": devices[ 0 ].name,
            "description": "BGH Smart Control device",
            "displayCategories": [ "THERMOSTAT" ],
            "cookie": {
              "home": devices[ 0 ].home,
              "model": devices[ 0 ].model,
              "endpoint": devices[ 0 ].endpoint
            },
            "capabilities":
              [
                {
                  "type": "AlexaInterface",
                  "interface": "Alexa",
                  "version": "3"
                },
                {
                  "interface": "Alexa.ThermostatController",
                  "version": "3",
                  "type": "AlexaInterface",
                  "properties": {
                    "supported": [ {
                      "name": "lowerSetpoint",
                      "name": "targetSetpoint",
                      "name": "upperSetpoint",
                      "name": "thermostatMode"
                    } ],
                    "retrievable": true
                  }
                }
              ]
          }
        ]
    };
    var header = request.directive.header;
    header.name = "Discover.Response";
    log("DEBUG", "Discovery Response: ", JSON.stringify({ header: header, payload: payload }));
    context.succeed({ event: { header: header, payload: payload } });
  }

  function log (message, message1, message2) {
    console.log(message + message1 + message2);
  }

  function handlePowerControl (request, context) {
    // get device ID passed in during discovery
    var requestMethod = request.directive.header.name;
    var responseHeader = request.directive.header;
    responseHeader.namespace = "Alexa";
    responseHeader.name = "Response";
    responseHeader.messageId = responseHeader.messageId + "-R";
    // get user token pass in request
    var requestToken = request.directive.endpoint.scope.token;
    var powerResult;

    if (requestMethod === "TurnOn") {

      // Make the call to your device cloud for control
      // powerResult = stubControlFunctionToYourCloud(endpointId, token, request);
      powerResult = "ON";
    }
    else if (requestMethod === "TurnOff") {
      // Make the call to your device cloud for control and check for success
      // powerResult = stubControlFunctionToYourCloud(endpointId, token, request);
      powerResult = "OFF";
    }
    var contextResult = {
      "properties": [ {
        "namespace": "Alexa.PowerController",
        "name": "powerState",
        "value": powerResult,
        "timeOfSample": "2017-09-03T16:20:50.52Z", //retrieve from result.
        "uncertaintyInMilliseconds": 50
      } ]
    };
    var response = {
      context: contextResult,
      event: {
        header: responseHeader,
        endpoint: {
          scope: {
            type: "BearerToken",
            token: requestToken
          },
          endpointId: "demo_id"
        },
        payload: {}
      }
    };
    log("DEBUG", "Alexa.PowerController ", JSON.stringify(response));
    context.succeed(response);
  }
};
