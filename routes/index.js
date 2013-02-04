/** routes/index.js
 *
 * @author Victor Petrov <victor.petrov@gmail.com>
 * @copyright (c) 2012, The Neuroinformatics Research Group at Harvard University.
 * @copyright (c) 2012, The President and Fellows of Harvard College.
 * @license New BSD License (see LICENSE file for details).
 */

var async = require('async');

exports.index = function (req, res, next) {
    "use strict";

    var app         = req.app,
        db          = app.db,
        callback    = req.param('callback'),
        id          = req.param('id'),
        data        = req.param('data'),
        successful  = [],
        failed      = [];

    if (!id || !callback || !data) {
        return next(new ClientError('Invalid request'), ClientError.HTTP_BAD_REQUEST);
    }

    async.auto({
        'responseCollection': [function (next2) {
            db.collection('response', next2);
        }],

        'parsed': [function (next2) {
            var parsed;

            try {
                parsed = JSON.parse(data);
            } catch (err) {
                return next2(err);
            }

            return next2(null, parsed);
        }],

        'store': ['responseCollection', 'parsed', function (next2, results) {
            var data = results.parsed,
                meta;

            if (data.store === undefined) {
                data.store = [];
            }

            meta = {
                id:         app.keyID,
                timestamp:  (new Date()).valueOf(),
                client:     {}
            };

            //record IP?
            if (app.config.track.ip) {
                meta.client.ip = {
                    address:    req.connection.remoteAddress,
                    port:       req.connection.remotePort,
                    forwarded:  req.header('x-forwarded-for')
                };
            }

            if (app.config.track.referer) {
                meta.client.referer = req.header('referer');
            }

            //record user agent?
            if (app.config.track['user-agent']) {
                meta.client['user-agent'] = req.header('user-agent');
            }

            //store info about this request
            data.store.push(meta);

            results.responseCollection.insert(data, {safe: true, fsync: true}, next2);
        }],
    },
        function response(err) {
            if (err) {
                return res.send(callback + '(' + JSON.stringify({
                    success: 0,
                    message: err.message
                }));
            }

            successful.push(id);

            res.send(callback + '(' + JSON.stringify({
                success: 1,
                successful: successful,
                failed:     failed
            }) + ');');

        });
};

exports.responses = function (req, res, next) {
    "use strict";

    console.log(req.body);
};
