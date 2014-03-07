var bitbot = require('./bitbot');

var marketName = process.argv[2];
var amount = process.argv[3];

if ((marketName.toString().indexOf('_') === -1 || amount < 0)) {
    throw new Error('INVALID MARKET NAME OR AMOUNT');
}
else {
    bitbot.start(marketName, amount);
}