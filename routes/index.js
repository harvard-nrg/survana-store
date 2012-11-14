/** routes/index.js
 *
 * @author Victor Petrov <victor.petrov@gmail.com>
 * @copyright (c) 2012, The Neuroinformatics Research Group at Harvard University.
 * @copyright (c) 2012, The President and Fellows of Harvard College.
 * @license New BSD License (see LICENSE file for details).
 */


exports.index = function (req, res) {
    "use strict";

    res.send('Survana Store');
};

exports.responses = function (req, res, next) {
    "use strict";

    console.log(req.body);
};
