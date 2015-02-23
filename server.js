// setup =================================================
// tools
var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

// configuration =========================================
mongoose.connect('mongodb://szeyeungng:Password123!@ds047581.mongolab.com:47581/capsuul');

require('./config/passport')(passport); // pass passport for configuration

// setup our express app
app.use(morgan('dev')); // log every request to console
app.use(cookieParser()); //read cookies
app.use(bodyParser()); //get information from html forms

app.set('view engine','ejs');

// required for passport
app.use(session({secret:'ilovescotchscotchyscotchscotch'})); //session secret
app.use(passport.initialize());
app.use(passport.session()); //persistent login sessions
app.use(flash()); //use connect-flash for flash messages stored in session

// routes =================================================
require('./app/routes.js')(app,passport); //load our routes and pass in our app and fully configured passport

app.listen(port);
console.log('server has started');