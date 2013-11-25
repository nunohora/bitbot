var util = require('util')

var Vircurex = require('./vircurex.js')

var vircurex = new Vircurex('YOUR_USERNAME_HERE', {
  'getBalance': 'YOUR_API_KEY',
  'createOrder': 'YOUR_API_KEY',
  'releaseOrder': 'YOUR_API_KEY',
  'deleteOrder': 'YOUR_API_KEY',
  'readOrder': 'YOUR_API_KEY',
  'readOrders': 'YOUR_API_KEY',
  'readOrderExecutions': 'YOUR_API_KEY',
  'createCoupon': 'YOUR_API_KEY',
  'redeemCoupon': 'YOUR_API_KEY',
})

var makeCallback = function(caption) {
  return function(err, data) {
    console.log('\n'+caption)
    if (!err) console.log(util.inspect(data, {colors: true, depth: 3}))
    else console.log(err)
  }
}

// quick test of all API functions
var tests = [
  { 'fn': 'getLowestAsk',          'params': ['btc', 'ltc']},
  { 'fn': 'getHighestBid',         'params': ['btc', 'ftc']},
  { 'fn': 'getLastTrade',          'params': ['btc', 'usd']},
  { 'fn': 'getVolume',             'params': ['btc', 'ltc']},
  { 'fn': 'getInfoForCurrency',    'params': []},
  { 'fn': 'getInfoForOneCurrency', 'params': ['ltc', 'usd']},
  { 'fn': 'getOrders',             'params': ['btc', 'usd']},
  { 'fn': 'getTrades',             'params': ['btc', 'usd', 0]},
  { 'fn': 'getBalances',           'params': []},
  { 'fn': 'getBalance',            'params': ['usd']},
  { 'fn': 'createOrder',           'params': ['buy', 1, 'btc', 0.1, 'usd']},
  { 'fn': 'releaseOrder',          'params': [12345]},
  { 'fn': 'deleteOrder',           'params': [12345]},
  { 'fn': 'readOrder',             'params': [12345]},
  { 'fn': 'readOrders',            'params': []},
  { 'fn': 'readOrderExecutions',   'params': [12345]},
  { 'fn': 'createCoupon',          'params': ['0.01', 'usd']},
  { 'fn': 'redeemCoupon',          'params': ['CouponCodeToTest']},
]

tests.forEach(function(test) {
  test.params.push(makeCallback(JSON.stringify(test)))
  vircurex[test.fn].apply(vircurex, test.params)
})
