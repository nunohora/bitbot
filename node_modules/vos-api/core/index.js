var _ = require('underscore'),
    request = require('request'),
    Exception = require('../core/exceptions'),
    Signature = require('../core/signature'),
    qs = require('querystring');

var Settings = {
    host: 'https://api.vaultofsatoshi.com'
};

Settings.set_options = function(endpoint, data, settings) {
    var options = {};

    if(endpoint.indexOf('/info') === 0) {
        // signature time!
        data.nonce = Signature.nonce();
        var signature = Signature.sign(endpoint, data, settings.api_secret);
        options.headers = {
            'Api-Key': settings.api_key,
            'Api-Sign': signature
        };
        options.form = data;
    }
    else {
        options.qs = data;
    }
    
    options.uri = Settings.host + endpoint;
    options.method = 'get';
    options.json = true;

    return options;
}

Settings.get = function(endpoint, data, cb, settings) {
    var options = Settings.set_options(endpoint, data, settings);
    request(options, function(e, r, b) {
        if(!e) {
            console.log(b);
            if(b.status === 'error') {
                console.log(options);
            }
            cb(b);
        }
        else {
            console.log(e);
        }
    });
};

Settings.post = function(endpoint, data, cb, settings) {
    var options = Settings.set_options(endpoint, data, settings);
    options.method = 'post';

    request(options, function(e, r, b){ 
        if(!e) {
            try {
                if(b.status  !== 'success') {
                    throw new Exception.Generic(b.message);
                }
                else {
                    cb(b);
                }
            }
            catch(e) {
                console.log(e.message);
            }
        }
        else {
            console.log(e);
        }
    });
}

module.exports = Settings;
