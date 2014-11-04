var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

router.get('/helloworld',function(req,res){
	res.render('helloworld',{title: 'Hello, World!'})
});

router.post('/sms',function(req,res){
	var client = require('twilio')('ACe2cfa86a5ecd532993d2ef687178c134','806a24e78fdacab45ebfc72960f1f1a4');
	var textBody = req.body.Body;
	var textDate = req.body.DateSent;
	var textFrom = req.body.From;
	var db = req.db;

	db.usercollection.insert({'phoneNumber':textFrom,'entry':textBody});

    client.sendMessage({
		to: textFrom,
		from:'+16503005260',
		body:'Blog post from ' + textFrom + ' sent on ' + textDate + ' with content: ' + textBody
	});
});

router.get('/entries', function(req, res) {
    var db = req.db;

    db.usercollection.find(function (err,usercollection){
        res.writeHead(200,{
            'Content-Type':'application/json;charset=utf-8'
        });
        res.end(JSON.stringify(usercollection));
    });
});

/* GET New User page. */
router.get('/newuser',function(req,res){
	res.render('newuser',{title:'Add New User'});
});

/* POST to Add User Service */
router.post('/adduser', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var userName = req.body.username;
    var userEmail = req.body.useremail;

    // Set our collection
    var collection = db.get('usercollection');

    // Submit to the DB
    collection.insert({
        "username" : userName,
        "email" : userEmail
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // If it worked, set the header so the address bar doesn't still say /adduser
            res.location("userlist");
            // And forward to success page
            res.redirect("userlist");
        }
    });
});

module.exports = router;
