var _ = require('underscore'),
    crypto = require('crypto'),
    time = require('time'),
    qs = require('querystring');


var Signature = {
    sign: function(endpoint, data, secret) {
        if(_.isObject(data)) {
            data = qs.stringify(data); 
        }

        var signer = crypto.createHmac('sha512', secret);
        var signature = signer.update(endpoint + (new Buffer([0x00])) + data).digest('hex');

        var b = new Buffer(signature);

        return b.toString('base64');
    },
    nonce: function() {
        var now = new Date(), 
            sec = time.time(),
            usec = now.getMilliseconds() + '000',
            date;
        
        date =  parseInt(sec + '' + usec);

        return date;
    }
}

module.exports = Signature;
