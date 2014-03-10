var https = require('https');
var url = require('url');
var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

module.exports = CoinEX;

function CoinEX(key, secret) {
  this.key = key;
  this.secret = secret;
  this.url = 'https://coinex.pw/api/v2/';
  this.nonce = this.getTimestamp(Date.now());
}

CoinEX.prototype.getTimestamp = function(time) {
  if (util.isDate(time)) {
    return Math.round(time.getTime() / 1000);
  }
  if (typeof time == 'string') {
    return this.getTimestamp(new Date(time));
  }
  if (typeof time == 'number') {
    return (time >= 0x100000000) ? Math.round(time / 1000) : time;
  }
  return 0;
};

CoinEX.prototype.getInfo = function(callback) {
  var urlSuffix = 'balances';

  this.query('balances', null, callback, urlSuffix, 'GET');
};

CoinEX.prototype.depth = function(params, callback) {
  var urlSuffix = 'orders/?tradePair=' + params.pair;

  this.query('balances', params, callback, urlSuffix, 'GET');
};

CoinEX.prototype.activeOrders = function(params, callback) {
  var urlSuffix = 'orders/own';

  this.query('listorders', params, callback, urlSuffix);
};

CoinEX.prototype.trade = function(params, callback) {
  var urlSuffix = 'orders';

  params = {
    'order': params
  };

  this.query('neworder', params, callback, urlSuffix, 'POST');
};

CoinEX.prototype.cancelOrder = function(orderId, callback) {
  this.query('CancelOrder', { 'order_id': orderId }, callback);
};

CoinEX.prototype.query = function(method, params, callback, urlSuffix, methodType) {
  var _this = this,
      content = params ? {} || '';

  if (!!params && typeof(params) == 'object') {
    Object.keys(params).forEach(function (key) {
      if (key == 'since' || key == 'end') {
        value = _this.getTimestamp(params[key]);
      }
      else {
        value = params[key];
      }
      content[key] = value;
    });
  }

  content = querystring.stringify(content);

  var sign = crypto
    .createHmac('sha512', new Buffer(this.secret, 'utf8'))
    .update(new Buffer(content, 'utf8'))
    .digest('hex');

  var options = url.parse(this.url + urlSuffix);
  options.method = methodType;
  options.headers = {
    'Content-type': 'application/json',
    'User-Agent' : 'whatevs',
    'API-Key': this.key,
    'API-Sign': sign
  };

  console.log('options: ', options);
  console.log('content: ', content);

  var req = https.request(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      data+= chunk;
    });
    res.on('end', function() {
      try {
        callback(false, JSON.parse(data));
      }
      catch (e) {
        console.log('failure!');
        console.log(e);
        callback(true, null);
      }
    });
  });

  req.on('error', function(err) {
    callback(err, null);
  });

  req.write(content);
  req.end();
};