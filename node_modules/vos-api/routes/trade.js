var _ = require('underscore'),
    Core = require('../core/index'),
    Validator = require('../core/validator'),
    crypto = require('crypto'),
    qs = require('querystring');

function Call(endpoint, options, cb) {
    if(arguments.length === 2) {
         // there are no args!
         var cb = options;
         options = {};
    }

    var params = {};

    // check required params
    if(!_.isUndefined(options.requires)) {
        Validator.check(options.requires, options.params);
        _.each(options.requires, function(v, i) {
            params[v] = options.params[v]; 
        });
    }

    // check optional params
    if(!_.isUndefined(options.optional)) {
        _.each(options.optional, function(v, i) {
            if(!_.isUndefined(options.params[v])) {
                params[v] = options.params[v];
            }
        });
    }

    Core.post(endpoint, params, cb, Trade.settings);
}

var Trade = {
    place: function(opts, cb) {
        Call('/trade/place', {
            requires: 'type order_currency units payment_currency price'.split(' '),
            params: opts
        }, cb);
    },
    cancel: function(opts, cb) {
        Call('/trade/cancel', {
            requires: 'order_id'.split(' '),
            params: opts
        }, cb);
    }
};

module.exports = function(settings) {
    Trade.settings = settings;
    return Trade;
}
