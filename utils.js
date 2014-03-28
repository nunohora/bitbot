var config      = require('./config'),
    _           = require('underscore'),
    fs          = require('fs'),
    nodemailer  = require('nodemailer');

module.exports = {

    calculateProfit: function (amount, price, currency, fee, decimals) {
        var profit = 0,
            potentialProfit,
            base = config.market.split("_")[0],
            alt = config.market.split("_")[1];

        if (currency === base) {
            profit = (amount * (1 - fee) * price);
            amount = (amount / (1 - fee));
        }
        else if (currency === alt) {
            potentialProfit = amount * price;
            profit = potentialProfit - (potentialProfit * fee);
        }

        return {
            amount: amount.toFixed(decimals),
            profit: profit.toFixed(8)
        };
    },

    calculateCost: function (amount, price, currency, fee, decimals) {
        var cost = 10000,
            potentialCost,
            tempAmount,
            base = config.market.split("_")[0],
            alt = config.market.split("_")[1];

        if (currency === base) {
            amount = (amount / (1 - fee));
            cost = amount * price;
        }
        else if (currency === alt) {
            tempAmount = amount * price;
            cost = tempAmount + (tempAmount * fee);
        }

        return {
            amount: amount.toFixed(decimals),
            cost: cost.toFixed(8)
        };
    },

    getBestArb: function (arrayOfArbs) {
        return _.max(arrayOfArbs, function (arb) {
            return +arb.finalProfit;
        }, this);
    },

    getSmallestDecimal: function (ex1, ex2) {
        return _.min([config[ex1.exchangeName].decimals, config[ex2.exchangeName].decimals]);
    },

    getTotalBalanceInExchanges: function (exchangeMarkets) {
        var totalBalances = {};

        _.each(exchangeMarkets, function (exchange) {
            var exchangeBalance = exchange.balances;

            _.each(exchangeBalance, function (currency, index) {
                if (totalBalances[index]) {
                    totalBalances[index] += currency;
                }

                else {
                    totalBalances[index] = currency;
                }
            }, this);
        }, this);

        return totalBalances;
    },

    orderByProfit: function (arrayOfArbs) {
        return _.sortBy(arrayOfArbs, function (arb) {
            return -(+arb.finalProfit);
        });
    },

    registerTrade: function (arb, totalBalances) {
        this.writeToFile(arb, totalBalances);

        this.sendMail(this.createChart());
    },

    writeToFile: function (arb, totalBalances) {
        var obj = JSON.stringify({
            arb: arb,
            totalBalances: totalBalances,
            timestamp: Date.now()
        });

        fs.appendFile('./tradeLog.log','%' + obj, function (err) {
            if (err) {
                console.log('error writing to file: ', err);
            }
        });
    },

    processFileData: function () {
        var file = fs.readFileSync('./tradeLog.log', {encoding: 'utf8'}),
            arbs = _.rest(file.split('%')),
            obj;

        var result = {
            ltc: {
                chart: {
                    x: [],
                    values: []
                },
                totalProfit: 0
            },
            btc: {
                chart: {
                    x: [],
                    values: []
                },
                totalProfit: 0
            }
        };

        _.each(arbs, function (arb) {
            obj = JSON.parse(arb);

            result.ltc.chart.x.push(obj.timestamp);
            result.ltc.chart.values.push(obj.totalBalances.ltc.toFixed(8));
            result.btc.chart.x.push(obj.timestamp);
            result.btc.chart.values.push(obj.totalBalances.btc.toFixed(8));
        }, this);

        result.ltc.totalProfit = (JSON.parse(_.last(arbs))['totalBalances'].ltc - JSON.parse(_.first(arbs))['totalBalances'].ltc).toFixed(8);
        result.btc.totalProfit = (JSON.parse(_.last(arbs))['totalBalances'].btc - JSON.parse(_.first(arbs))['totalBalances'].btc).toFixed(8);

        return result;
    },

    createChart: function () {
        var chart,
            imageUrls = [],
            graphData = this.processFileData();

        _.each(graphData.chart, function (coinData, idx) {
            chart = Quiche('line');

            chart.setTitle('Bot Progress');
            chart.addData(coinData.values, idx, '848482');
            chart.addAxisLabels('time', coinData.x);
            chart.setAutoScaling();
            chart.setTransparentBackground();

            imageUrls.push(chart.getUrl(true));
        }, this);

        return imageUrls;
    },

    sendMail: function (chartUrls) {
        var smtpTransport = nodemailer.createTransport("SMTP",{
            service: "Gmail",
            auth: {
                user: config.email.username,
                pass: config.email.password
            },
        });

        var html = '';

        _.each(chartUrls, function (url) {
            html += '<img src="' + url + '" />';
        }, this);

        var mailOptions = {
            from: "Bitbot <bitbot_message@gmail.com>", // sender address
            to: "nunohora@gmail.com", // list of receivers
            subject: "New trade", // Subject line
            html: html
        };

        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error){
                console.log(error);
            }else{
                console.log("Message sent: " + response.message);
            }
            // if you don't want to use this transport object anymore, uncomment following line
            //smtpTransport.close(); // shut down the connection pool, no more messages
        });
    }
};