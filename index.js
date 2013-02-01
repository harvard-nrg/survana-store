/** index.js
 *
 * @author Victor Petrov <victor.petrov@gmail.com>
 * @copyright (c) 2012, The Neuroinformatics Research Group at Harvard University.
 * @copyright (c) 2012, The President and Fellows of Harvard College.
 * @license New BSD License (see LICENSE file for details).
 */

/** app must have 'log' and 'dirname' properties */

var name = require("./package.json").name;

exports.config = require('./config');

exports.server = function (survana, express) {
    "use strict";

    var app = this.app = express.createServer(),
        mconfig = this.config;

    app.configure(function () {
        app.set('views', __dirname + '/views');
        app.set('view engine', 'ejs');
        app.set('view options', {
            layout: true
        });

        app.use(express.methodOverride());
        app.use(express.bodyParser());
        //static routes come before app.router, since there is no need to intercept requests to static files
        app.use(express.static(__dirname + '/public'));
        app.use(app.router);

        //global view helpers
        app.locals({
            config: mconfig      //all views have access to the config
        });

        app.log = survana.log.sub(name);
        app.dirname = __dirname;
    });

    //set up routes
    survana.routing(app, this.config);

    app.log.info('reporting in!');

    //make properties easily accessible from the 'app' object
    app.config = mconfig;
    app.dbserver = new survana.db(this.config.db);

    //open a database connection
    app.dbserver.connect(function (db) {
        app.db = db;
    },
        function (error) {
            throw error;
        });

    return this.app;
};
