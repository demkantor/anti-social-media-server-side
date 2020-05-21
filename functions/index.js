const functions = require('firebase-functions');

const app = require('express')();
const FBAuth = require('./util/fbAuth');
const { db } = require('./util/admin');
const { 
    getAllDisregards, 
    postNewDisregard, 
    getDisregard, 
    commentOnDisregard,
    respectDisregard,
    disrespectDisregard,
    deleteDisregard
} = require('./routes/disregards');
const { 
    signup, 
    login, 
    uploadImage,
    addUserDetails, 
    getAuthenticatedUser,
    getUserDetails,
    markNotificationRead
 } = require('./routes/users');


// disregard routes //

// gets all the posts (disregards) from db
app.get('/disregards', getAllDisregards);
// route to add a new post... aka disregard
app.post('/disregards', FBAuth, postNewDisregard);
// route to get a single post
app.get('/disregards/:disregardId', getDisregard);
// route to delete a disregard
app.delete('/disregards/:disregardId', FBAuth, deleteDisregard);
// comment on a disregard post
app.post('/disregards/:disregardId/comment', FBAuth, commentOnDisregard);
// respect a disregard
app.get('/disregards/:disregardId/respect', FBAuth, respectDisregard);
// disrespect a disregard
app.get('/disregards/:disregardId/disrespect', FBAuth, disrespectDisregard);


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
// gets a specific users details
app.get('/user/:handle', getUserDetails);
// mark notification read
app.post('/notifications', markNotificationRead);





exports.api = functions.https.onRequest(app);


//// create some user notification routes triggered upon user events ////
// creates notificaton on new disrespect
exports.createNotificationOnRespect = 
    functions
    .firestore
    .document('respects/{id}')
    .onCreate((snapshot) => {
        db.doc(`/disregards/${snapshot.data().disregardId}`).get()
        .then((doc) => {
            if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: doc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    type: 'respect',
                    read: false,
                    disregardId: doc.id
                });
            }
            return null;
        })
        .catch((err) => {
            console.error(err);
            return;
        });
});

// removes notification if someone takes back their respect
exports.deleteNotificationOnDisrespect =
    functions
    .firestore
    .document('respects/{id}')
    .onDelete((snapshot) => {
        db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch((err) => {
                console.error(err);
                return;
            });
});

// notification on new comment
exports.createNotificationOnComment =
    functions
    .firestore
    .document('comments/{id}')
    .onCreate((snapshot) => {
        db.doc(`/disregards/${snapshot.data().disregardId}`).get()
        .then((doc) => {
            if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: doc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    type: 'comment',
                    read: false,
                    disregardId: doc.id
                });
            }
            return null;
        })
        .catch((err) => {
            console.error(err);
            return;
        });
});

// notification on profile image change
exports.onUserImageChange = 
    functions
    .firestore
    .document(`/users/{userId}`)
    .onUpdate((change) => {
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            // console.log('image has changed');
        let batch = db.batch();
        return db.collection('disregards').where('userHandle', '==', change.before.data().handle).get()
            .then((data) => {
                data.forEach((doc) => {
                  const disregard = db.doc(`/disregards/${doc.id}`);
                  batch.update(disregard, { userImage: change.after.data().imageUrl });
                });
                return batch.commit();
            });
        } else {
            return true;
        }
});

// delete releated comments, respects and notification upon disregard delete
exports.onDisregardDelete = 
    functions
    .firestore
    .document('disregards/{disregardId}')
    .onDelete((snapshot, context) => {
        const disregardId = context.params.disregardId;
        const batch = db.batch();
        return db
            .collection('comments')
            .where('disregardId', '==', disregardId)
            .get()
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                });
                return db
                .collection('respects')
                .where('disregardId', '==', disregardId)
                .get();
        })
        .then((data) => {
            data.forEach((doc) => {
                batch.delete(db.doc(`/respects/${doc.id}`));
            });
            return db
            .collection('notifications')
            .where('disregardId', '==', disregardId)
            .get();
        })
        .then((data) => {
            data.forEach((doc) => {
                batch.delete(db.doc(`/notifications/${doc.id}`));
            });
            return batch.commit();
        })
        .catch((err) => console.error(err));
});