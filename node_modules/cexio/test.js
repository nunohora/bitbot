var CEXIO = require('./cexio.js');

var publicAPI = new CEXIO('ghs_btc');


publicAPI.ticker(console.log);
publicAPI.trades({since:72713}, console.log);
publicAPI.order_book(console.log);

var clientId = '';
var key = '';
var secret = '';
var privateAPI = new CEXIO('ghs_btc',clientId,key,secret);

privateAPI.balance(console.log);
privateAPI.place_order('buy',1,0.1,function(err,order) {
  if (err) {
    console.log(err);
  } else {
    console.log(order);
    privateAPI.open_orders(function(err,orders) {
      if (err) {
        console.log(err);
      } else {
        console.log(orders);
        privateAPI.cancel_order(order.id,console.log);
      }
    });
  }
});

