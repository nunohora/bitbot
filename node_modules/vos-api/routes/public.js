var _ = require('underscore'),
    Core = require('../core/index'),
    Validator = require('../core/validator'),
    request = require('request'),
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

    Core.get(endpoint, params, cb, Public.settings);
}

var Public = {
    ticker: function(opts, cb) {
        Call('/public/ticker', {
            requires: 'order_currency payment_currency'.split(' '),
            params: opts
        }, cb);
    },
    orderbook: function(opts, cb) {
        Call('/public/orderbook', {
            requires: 'order_currency payment_currency'.split(' '),
            optional: 'group_orders round count'.split(' '),
            params: opts
        }, cb);
    }
};

module.exports = function(settings) {
    return Public;
}
