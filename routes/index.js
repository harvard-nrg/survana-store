/** routes/index.js
 *
 * @author Victor Petrov <victor.petrov@gmail.com>
 * @copyright (c) 2012, The Neuroinformatics Research Group at Harvard University.
 * @copyright (c) 2012, The President and Fellows of Harvard College.
 * @license New BSD License (see LICENSE file for details).
 */

var async = require('async'),
    ursa  = require('ursa');

function createKey(key) {
    var result = "",
        wrap = key.match(/-----[A-Za-z0-9 ]+-----/g),
        data = key.replace(/-----[A-Za-z0-9 ]+-----/g, ""),
        result = wrap[0],
        piece;

    do {
        piece = data.slice(0,64);
        data = data.substr(64,data.length);
        result += "\n" + piece;
    } while (piece && piece.length);

    return result + wrap[1];
}

exports.index = function (req, res, next) {
    res.send('Hello :)');
};

exports.store = function (req, res, next) {
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
        }]
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

exports.download = function (req, res, next) {
    "use strict";

    var app = req.app,
        db  = app.db,
        payload = req.body,
        keys = [],
        access = {
             privateKeyId: payload.privateKeyId,
             items: []
        }, //audit trail
        i;


    for (i in payload) {
        if (payload.hasOwnProperty(i)) {
            keys.push(i);
        }
    }

    async.auto({
        'responseCollection': [function (next2) {
            db.collection('response', next2);
        }],

        'auditCollection': [function (next2) {
            db.collection('audit', next2);
        }],

        'data': ['responseCollection', function (next2, results) {
            results.responseCollection.find({'key.id': {'$in':keys}}, next2);
        }],

        'verified': ['data', function (next2, results) {
            var items = [],
                keys  = {},
                publicKey,
                verifier,
                clientSignature;

            //use the public key of each document to verify the signature sent by the client to ensure that the key ID
            //was not guessed by accident and that the key id matches the correct private key (effectively ensuring that
            //the client will be able to decrypt the data)
            results.data.each(function (err, item) {
                    if (item !== null) {
                        if (!keys[item.key.id]) {
                            //make sure there's a PEM value for the public key
                            if (item.key.pem === undefined) {
                                console.error("ERROR: No public key (PEM) entry found for item. Skipping.", item);
                                return;
                            }

                            keys[item.key.id] = ursa.coercePublicKey(createKey(item.key.pem));
                        }

                        clientSignature = payload[item.key.id];
                        publicKey = keys[item.key.id];

                        //create signature verifier
                        verifier = ursa.createVerifier('sha256');
                        verifier.update(item.key.id);

                        try {
                            //skip
                            if (!verifier.verify(publicKey, clientSignature, 'hex')) {
                                console.error('Wrong signature for key ' + item.key.id);
                                return;
                            }
                        } catch (exrr) {
                            console.error('Cannot verify signature for key ' + item.key.id);
                            return;
                        }

                        //no need to send the public key
                        delete item.key.pem;

                        items.push(item);

                        access.items.push({
                            'key_id': item.key.id,
                            'object_id': item._id
                        });
                    } else {
                        next2(null, items);
                    }
            });
        }],

        'track': ['auditCollection', 'verified', function (next2, results) {
            results.auditCollection.insert(access, {safe: false, fsync: false}, next2);
        }]
    },
        function response (err, results) {
            if (err) {
                return next(err);
            }

            //send the data to the client
            res.send(JSON.stringify({
                'success': 1,
                'data': results.verified
            }));
        });
};
