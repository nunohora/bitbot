# bitbot

A bitcoin arbitrage bot built in node.js and express.

It fetches the latest prices every X second from the APIs of the most popular bitcoin exchanges, compares their price and determines if there are any arbitrage opportunities. If so, places the orders and waits for their setlement.
