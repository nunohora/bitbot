# Node.js Vircurex JSON Trading API

Simple API to Vircurex Trading platform

Current version 0.1

## Features

  * Full API (Public and Trade)
  * Asynchronous requests

## Install

```
npm install vircurex
```

## Example

```javascript
var Vircurex = require('vircurex')
var vircurex = new Vircurex('YourUsername', {
  'getBalance': 'your_api_key',
})

vircurex.getBalance('usd', function(err, data) {
  if (!err) console.log(data)
  else console.log(err)
})

/*
Console output:

{ account: 'JohnDoe',
  currency: 'usd',
  balance: '1234.0',
  availablebalance: '1234.0',
  timestamp: '2013-05-21T09:11:12+00:00',
  token: 'e489c434c5f5b01b3eba9d58eed98bcc4d2836f6c484cfebdf8e234bc4931c2a',
  function: 'get_balance',
  status: 0 }
*/
```

## Methods

```javascript
// Public API (no keys required)
getLowestAsk(base, alt, callback)
getHighestBid(base, alt, callback)
getLastTrade(base, alt, callback)
getVolume(base, alt, callback)
getInfoForCurrency(callback)
getInfoForOneCurrency(base, alt, callback)
getOrders(base, alt, callback)
getTrades(base, alt, since, calback)

// Trade API (keys required)
getBalances(callback)
getBalance(currency, callback)
createOrder(type, amount, currency1, unitprice, currency2, callback)
releaseOrder(orderId, callback)
deleteOrder(orderId, callback)
readOrder(orderId, callback)
readOrders(callback)
readOrderExecutions(orderId, callback)
createCoupon(amount, currency, callback)
redeemCoupon(coupon, callback)

// Other functions
errorMessage(code)
createError(code, msg, data)
extend(dst, src)
getTimeDate()
makeToken(items)
getUnixTimestamp()
apiCall(url, callback)
apiCallWithToken(command, key, params, callback)
```

[Vircurex API Documentation](https://vircurex.com/welcome/api)

## To do

  * Check callback token

## Feature requests

  * petermrg at ymail dot com

## Donate

  * BTC: 1GVRSmJzZpFoLvFnPNtdwPeVXh6t4t65PZ
  * LTC: LWSRwTDKVxE9BGziUzbUw7MkHz6KACVnAA

