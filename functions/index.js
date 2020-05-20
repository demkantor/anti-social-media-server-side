const functions = require('firebase-functions');

const app = require('express')();
const FBAuth = require('./util/fbAuth');
const { getAllDisregards, postNewDisregard } = require('./handlers/disregards');
const { signup, login } = require('./handlers/users');


// disregard routes //

// gets all the posts (disregards) from db
app.get('/disregard', getAllDisregards);
// route to add a new post... aka disregard
app.post('/disregard', FBAuth, postNewDisregard);


// user routes //

// signup route - with confirmation of valid email, pasword match
app.post('/signup', signup);
// logs in a user, validation for email and password fields before sending to firebase for more auth
app.post('/login', login);





exports.api = functions.https.onRequest(app);
