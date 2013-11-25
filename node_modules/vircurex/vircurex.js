/**
 * Node.js Vircurex JSON Trading API
 * https://vircurex.com/welcome/api
 *
 * Version: 0.1
 * Author : petermrg <petermrg@ymail.com>
 * gitHub : https://github.com/petermrg/node-vircurex
 *
 * Donate:
 * BTC: 1GVRSmJzZpFoLvFnPNtdwPeVXh6t4t65PZ
 * LTC: LWSRwTDKVxE9BGziUzbUw7MkHz6KACVnAA
 */

var https = require('https')
var url = require('url')
var crypto = require('crypto')
var querystring = require('querystring')
var util = require('util')

module.exports = Vircurex

function Vircurex(username, keys) {
  this.username = username
  this.keys = this.extend({
    'getBalance': false,
    'createOrder': false,
    'releaseOrder': false,
    'deleteOrder': false,
    'readOrder': false,
    'readOrderExecutions': false,
    'createCoupon': false,
    'redeemCoupon': false,    
  }, keys)
  this.trxId = this.getUnixTimestamp()
  this.debug = false

  //this.secret = secret
  //this.urlPost = ''
  this.apiUrl = 'https://vircurex.com/api/'
}

/**
 * Returns the error message
 *
 * @param {Integer} n Error code
 * @return {String} Error message
 */
Vircurex.prototype.errorMessage = function(code) {
  switch (code) {
    // Vircurex error codes
    case 1: return 'Order does not exist'
    case 2: return 'Order does not belong to the user'
    case 3: return 'Order is already released'
    case 4: return 'Unknown account name'
    case 5: return 'Unknown order type'
    case 6: return 'Missing parameter'
    case 7: return 'Order is not released'
    case 8: return 'Unknown currency'
    case 9: return 'API not conigured, either not active or blank security word'
    case 10: return 'Insufficient funds. Your available balance is less than the quantity you have specified in the API call'
    case 12: return 'Currency is missing'
    case 13: return 'Currency is not allowed. Currency1 cannot be a fiat currency'
    case 14: return 'Order type is missing'
    case 15: return 'Unknown order type'
    case 16: return 'Trading the specified currency pair is not allowed'
    case 17: return 'Order is already closed'
    case 100: return 'The ID was used already within the last 10 minutes.'
    case 200: return 'The order volume (quantity * unitprice) must be at least 0.1'
    case 201: return 'Maximum number of open orders reached. A maximum of 50 are allowed'
    case 7999: return 'Functionis not active. You have not activated this function in your user profile'
    case 8000: return 'Timestamp is off by more than 5 Minutes.'
    case 8001: return 'API function is not activated'
    case 8002: return 'User is banned from using the API'
    case 8003: return 'Authentication failed'
    case 9999: return 'Unspecified error. Please contact customer service.'
    // custom error codes
    case 10000: return 'Error parsing JSON'
    default: return 'Unknown error code ('+code+')'
  }
}

/**
 * Creates an error object
 *
 * @param {Integer} error code
 * @param {String} error message (optional)
 * @param {String} data thar caused the error (optional)
 * @return {Object} the error
 */
Vircurex.prototype.createError = function(code, msg, data) {
  var err = { 'code': code }
  err.msg = (msg == undefined)? this.errorMessage(code) : msg
  if (data != undefined) err.data = data
  return err
}

/**
 * Extends a with the elements of b
 *
 * @param {Object} dst
 * @param {Object} src
 * @return {Object} extended object
 */
Vircurex.prototype.extend = function(dst, src) {
  for (var prop in src) dst[prop] = src[prop]
  return dst
}

/**
 * Returns formated UTC timedate string: yyyy-mm-ddThh:ss
 *
 * @return {String} datetime
 */
Vircurex.prototype.getTimeDate = function() {
  var time = new Date();
  time = time.getUTCFullYear() + '-' +
    ('00' + (time.getUTCMonth()+1)).slice(-2) + '-' +
    ('00' + time.getUTCDate()).slice(-2) + 'T' +
    ('00' + time.getUTCHours()).slice(-2) + ':' +
    ('00' + time.getUTCMinutes()).slice(-2) + ':' +
    ('00' + time.getUTCSeconds()).slice(-2);
  return time
}

/**
 * Returns the token used to validate private API requests
 *
 * @param {Array} items
 * @return {String} hex encoded token string
 */
Vircurex.prototype.makeToken = function(items) {
  return crypto.createHash('sha256').update(items.join(';'), 'utf8').digest('hex')
}

/**
 * returns a UNIX timestamp
 *
 * @return {Integer} seconds since UNIX epoch
 */
Vircurex.prototype.getUnixTimestamp = function() {
  return Math.floor(Date.now() / 1000)
}

/**
 * HTTPS API GET request. Parses JSON response
 *
 * @param {String} get
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.apiCall = function(get, callback) {
  if (this.debug) console.log(get)
  var _this = this
  var options = url.parse(get)
  options.method = 'GET'
  var req = https.request(options, function(res) {
    var data = ''
    res.setEncoding('utf8')
    res.on('data', function (chunk) {
      data+= chunk
    })
    res.on('end', function() {
      if (_this.debug) console.log('Raw data: '+data)
      try {
        if (_this.debug) console.log(data)
        data = JSON.parse(data)
        if (data.status != undefined) {
          if (data.status == 0) callback(false, data)
          else callback(_this.createError(data.status, data.statustxt), null)
        }
        else callback(false, data)
      }
      catch (e) {
        callback(_this.createError(10000))
      }
    })
  })

  req.on('error', function(err) {
    callback(err, null)
  })

  req.end()
}

/**
 * API call with security token
 *
 * @param {String} command
 * @param {String} key
 * @param {Array} params It's an Array of Arrays, i.e. [[key1, val1], [key2, val2]]
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.apiCallWithToken = function(command, key, params, callback) {
  var id = ++this.trxId
  var time = this.getTimeDate()
  var tokenItems = [key, this.username, time, id, command]
  var urlVars = ''
  params.forEach(function(v) {
    //if (typeof v[1] == 'string') v[1] = v[1].toUpperCase()
    tokenItems.push(v[1])
    urlVars+= '&'+v[0]+'='+v[1]
  })
  var url = this.apiUrl+command+'.json'+
    '?account='+this.username+
    '&id='+id+
    '&token='+this.makeToken(tokenItems)+
    '&timestamp='+time+
    urlVars
  this.apiCall(url, callback)
}

/**
 * Returns the lowest asking price for a currency pair.
 *
 * @param {String} base
 * @param {String} alt
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.getLowestAsk = function(base, alt, callback) {
  var url = this.apiUrl+'get_lowest_ask.json'+
    '?base='+base.toUpperCase()+
    '&alt='+alt.toUpperCase()
  this.apiCall(url, callback)
}

/**
 * Returns the highest bid price for a currency pair.
 *
 * @param {String} base
 * @param {String} alt
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.getHighestBid = function(base, alt, callback) {
  var url = this.apiUrl+'get_highest_bid.json'+
    '?base='+base.toUpperCase()+
    '&alt='+alt.toUpperCase()
  this.apiCall(url, callback)
}

/**
 * Returns executed unitprice of the last trade for a currency pair. Specify the base and alt currency name.
 *
 * @param {String} base
 * @param {String} alt
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.getLastTrade = function(base, alt, callback) {
  var url = this.apiUrl+'get_last_trade.json'+
    '?base='+base.toUpperCase()+
    '&alt='+alt.toUpperCase()
  this.apiCall(url, callback)
}

/**
 * Returns the trading volume within the last 24 hours for a currency pair. Specify the base and alt currency name.
 *
 * @param {String} base
 * @param {String} alt
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.getVolume = function(base, alt, callback) {
  var url = this.apiUrl+'get_volume.json'+
    '?base='+base.toUpperCase()+
    '&alt='+alt.toUpperCase()
  this.apiCall(url, callback)
}

/**
 * Returns a summary information for all supported currencies.
 *
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.getInfoForCurrency = function(callback) {
  var url = this.apiUrl+'get_info_for_currency.json'
  this.apiCall(url, callback)
}

/**
 * Returns a summary information for a currency pair.
 *
 * @param {String} base
 * @param {String} alt
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.getInfoForOneCurrency = function(base, alt, callback) {
  var url = this.apiUrl+'get_info_for_1_currency.json'+
    '?base='+base.toUpperCase()+
    '&alt='+alt.toUpperCase()
  this.apiCall(url, callback)
}

/**
 * Returns the complete orderbook for the given currency pair. Note: mutliple items may appear for the same price.
 *
 * @param {String} base
 * @param {String} alt
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.getOrders = function(base, alt, callback) {
  var url = this.apiUrl+'orderbook.json'+
    '?base='+base.toUpperCase()+
    '&alt='+alt.toUpperCase()
  this.apiCall(url, callback)
}

/**
 * Returns all executed trades of the past 7 days.
 * If the parameter "since" is provided, then only trades with an order ID greater than "since" will be returned.
 *
 * @param {String} base
 * @param {String} alt
 * @param {Integer} since
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.getTrades = function(base, alt, since, callback) {
  var url = this.apiUrl+'trades.json'+
    '?base='+base.toUpperCase()+
    '&alt='+alt.toUpperCase()+
    '&since='+(since|0)
  this.apiCall(url, callback)
}

/**
 * Gets all balances
 *
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.getBalances = function(callback) {
  this.apiCallWithToken(
    'get_balances',
    this.keys.getBalance,
    [],
    callback
  )
}

/**
 * Get balance of a currency
 *
 * @param {String} currency
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.getBalance = function(currency, callback) {
  this.apiCallWithToken(
    'get_balance',
    this.keys.getBalance,
    [['currency', currency]],
    callback
  )
}

/**
 * Creates a new order. A maximum of 100 open orders are allowed at any point in time.
 * The order is only saved but not released, hence it will not be traded before you release it.
 * Values for ordertype: BUY, SELL
 *
 * @param {String} Type
 * @param {Float} Amount
 * @param {String} currency1
 * @param {Float} unitPrice
 * @param {String} currency2
 * @param {Function} callback(err, data) 
 */
Vircurex.prototype.createOrder = function(type, amount, currency1, unitPrice, currency2, callback) {
  this.apiCallWithToken(
    'create_order',
    this.keys.createOrder,
    [ ['ordertype', type],
      ['amount', amount],
      ['currency1', currency1],
      ['unitprice', unitPrice],
      ['currency2', currency2] ],
    callback
  )
}

/** 
 * Release the order for trading
 *
 * @param {Integer} orderId
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.releaseOrder = function(orderId, callback) {
  this.apiCallWithToken(
    'release_order',
    this.keys.releaseOrder,
    [['orderid', orderId]],
    callback
  )
}

/** 
 * Deletes/closes an order
 *
 * @param {Integer} orderId
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.deleteOrder = function(orderId, callback) {
  this.apiCallWithToken(
    'delete_order',
    this.keys.deleteOrder,
    [['orderid', orderId]],
    callback
  )
}

/**
 * Returns order information
 *
 * @param {Integer} orderId
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.readOrder = function(orderId, callback) {
  this.apiCallWithToken(
    'read_order',
    this.keys.readOrder,
    [['orderid', orderId]],
    callback
  )
}

/**
 * Returns order information for all users' saved or released orders.
 * It does not return information on closed (either manually closed or closed due to order execution) or deleted orders.
 *
 * @param {Integer} orderId
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.readOrders = function(callback) {
  this.apiCallWithToken(
    'read_orders',
    this.keys.readOrders,
    [],
    callback
  )
}

/**
 * Returns the order execution info, i.e. the actual trades that were executed against the order
 *
 * @param {Integer} orderId
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.readOrderExecutions = function(orderId, callback) {
  this.apiCallWithToken(
    'read_orderexecutions',
    this.keys.readOrderExecutions,
    [['orderid', orderId]],
    callback
  )
}

/**
 * Creates a coupon
 *
 * @param {Integer} amount
 * @param {String} currency
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.createCoupon = function(amount, currency, callback) {
  this.apiCallWithToken(
    'create_coupon',
    this.keys.createCoupon,
    [ ['amount', amount],
      ['currency', currency] ],
    callback
  )
}

/**
 * Redeems the coupon and credits the amount to the users account
 *
 * @param {String?} coupon
 * @param {Function} callback(err, data)
 */
Vircurex.prototype.redeemCoupon = function(coupon, callback) {
  this.apiCallWithToken(
    'redeem_coupon',
    this.keys.redeemCoupon,
    [['coupon', coupon]],
    callback
  )
}

