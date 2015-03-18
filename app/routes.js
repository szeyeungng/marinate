var Entry = require('../app/models/entry');
var Capsule = require('../app/models/capsule');

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


    app.get('/capsule', function(req,res){
        console.log(req.query.id);

        Capsule.findOne({
            '_id': req.query.id}
        ).lean().exec(function (err,capsule){
            if (err){
                console.log("error retrieving your capules")
            }
            else{
                console.log(capsule);
                res.render('capsule.ejs',{user:req.user, capsule:capsule});
            }
        })
        
    });

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
                {'invitee':req.user.email}
            ]
        },
            {'capsuleName':1,'creator':1,'invitee':1,'date':1,'_id':1
        }).lean().exec(function (err,capsule){
            if (err) {
                console.log("error retrieving your capsules.");
            }
            else {
                console.log(capsule);
                res.render('profile.ejs',{capsule:capsule,user:req.user});
            }
        });
        //res.render('profile.ejs',{user:req.user});
    });

    app.post('/newcapsule',function(req,res){
        var newCapsule = new Capsule();

        newCapsule.capsuleName = req.body.capsuleName;
        newCapsule.date = new Date();
        newCapsule.creator = req.user.email;
        newCapsule.invitee = req.body.invitee;

        console.log(req);

        newCapsule.save(function(err) {
            if(!err){
                console.log("saved");
            } else {
                console.log("could not save :(");
            }
        });

        res.redirect('/profile');
    });

    app.post('/newpost',function(req,res){
        var newEntry = new Entry();

        newEntry.entry = req.body.capsuleEntry;
        newEntry.date = new Date();
        newEntry.capsuleID = req.body.capsuleID;
        newEntry.author = req.user.email;

        console.log(req);

        newEntry.save(function(err){
            if(!err){
                console.log("saved");
            } else {
                console.log("could not save :(");
            }
        });

        res.redirect("/capsule?id=" + req.body.capsuleID);
    });

    app.post('/removepost',function(req,res){
        console.log(req.body.capsuleID);

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