var Entry = require('../app/models/entry');
var Capsule = require('../app/models/capsule');

var fs = require('fs');
// var AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
// var AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
// var S3_BUCKET = process.env.S3_BUCKET;
var AWS_ACCESS_KEY = "AKIAJQKP4BUV6U4GLWCQ";
var AWS_SECRET_KEY = "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";
var S3_BUCKET = "marinatemedia";

// app/routes.js
module.exports = function(app, passport,aws) {
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

    // querying sum of authors' entries for d3 chart
    app.param('id', function(req,res ,next,id){
        console.log(id);
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
        console.log("inside getcapsule");
        console.log(req.aggregate);
        res.json(req.aggregate);
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
                //console.log(capsule);
                Entry.find({
                    'capsuleID': capsule._id}
                ).lean().exec(function (err,entry){
                    if (err){
                        console.log("error retrieving your capules");
                    }
                    else{
                        res.render('capsule.html',{user:req.user, capsule:capsule, entry:entry});
                        //console.log(entry);
                        // Entry.aggregate(
                        // {$match:{'capsuleID':req.query.id}},
                        // {$group:{_id:'$author',entrySum:{$sum:1}}},
                        // {$project:{_id:1,entrySum:1}},
                        // function(err,aggregate){
                        //     if (err){
                        //         console.log("error grouping entries by author");
                        //     }
                        //     else{
                        //         console.log(aggregate);
                        //         res.render('capsule.html',{user:req.user, capsule:capsule, entry:entry, aggregate:aggregate});
                        //     }
                        // }) 
                    }
                })
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

    app.post('/newpost',function(req,res){
        var newEntry = new Entry();

        newEntry.entry = req.body.capsuleEntry;
        newEntry.date = new Date();
        newEntry.capsuleID = req.body.capsuleID;
        newEntry.author = req.user.email;

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

    app.post('/newimage',function(req,res){
        console.dir(req.files);

        var newEntry = new Entry();

        newEntry.date = new Date();
        newEntry.capsuleID = req.body.capsuleID;
        newEntry.author = req.user.email;
        newEntry.image.data = fs.readFileSync(req.files.image.path);
        newEntry.image.contentType = req.files.image.mimetype;

        newEntry.save(function(err){
            if(!err){
                console.log("saved");
            } else {
                console.log("could not save :(");
            }
        });
        res.redirect("/capsule?id=" + req.body.capsuleID);
    });

    // app.get('/getimage', function (req, res) {
    //     Entry.find(
    //         {'image.contentType':{$exists:true}},
    //         {'image.data':1,'image.contentType':1}).lean().exec(function (err, doc) {
    //             if (err){
    //                 console.log("error retrieving image.");
    //             }
    //             else {
    //                 console.log(doc[0].image.data);
    //                 console.log(doc[0].image.contentType);

    //                 res.contentType(doc[0].image.contentType);
    //                 res.send(doc[0].image.data.buffer);
    //             }
    //         });
    //     });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    // uploader
    app.get('/sign_s3', function(req, res){
        aws.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY});
        var s3 = new aws.S3();
        var s3_params = {
            Bucket: S3_BUCKET,
            Key: req.query.s3_object_name,
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
                    url: 'https://'+S3_BUCKET+'.s3.amazonaws.com/'+req.query.s3_object_name
                };
                res.write(JSON.stringify(return_data));
                res.end();
            }
        });
    });

    app.post('/submit_form', function(req, res){
        avatar_url = req.body.avatar_url;
        console.log(avatar_url); // TODO: create this function
        // TODO: Return something useful or redirect
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