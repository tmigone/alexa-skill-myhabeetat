let alexa = require('alexa-app')
let app = new alexa.app('sample')

app.intent('number', {
  'slots': { 'number': 'AMAZON.NUMBER' },
  'utterances': ['say the number {-|number}']
},
function (request, response) {
  var number = request.slot('number')
  response.say('You asked for the number ' + number)
})

// connect the alexa-app to AWS Lambda
exports.handler = app.lambda()
