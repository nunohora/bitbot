var bitbot = require('./bitbot');

var marketName = process.argv[2];

if (marketName.toString().indexOf('_') === -1) {
    throw new Error('INVALID MARKET NAME');
}
else {
    bitbot.start(marketName);
}