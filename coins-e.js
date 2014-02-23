/**
 * Node.js BTC-E Trading API
 * https://btc-e.com/api/documentation
 *
 * Version: 0.4.2
 * Author : petermrg <petermrg@ymail.com>
 * gitHub : https://github.com/petermrg/node-btce
 *
 * Donate:
 * BTC: 1GVRSmJzZpFoLvFnPNtdwPeVXh6t4t65PZ
 * LTC: LWSRwTDKVxE9BGziUzbUw7MkHz6KACVnAA
 *
 * Want new features?, just ask me!
 */

var https = require('https');
var url = require('url');
var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

module.exports = Coinse;

function Coinse(key, secret) {
  this.key = key;
  this.secret = secret;
  this.urlPost = 'https://www.coins-e.com/api/v2/';
  this.urlGet = 'https://www.coins-e.com/api/v2/';
  this.nonce = this.getTimestamp(Date.now());
}

/**
 * getTimestamp: converts a Date object, a string, or a JS timestamp to a UNIX timestamp.
 *
 * @param {Mixed} time
 */
Coinse.prototype.getTimestamp = function(time) {
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

/**
 * getInfo: returns the information about the user's current balance, API key privileges,
 * the number of transactions, the number of open orders and the server time
 *
 * @param {Function} callback(err, data)
 */
Coinse.prototype.getInfo = function(callback) {
  this.query('getwallets', null, callback, 'wallet/all/');
};

/**
 * transHistory: returns the transactions history.
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * parameter | oblig | description                                      | type      | default
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * from      | No    | the number of the order to start displaying with | numerical | 0
 * count     | No    | The number of orders for displaying              | numerical | 1000
 * from_id   | No    | id of the order to start displaying with         | numerical | 0
 * end_id    | No    | id of the order to finish displaying             | numerical | Infinity
 * order     | No    | sorting                                          | order[1]  | DESC
 * since     | No    | when to start displaying                         | time[2]   | 0
 * end       | No    | when to finish displaying                        | time[2]   | Infinity
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * [1] ASC or DESC
 * [2] Accepts UNIX timestamps, Date objects and strings like '2013-01-02 20:23'
 *
 * @param {Object} params
 * @param {Function} callback(err, data)
 */
Coinse.prototype.transHistory = function(params, callback) {
  this.query('TransHistory', params, callback);
};

/**
 * orderList: returns your open orders/the orders history.
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * parameter | oblig | description                                      | type      | default
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * from      | No    | the number of the order to start displaying with | numerical | 0
 * count     | No    | The number of orders for displaying              | numerical | 1000
 * from_id   | No    | id of the order to start displaying with         | numerical | 0
 * end_id    | No    | id of the order to finish displaying             | numerical | Infinity
 * order     | No    | sorting                                          | order[1]  | DESC
 * since     | No    | when to start displaying                         | time[2]   | 0
 * end       | No    | when to finish displaying                        | time[2]   | Infinity
 * pair      | No    | the pair to display the orders                   | pair[3]   | all pairs
 * active    | No    | is it displaying of active orders only?          | 1 or 0    | 1
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * [1] ASC or DESC
 * [2] Accepts UNIX timestamps, Date objects and strings like '2013-01-02 20:23'
 * [3] Example: btc_usd
 *
 * @param {Object} params
 * @param {Function} callback(err, data)
 */
Coinse.prototype.activeOrders = function(params, callback) {
  var urlSuffix = 'market/' + params.pair + '/';

  this.query('listorders', params, callback, urlSuffix);
};

/**
 * trade: Trading is done according to this method
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * parameter | oblig | description                                      | type      | default
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * pair      | Yes   | pair                                             | pair[1]   | -
 * type      | Yes   | the transaction type                             | trans[2]  | -
 * rate      | Yes   | the rate to by/sell                              | numerical | -
 * amount    | Yes   | the amount which is necessary to buy/sell        | numerical | -
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * [1] Example: btc_usd
 * [2] buy or sell
 *
 * @param {Object} params
 * @param {Function} callback(err, data)
 */
Coinse.prototype.trade = function(params, callback) {
  var urlSuffix = 'market/' + params['pair'] + '/';

  this.query('neworder', params, callback, urlSuffix);
};

/**
 * cancelOrder: Cancellation of the order
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * parameter | oblig | description                                      | type      | default
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * order_id  | Yes   | Order id                                         | numerical | -
 * ----------+-------+--------------------------------------------------+-----------+-----------
 *
 * @param {Object} params
 * @param {Function} callback(err, data)
 */
Coinse.prototype.cancelOrder = function(orderId, callback) {
  this.query('CancelOrder', { 'order_id': orderId }, callback);
};

/**
 * query: Executes raw query to the API
 *
 * @param {String} method
 * @param {Object} params
 * @param {Function} callback(err, data)
 */
Coinse.prototype.query = function(method, params, callback, urlSuffix) {
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

/**
 * getHTTPS: Simple HTTPS GET request
 *
 * @param {String} getUrl
 * @param {Function} callback(err, data)
 */
Coinse.prototype.getHTTPS = function(getUrl, callback) {

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

/**
 * trades: Gets a list of the last trades in BTC-E
 *
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * parameter | oblig | description                                      | type      | default
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * count     | No    | The number of orders for displaying              | numerical | 100
 * pair      | No    | the pair to display                              | pair[1]   | btc_usd
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * [1] Example: btc_usd
 *
 * @param {Object} params
 * @param {Function} callback(err, data)
 */
Coinse.prototype.trades = function(params, callback) {
  if (!params) params = {};
  if (!params.count) params.count = 100;

  var url = this.urlGet+params.pair+'/trades/'+params.count;

  this.getHTTPS(url, callback);
};

/**
 * depth: get asks and bids
 *
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * parameter | oblig | description                                      | type      | default
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * count     | No    | The number of items for displaying               | numerical | 100
 * pair      | No    | the pair to display                              | pair[1]   | btc_usd
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * [1] Example: btc_usd
 *
 * @param {Object} params
 * @param {Function} callback(err, data)
 */
Coinse.prototype.depth = function(params, callback) {
  if (!params) params = {};

  var url = this.urlGet+'market/'+params.pair+'/depth/';

  this.getHTTPS(url, callback);
};

/**
 * ticker: Get price and volume information
 *
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * parameter | oblig | description                                      | type      | default
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * pair      | No    | the pair to display                              | pair[1]   | btc_usd
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * [1] Example: btc_usd
 *
 * @param {Object} params
 * @param {Function} callback(err, data)
 */
Coinse.prototype.ticker = function(params, callback) {
  if (!params) params = {};
  if (!params.pair) params.pair = 'btc_usd';

  var url = this.urlGet+params.pair+'/ticker';

  this.getHTTPS(url, callback);
};

/**
 * fee: Get the fee for transactions
 *
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * parameter | oblig | description                                      | type      | default
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * pair      | No    | the pair to display                              | pair[1]   | btc_usd
 * ----------+-------+--------------------------------------------------+-----------+-----------
 * [1] Example: btc_usd
 *
 * @param {Object} params
 * @param {Function} callback(err, data)
 */
Coinse.prototype.fee = function(params, callback) {
  if (!params) params = {};

  var url = this.urlGet+params.pair+'/fee';

  this.getHTTPS(url, callback);
};
