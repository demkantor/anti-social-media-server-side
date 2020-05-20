const functions = require('firebase-functions');

const app = require('express')();
const FBAuth = require('./util/fbAuth');
const { getAllDisregards, postNewDisregard } = require('./routes/disregards');
const { signup, login, uploadImage, addUserDetails, getAuthenticatedUser } = require('./routes/users');


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
// lets a user upload profile pic
app.post('/user/image', FBAuth, uploadImage);
// lets user add bio
app.post('/user', FBAuth, addUserDetails);
// gets details about logged in user
app.get('/user', FBAuth, getAuthenticatedUser);





exports.api = functions.https.onRequest(app);
