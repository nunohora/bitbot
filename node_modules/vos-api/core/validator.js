var _ = require('underscore');

var Validator = {
    check: function(these, here) {
        if(!_.isArray(these)) {
            these = [these];
        }

        _.each(these, function(v) {
            if(_.isNull(here[v])) {
                throw Exception("Missing param: " + v);
            }
        });
    }
};

module.exports = Validator;
