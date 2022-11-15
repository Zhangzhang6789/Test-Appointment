require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
var GitHubStrategy = require("passport-github-oauth20").Strategy;
// var TwitterStrategy = require('passport-twitter').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const encrypt = require("mongoose-encryption");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little Secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb+srv://admin-NascentL:iwtmbtl19@cluster0.1lzktff.mongodb.net/secretDB", {
  useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  githubId: String,
  // twitterId: String,
  date: [{
    type: String
  }],
  location: [{
    type: String
  }]

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt,{secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
//Create or delete Cookies
// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

// passport.use(new GoogleStrategy({
//     clientID: process.env.CLIENT_ID_GOOGLE,
//     clientSecret: process.env.CLIENT_SECRET_GOOGLE,
//     callbackURL: "http://localhost:3000/auth/google/secrets"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     User.findOrCreate({
//       username: profile.displayName,
//       googleId: profile.id
//     }, function(err, user) {
//       return cb(err, user);
//     });
//   }
// ));

// passport.use(
//   new GitHubStrategy({
//       clientID: process.env.CLIENT_ID_GITHUB,
//       clientSecret: process.env.CLIENT_SECRET_GITHUB,
//       callbackURL: "http://www.localhost:3000/auth/github/secrets",
//     },
//     function(accessToken, refreshToken, profile, cb) {
//       User.findOrCreate({
//         username: profile.displayName,
//         githubId: profile.id
//       }, function(err, user) {
//         return cb(err, user);
//       });
//     }
//   )
// );

// passport.use(new TwitterStrategy({
//     consumerKey: process.env.CLIENT_ID_TWITTER,
//     consumerSecret: process.env.CLIENT_SECRET_TWITTER,
//     callbackURL: "http://127.0.0.1:3000/auth/twitter/secrets"
//   },
//   function(token, tokenSecret, profile, cb) {
//     User.findOrCreate({ username: profile.displayName,twitterId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));


app.get("/", function(req, res) {
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));

app.get('/auth/google/secrets',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get(
  "/auth/github",
  passport.authenticate("github", {
    scope: ["user"]
  })
);

app.get(
  "/auth/github/secrets",
  passport.authenticate("github", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

// app.get('/auth/twitter',
//   passport.authenticate('twitter'));
//
// app.get('/auth/twitter/secrets',
//   passport.authenticate('twitter', { failureRedirect: '/login' }),
//   function(req, res) {
//     // Successful authentication, redirect home.
//     res.redirect('/secrets');
//   });



app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res) {
  // const submittedSecret = req.body.secret;
  const submittedDate = req.body.date;
  const submittedLocation = req.body.location;
  User.findById(req.user._id, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.date.push(submittedDate);
        foundUser.location.push(submittedLocation);
        foundUser.save(function() {
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    passport: req.body.password
  });
  req.login(user, function(err) {
    if (err) {
      alert(err);
      res.redirect("/login");

    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });

  // User.findOne({email: req.body.username},function(err,foundUser){
  //         bcrypt.compare(req.body.password,foundUser.password,function(err,result){
  //           if(result === true){
  //           res.render("secrets");
  //           console.log("Successfully Matched User information!");
  //         } else {
  //        console.log("Unmatched information.");
  //      }
  //      });
  // });
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  if (req.isAuthenticated()) {
    User.find({
      "secret": {
        $ne: null
      }
    }, function(err, foundUsers) {
      if (err) {
        console.log(err);
      } else {
        console.log(foundUsers);
        if (foundUsers) {
          res.render("secrets", {
            usersWithSecrets: foundUsers
          });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res) {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.post("/register", function(req, res) {
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
  // bcrypt.hash(req.body.password, saltRounds, function(err,hash){
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: hash
  //   });
  //   newUser.save(function(err){
  //     if(!err){
  //       res.render("secrets");
  //     } else {
  //       console.log(err);
  //     }
  //   });
  // });
  // res.redirect("/");
});









let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);
