// app/models/capsule.js
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var capsuleSchema = mongoose.Schema({

    capsuleName  : String,
    date 		 : Date,
    creator		 : String,
    invitee		 : String

},{collection:'capsule'});

// create the model for users and expose it to our app
module.exports = mongoose.model('Capsule', capsuleSchema);