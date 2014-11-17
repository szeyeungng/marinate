// app/models/user.js
// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var entrySchema = mongoose.Schema({

    phoneNumber  : String,
    entry        : String,
    date	     : Date,
    imgUrl	     : String,
    imgBody		 :{data:Buffer,contentType:String}

},{collection:'entries'});

// create the model for users and expose it to our app
module.exports = mongoose.model('Entry', entrySchema);