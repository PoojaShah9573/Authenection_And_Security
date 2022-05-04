//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");

const app = express();

//const md5 = require("md5");

//const bcrypt = require("bcrypt");
//const saltRounds = 10;

console.log(process.env.API_KEY);

//const encrypt =require("mongoose-encryption");

//console.log(md5("12345"));

const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose=require('passport-local-mongoose');


//Oauth passport
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const findOrCreate = require('mongoose-findorcreate');


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
  secret:"Our little Seceret.",
  resave: false,
  saveUninitialized:false
}));

//Now initalize it
app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true,useUnifiedTopology: true});
//mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId:String,
  secret: String
});

//for passport local package
userSchema.plugin(passportLocalMongoose);


//for findorcreate pligin
userSchema.plugin(findOrCreate);

//DEFINING THE SECRET FOR encryption
//const secret = "Thisisourlittlesecret.";

//userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields:["password"] });
//

const User = new mongoose.model("User", userSchema);

//pasport local COnfiguration
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
//passport.serializeUser(User.serializeUser());
//passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

passport.deserializeUser(function(id, done) {
User.findById(id, function(err, user) {
    done(err, user);
});
});



//configuting stratergy for oOauth
//google page connect gareko
passport.use(new GoogleStrategy({
clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"]}));

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page .
    res.redirect('/secrets');
  });





app.get("/login",function(req,res){
  res.render("login");
});


app.get("/register",function(req,res){
  res.render("register");
});

app.get("/secrets",function(req,res){

   /* if(req.isAuthenticated()){
   res.render("secrets");
    }else{
   res.redirrect("/login");
   }
 */

   User.find({
     "secret": {$ne : null}}, function(err, foundUsers){
       if(err){
         console.log(err);
     } else{
       if(foundUsers){
         res.render("secrets",{usersWithSecrets:foundUsers});
       }
     }
   });
});




app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirrect("/login");
  }
})

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
})

app.post("/submit",function(req,res){
 const submittedSecret = req.body.secret;

 console.log(req.user.id);
 User.findById(req.user.id,function(err,foundUser){
  if(err){
    console.log(err);
  }else{
    if(foundUser){
       foundUser.secret=submittedSecret;
       foundUser.save(function(){
         res.redirect("/secrets");
       });
    }
  }
});
});

/* app.post("/register",function(req,res){
// withh bycrypt
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
      // Store hash in your password DB.


      const newUser = new User({
        email: req.body.username,
        password: hash
      });

         newUser.save(function(err){
          if(err){
           console.log(err);
           } else {
            res.render("secrets");
           }
       });

  });
});

*/

app.post("/register",function(req,res){

 User.register(
   {username:req.body.username},req.body.password,function(err,user){
   if (err) {
     console.log(err);
     res.redirect("/register");
     }else{
     passport.authenticate("local")(req,res,function(){
       res.redirect("/secrets");
     });
   }
 });
});


/* app.post("/login",function(req,res){
  const username= req.body.username;
  //const password=md5(req.body.password);
   //md5 TO TURN INTO REVERSIAL HASH FUNVTION

   const password=req.body.password;

  User.findOne({email:username},function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        //if(foundUser.password === password){

          // Load hash from your password DB.
          bcrypt.compare(password,foundUser.password, function(err, result) {
          // result == true
            if(result === true ){
              res.render("secrets");
            }
          });
        //}
      }
    }
  });
});


*/


app.post("/login",function(req,res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user,function(err){
    if(err){
      console.log(err);
    } else{
      passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
});
});

app.listen(3000, function() {
    console.log("Server started on port 3000.");
});