var fs          = require('fs'),
    _           = require('underscore'),
    nodemailer  = require('nodemailer'),
    config      = require('./config');

module.exports = {

    prepareEmail: function () {
        var file = fs.readFileSync('./tradeLog.log', {encoding: 'utf8'}),
            arbs = _.rest(file.split('%')),
            profits = {},
            html;

        var first = JSON.parse(_.first(arbs)),
            last = JSON.parse(_.last(arbs));

        profits['ltc'] = (last.totalBalances.ltc - first.totalBalances.ltc).toFixed(8);
        profits['btc'] = (last.totalBalances.btc - first.totalBalances.btc).toFixed(8);

        html = '<body><div>Total Profit for LTC: ' + profits['ltc'] + '</div><div>Total Profit for BTC: ' + profits['btc'] + '</div></body>';

        this.sendMail(html);
    },

    sendMail: function (html) {
        var smtpTransport = nodemailer.createTransport("SMTP",{
            service: "Gmail",
            auth: {
                user: config.email.username,
                pass: config.email.password
            },
        });

        var mailOptions = {
            from: "Bitbot <bitbot_message@gmail.com>",
            to: "nunohora@gmail.com",
            subject: "New Trade",
            html: html
        };

        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error){
                console.log(error);
            }else{
                smtpTransport.close();
                console.log("Message sent: " + response.message);
            }
        });
    }
}