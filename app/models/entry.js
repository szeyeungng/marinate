// app/models/entry.js
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var entrySchema = mongoose.Schema({

    entry        : String,
    date	     : Date,
    capsuleID	 : String

},{collection:'entry'});

// create the model for users and expose it to our app
module.exports = mongoose.model('Entry', entrySchema);