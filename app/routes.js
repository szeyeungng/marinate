var Entry = require('../app/models/entry');
var S = require('string');
// app/routes.js
module.exports = function(app, passport) {

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function(req, res) {
        res.render('index.ejs'); // load the index.ejs file
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage') }); 
    });

    app.get('/entries', function(req, res) {
        var param = req.param('phone');

        Entry.find({
            'phoneNumber':param},
            {'date':1,'entry':1,'_id':0
        }).lean().exec(function (err,entries){
            if (err) {
                console.log("error retrieving your entries.");
            }
            else {
                console.log(entries);
                res.render('entries.ejs',{entries:entries});
            }
        });
    });

    app.post('/sms',function(req,res){
        var client = require('twilio')('ACe2cfa86a5ecd532993d2ef687178c134','806a24e78fdacab45ebfc72960f1f1a4');
        var textBody = req.body.Body;
        var textFromPre = req.body.From;
        var textFrom = S(textFromPre).strip('+').s;
        //var mediaBody = req.body.mediaUrl;
        //var mediaType = req.body.MediaContentType;

        if (textBody == "URL"){
            client.sendMessage({
                to: textFromPre,
                from: '+16503005260',
                body: 'http://textblogger.herokuapp.com/entries?phone='+textFrom
            }, function(err,responseData){
                if (err){
                    console.log("Error sending text message");
                }
            });
        }
        else {           
            client.sendMessage({
                to: textFromPre,
                from:'+16503005260',
                body:'Entry from ' + textFrom + ' with content: ' + textBody,
                mediaUrl: req.body.mediaUrl
            }, function(err,responseData){
                if (err){
                    console.log("Error sending text message");
                }
            });

            var newEntry = new Entry();
            
            newEntry.phoneNumber = textFrom;
            newEntry.entry = textBody;
            newEntry.date = new Date();

            newEntry.save(function(err) {
                if(!err){
                    console.log("saved");
                } else {
                    console.log("could not save :(");
                }
            });
            
        }
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/profile', isLoggedIn, function(req, res) {
        res.render('profile.ejs', { user : req.user }); // get the user out of session and pass to template
    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}