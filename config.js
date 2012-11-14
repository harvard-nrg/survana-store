/** config.js
 *
 * @author Victor Petrov <victor.petrov@gmail.com>
 * @copyright (c) 2012, The Neuroinformatics Research Group at Harvard University.
 * @copyright (c) 2012, The President and Fellows of Harvard College.
 * @license New BSD License (see LICENSE file for details).
 */

exports.title = 'Survana Study';

exports.routes = {
    'POST': {
        '/': 'index'
    }
};

exports.routes = {
    'GET': {
        '/': 'index'
    },

    'POST': {
        '/': {'index': 'responses'}
    }
};

/* default database config */
exports.db = {
    name: 'store',
    host: 'localhost',
    port: 27017,
    //see https://github.com/christkv/node-mongodb-native/blob/master/docs/database.md
    server_options: {
        encoding: 'utf8',
        auto_reconnect: true
    },
    db_options: {
        native_parser: false, //couldn't get the BSON C++ parser to work on OS X
        strict: false            //false will prevent new collections from being autocreated
    }
};
