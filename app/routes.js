var Entry = require('../app/models/entry');
var S = require('string');
//var fs = require('fs');
//var request = require('request');
var bcrypt   = require('bcrypt-nodejs');
var twilio = require('twilio')('ACe2cfa86a5ecd532993d2ef687178c134','806a24e78fdacab45ebfc72960f1f1a4');
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

    /*app.get('/entries', function(req, res) {
        var param = req.param('phone');

        Entry.find({
            'phoneNumber':param},
            {'date':1,'entry':1,'imgUrl':1,'_id':0
        }).lean().exec(function (err,entries){
            if (err) {
                console.log("error retrieving your entries.");
            }
            else {
                console.log(entries);
                res.render('entries.ejs',{entries:entries});
            }
        });
    });*/

    /*app.get('/images', function(req,res){
        Entry.find({"imgBody.contentType":"image/jpeg"},function(err,image){
            res.set("Content-Type",image.imgBody.contentType);
            res.send('entries.ejs',{image:image.imgBody.data});
        })
    });*/

    app.post('/sms',function(req,res){
        //var client = require('twilio')('ACe2cfa86a5ecd532993d2ef687178c134','806a24e78fdacab45ebfc72960f1f1a4');
        var textBody = req.body.Body;
        var textFromPre = req.body.From;
        var textFrom = S(textFromPre).strip('+').s;
        var mediaBody = req.body.MediaUrl0;
        var mediaContent = req.body.MediaContentType0;

        if (textBody == "URL"){
            twilio.sendMessage({
                to: textFromPre,
                from: '+16503005260',
                body: 'http://textblogger.herokuapp.com'
            }, function(err,responseData){
                if (err){
                    console.log("Error sending text message");
                }
            });
        }
        else {           
            /*twilio.sendMessage({
                to: textFromPre,
                from:'+16503005260',
                body:'Entry from ' + textFrom + ' with content: ' + textBody,
            }, function(err,responseData){
                if (err){
                    console.log("Error sending text message");
                }
            });*/

            var newEntry = new Entry();

            console.log(mediaBody);
            console.log(mediaContent);
    
            newEntry.phoneNumber = textFrom;
            newEntry.entry = textBody;
            newEntry.date = new Date();
            newEntry.imgUrl = mediaBody;

            newEntry.save(function(err) {
                if(!err){
                    console.log("saved");
                } else {
                    console.log("could not save :(");
                }
            });

            /*request({
                url:req.body.MediaUrl0,
                encoding: 'binary'
            }, function(err,res,body){
                if (!err){
                    body = new Buffer(body, 'binary').toString('base64');
                    console.log(body);

                    var newEntry = new Entry();
                    console.log(req.body.MediaUrl0);
                    console.log(req.body.MediaContentType0);
            
                    newEntry.phoneNumber = textFrom;
                    newEntry.entry = textBody;
                    newEntry.date = new Date();
                    newEntry.imgUrl = mediaBody;
                    newEntry.imgBody.data = body;
                    newEntry.imgBody.contentType = mediaContent;

                    newEntry.save(function(err) {
                        if(!err){
                            console.log("saved");
                        } else {
                            console.log("could not save :(");
                        }
                    });
                }
            });*/
            
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

    app.post('/sendcode',function(req,res){
        var phoneNumber = req.body.phonenumber;

        // post-MVP, add a datetime to this hash for added randomness; but when being compared,
        // the compare function's hash has to use same timestamp
        var phoneHash = bcrypt.hashSync(phoneNumber, bcrypt.genSaltSync(8), null);
        var phoneCode = S(phoneHash).truncate(7,'x').s;

        twilio.sendMessage({
            to:phoneNumber,
            from:'+16503005260',
            body: 'Enter the following code on the signup page: ' + phoneCode
        }, function(err, responseData){
            if (err){
                console.log("Error sending text message");
            }
        });
    });

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/profile', isLoggedIn, function(req, res) {
        Entry.find({
            'phoneNumber':req.user.phoneNumber},
            {'date':1,'entry':1,'imgUrl':1,'_id':0
        }).lean().exec(function (err,entries){
            if (err) {
                console.log("error retrieving your entries.");
            }
            else {
                console.log(entries);
                res.render('profile.ejs',{entries:entries,user:req.user});
            }
        });
        //res.render('profile.ejs', { user : req.user }); // get the user out of session and pass to template

        //console.log(req.user.phoneNumber);
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