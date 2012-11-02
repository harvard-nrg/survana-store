exports.index = function (req, res) {
    "use strict";

    res.send('Survana Store');
};

exports.responses = function (req, res, next) {
    "use strict";

    console.log(req.body);
};
