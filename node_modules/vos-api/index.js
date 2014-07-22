var _ = require('underscore'),
    request = require('request');

var API = function(api_key, api_secret) {

    var settings = {
        api_key: api_key,
        api_secret: api_secret
    };


    return {
        Info: require('./routes/info')(settings),
        Public: require('./routes/public')(settings),
        Trade: require('./routes/trade')(settings)
    };
}

module.exports = API;
