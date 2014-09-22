var request = require('request'),
    express = require('express');

var MAILGUN_KEY = "[MAILGUN-API-KEY-HERE]";

var models = {
	"32 GB Space Gray": "MG5A2LL%2FA",
  "32 GB Silver": "MG5C2LL%2FA",
};

// Handle the response from Apple's API
var result = function(model) {
	return function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	  	var obj = body.body.stores[0].partsAvailability;
	  	for (var foo in obj) {

  	  	var status = obj[foo].pickupDisplay;

	  	  console.log(model, status);

	  	  if (status === "available") {
	  		  sendPush(model);
	  	  }	else {
	  		  setTimeout(function() {
	  		   	check(model);
	  		  }, 10000);
        }
	  	}
	  }
	};
};

// Check for a model's availability
var check = function(model) {
	var url = "http://store.apple.com/us/retail/availabilitySearch?parts.0=" + models[model] + "&zip=15213";
	request({url:url,json:true}, result(model));
};

// Send an email saying things are good to go, or things are broken
var sendEmail = function(model, err) {
  var text = '';
  if(err) {
    text = err;
  } else {
    text = 'There is a ' + model + ' at Shadyside. \n\nhttp://store.apple.com/us/buy-iphone/iphone6';
  }

  // Actually send the request
  request.post('https://api.mailgun.net/v2/sandbox84112.mailgun.org/messages',{
    auth: { user: 'api:' + MAILGUN_KEY },
    form: {
      from: 'salemhilal@gmail.com',
      to: 'salemhilal@gmail.com',
      subject: 'iPhone Tracker',
      text: text
    }
  }, function(err, response, body) {
    console.error('Error sending mail:', err);
  });
};

// Start off the model checking
for (var model in models) {
	check(model);
}

// Expose a healthcheck endpoint
var app = express();

app.get('/ping', function(req, res){
  res.send('pong');
});

app.listen(1337);