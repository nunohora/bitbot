var https = require('https');
var url = require('url');
var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

module.exports = CryptoTrade;

function CryptoTrade(apiKey, secret) {
  this.apiKey = apiKey;
  this.secret = secret;
  this.urlGet = 'https://crypto-trade.com/api/1/';
  this.urlPost = 'https://crypto-trade.com/api/1/private';
  this.nonce = this.getTimestamp(Date.now());
}

CryptoTrade.prototype.getTimestamp = function(time) {
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

CryptoTrade.prototype.getInfo = function(callback) {
  this.query('getinfo', null, callback);
};

CryptoTrade.prototype.trade = function(params, callback) {
  this.query('trade', params, callback);
};

CryptoTrade.prototype.depth = function(params, callback) {
  if (!params) {
    params = {};
  }

  if (!params.pair) {
    params.pair = 'btc_usd';
  }

  var url = this.urlGet+'depth/'+params.pair;

  this.getHTTPS(url, callback);
};

CryptoTrade.prototype.query = function(method, params, callback) {
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

  var options = url.parse(this.urlPost);

  options.method = 'POST';
  options.headers = {
    'Key': this.apiKey,
    'Sign': sign,
    'content-type': 'application/x-www-form-urlencoded',
    'content-length': content.length,
  };

  console.log(options);

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

CryptoTrade.prototype.ticker = function(params, callback) {
  if (!params) {
    params = {};
  }

  if (!params.pair) {
    params.pair = 'btc_usd';
  }

  var url = this.urlGet + params.pair + '/ticker';

  this.getHTTPS(url, callback);
};

CryptoTrade.prototype.getHTTPS = function(getUrl, callback) {

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