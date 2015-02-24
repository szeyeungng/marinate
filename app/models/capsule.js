// app/models/user.js
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var capsuleSchema = mongoose.Schema({

    name    	 : String,
    entry        : String,
    date	     : Date

},{collection:'capsule'});

// create the model for users and expose it to our app
module.exports = mongoose.model('Capsule', capsuleSchema);