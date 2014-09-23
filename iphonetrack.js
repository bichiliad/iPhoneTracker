var request = require('request'),
    express = require('express');

var MAILGUN_KEY = "[MAILGUN-API-KEY-HERE]",
    models = {
      "MG5A2LL/A": "Space Gray (32GB)",
	    "MG5C2LL/A": "Silver (32GB)"
    }, 
    cachedResults = {},
    timestamp = Date().toLocaleString();
    errors = [],
    maxErrors = 100,
    available = false;

// Handle the response from Apple's API
var result = function(model) {
  timestamp = Date().toLocaleString();
	return function (error, response, body) {
	  if (!error && response.statusCode == 200) {
      // Cache the results
	  	var parts = body.body.stores[0].partsAvailability;
      cachedResults = parts;

      // Pick through the iPhones
	  	for (var part in parts) {
	  	  if (parts[part].pickupDisplay == 'unavailable') {
	  		  sendEmail(models[part]);
          available = true;
	  	  }	else {
	  		  available = false;
        }
        setTimeout(function() {
            check();
          }, 10000);
  	  }

	  } else {
      // Push some error info.
      errors.push({
        time: Date().toLocaleString(),
        error: error,
        response: response
      });
      errors = errors.slice(-1 * maxErrors);

      sendEmail(null, 'There was an error requesting part availability: \n' + error);

    }
	};
};

// Generate and call url for Apple's availability endpoint
var check = function() {
	var url = 'http://store.apple.com/us/retail/availabilitySearch?zip=15213',
      i = 0;

  for (var model in models) {
    url += '&parts.' + i + '=' + encodeURIComponent(model);
    i++;
  }

	request({url:url,json:true}, result(model));
};

// Send an email saying things are good to go, or things are broken
var sendEmail = function(model, alert) {
  console.log("Sending email for ", model);

  var text = '';
  if(alert) {
    text = alert;
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
    if(err) {
      console.error('Error sending mail:', err);  
    }
  });
};

// Start off the model checking
check();

// Expose a healthcheck endpoint
var app = express();

app.get('/ping', function(req, res){
  res.send('pong');
});

app.get('/data', function(req, res) {
  res.json({
    status: cachedResults,
    errors: errors
  });
});

app.get('/', function(req, res) {
  if(available) {
    res.send('<center><h1>NOT YET</h1></center>');
  } else {
    res.send('<center><h1>BUY ONE</h1></center>');
  }
})

app.listen(1337);