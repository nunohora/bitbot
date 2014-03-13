node-mcxcow
=====

A node.js client for mcxNOW Altcoin exchange (https://mcxnow.com)

## Installation

node-mcxnow is available as `mcxnow` on npm.

```
npm install mcxnow
```

## Usage

```javascript
var mcxnow = require('mcxnow'),
    mcxPrivate = new mcxnow("username", "password"),
    // No need to provide keys if you're only using the public api methods.
    mcxPublic = new mcxnow();

// Public API method call.
mcxPublic.getTicker("MAX", function(err, data) {
    if(err) throw err;

    console.log(data);
});

// Trade API method call.  
mcxPrivate.trade("MAX", amount, price, '0' /* 0=sell, 1=buy */, function(err, data) {
  if(err) throw err;

  console.log(data);
});
```

## License

This module is [ISC licensed](https://github.com/memeyou/node-mcxnow/blob/master/LICENSE.txt).
