var https = require('https');
var url = require('url');
var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

module.exports = Coinse;

function CoinEX(key, secret) {
  this.key = key;
  this.secret = secret;
  this.urlPost = 'https://coinex.pw/api/v2/';
  this.urlGet = 'https://coinex.pw/api/v2/';
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
  var url = this.urlGet + 'balances';

  this.getHTTPS(url, callback);
};

CoinEX.prototype.activeOrders = function(params, callback) {
  var urlSuffix = 'market/' + params.pair + '/';

  this.query('listorders', params, callback, urlSuffix);
};

CoinEX.prototype.trade = function(params, callback) {
  var urlSuffix = 'market/' + params['pair'] + '/';

  this.query('neworder', params, callback, urlSuffix);
};

CoinEX.prototype.cancelOrder = function(orderId, callback) {
  this.query('CancelOrder', { 'order_id': orderId }, callback);
};

CoinEX.prototype.query = function(method, params, callback, urlSuffix) {
  var _this = this;
  var content = {
    'method': method,
    'nonce': ++this.nonce,
  };

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

  var options = url.parse(this.urlPost + urlSuffix);
  options.method = 'POST';
  options.headers = {
    'key': this.key,
    'sign': sign,
    'content-type': 'application/x-www-form-urlencoded',
    'content-length': content.length
  };

  var req = https.request(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      data+= chunk;
    });
    res.on('end', function() {
      callback(false, JSON.parse(data));
    });
  });

  req.on('error', function(err) {
    callback(err, null);
  });

  req.write(content);
  req.end();
};

CoinEX.prototype.getHTTPS = function(getUrl, callback) {

  var options = url.parse(getUrl);
  options.method = 'GET';
  var req = https.request(options, function(res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      data+= chunk;
    });
    res.on('end', function() {
      callback(false, JSON.parse(data));
    });
  });

  req.on('error', function(err) {
    callback(err, null);
  });

  req.end();
};

CoinEX.prototype.trades = function(params, callback) {
  if (!params) params = {};
  if (!params.count) params.count = 100;

  var url = this.urlGet+params.pair+'/trades/'+params.count;

  this.getHTTPS(url, callback);
};

CoinEX.prototype.depth = function(params, callback) {
  if (!params) params = {};

  var url = this.urlGet+'market/'+params.pair+'/depth/';

  this.getHTTPS(url, callback);
};
