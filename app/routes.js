var Entry = require('../app/models/entry');
var Capsule = require('../app/models/capsule');
var fs = require('fs');
// S3 config
var aws = require('aws-sdk');

var AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || "xxxxx";
var AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || "xxxxx";
var S3_BUCKET = process.env.S3_BUCKET || "xxxxx";

var uuid = require('node-uuid');

// app/routes.js
module.exports = function(app, passport, aws) {
    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function(req, res) {
        res.render('login.html', { message: req.flash('loginMessage') });
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.html', { message: req.flash('loginMessage') }); 
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
        res.render('signup.html', { message: req.flash('signupMessage') });
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
        Capsule.find(
        {
            '$or':[
                {'creator':req.user.email},
                {'invitee':{$regex : ".*"+req.user.email+".*"}}
            ]
        },
            {'capsuleName':1,'creator':1,'invitee':1,'date':1,'_id':1,'endDate':1
        }).lean().exec(function (err,capsule){
            if (err) {
                console.log("error retrieving your capsules.");
            }
            else {
                //console.log(capsule);
                res.render('profile.html',{capsule:capsule,user:req.user});
            }
        });
        //res.render('profile.ejs',{user:req.user});
    });





        // get request to load capsule page
    app.get('/capsule', function(req,res){
        //console.log(req.query.id);

        Capsule.findOne({
            '_id': req.query.id}
        ).lean().exec(function (err,capsule){
            if (err){
                console.log("error retrieving your capules");
            }
            else{
                Entry.find({
                    'capsuleID': capsule._id}
                ).lean().exec(function (err,entry){
                    if (err){
                        console.log("error retrieving your capules");
                    }
                    else{
                        //console.log(entry);
                        res.render('capsule.html',{user:req.user, capsule:capsule, entry:entry});
                    }
                })
            }
        })        
    });

    // querying sum of authors' entries for d3 chart
    app.param('id', function(req,res ,next,id){
        //console.log(id);
        Entry.aggregate(
        {$match:{'capsuleID':id}},
        {$group:{_id:'$author',entrySum:{$sum:1}}},
        {$project:{_id:1,entrySum:1}},
        function(err,aggregate){
            if (err){
                console.log("error grouping entries by author");
            }
            else{
                // console.log("i am here");                
                // console.log(aggregate);
                req.aggregate = aggregate;
                next();
            }
        });  
    });

    // get request for d3 chart
    app.get('/getcapsule/:id', function(req,res){
        //console.log("inside getcapsule");
        //console.log(req.aggregate);
        res.json(req.aggregate);
    });

    // post request for adding new capsules
    app.post('/newcapsule',function(req,res){
        var newCapsule = new Capsule();
        var seconds = req.body.timer;

        var startDate = new Date();
        var endDate = new Date();
        endDate.setSeconds(endDate.getSeconds()+parseInt(seconds));

        var denominator = Date.parse(endDate) - Date.parse(startDate);
        var numerator = Date.parse(endDate) - Date.now();
        var ratio = numerator/denominator;

        newCapsule.capsuleName = req.body.capsuleName;
        newCapsule.date = startDate;
        newCapsule.creator = req.user.email;
        newCapsule.invitee = req.body.invitee;
        newCapsule.endDate = endDate;

        //console.log(req);

        newCapsule.save(function(err) {
            if(!err){
                console.log("saved");
            } else {
                console.log("could not save :(");
            }
        });

        res.redirect('/profile');
    });

    // post method for adding new entries
    app.post('/newpost',function(req,res){
        var newEntry = new Entry();

        newEntry.entry = req.body.capsuleEntry;
        newEntry.date = new Date();
        newEntry.capsuleID = req.body.capsuleID;
        newEntry.author = req.user.email;
        newEntry.imageSrc = "";

        //console.log(req);

        newEntry.save(function(err){
            if(!err){
                console.log("saved");
            } else {
                console.log("could not save :(");
            }
        });

        res.redirect("/capsule?id=" + req.body.capsuleID);
    });

    // post method for removing capsules
    app.post('/removepost',function(req,res){
        //console.log(req.body.capsuleID);

        Capsule.findOneAndRemove(
        {
            '_id':req.body.capsuleID
        },function (err){
            if (err) {
                console.log("error removing your capsule.");
            }
            else {
                console.log("removing your capsule")
                Entry.remove(
                    {
                        'capsuleID':req.body.capsuleID
                    },function (err){
                        if (err) {
                            console.log("error removing posts from capsule.");
                        }
                        else {
                            console.log("removing your posts from capsule")
                            res.redirect('/profile');
                        }
                    });
            }
        });   
    });

    // uploader
    app.get('/sign_s3', function(req, res){
        aws.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY});
        var mediaID = uuid.v1();
        // aws.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY});
        var s3 = new aws.S3();
        var s3_params = {
            Bucket: S3_BUCKET,
            Key: mediaID,
            Expires: 60,
            ContentType: req.query.s3_object_type,
            ACL: 'public-read'
        };
        s3.getSignedUrl('putObject', s3_params, function(err, data){
            if(err){
                console.log(err);
            }
            else{
                 var return_data = {
                     signed_request: data,
                     url: 'https://'+S3_BUCKET+'.s3.amazonaws.com/'+mediaID
                 };
                res.write(JSON.stringify(return_data));
                res.end();

                // save to mongo
                var newEntry = new Entry();
                var capsuleURL = req.headers['referer'].split("=");

                newEntry.date = new Date();
                newEntry.entry = "";
                newEntry.capsuleID = capsuleURL[1];
                newEntry.author = req.user.email;
                newEntry.imageSrc = return_data.url;

                newEntry.save(function(err){
                    if(!err){
                        console.log("saved");
                    } else {
                        console.log("could not save :(");
                    }
                });

                // not properly redirecting
                res.redirect("/profile");           
                //
            }
        });
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