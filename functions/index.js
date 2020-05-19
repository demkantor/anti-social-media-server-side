const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();
admin.initializeApp();

const firebaseConfig = {
    apiKey: "AIzaSyCvZVaVIU2j3iLYIkM2MdPt1xPuh-cWAJk",
    authDomain: "anti-social-media-7c6ba.firebaseapp.com",
    databaseURL: "https://anti-social-media-7c6ba.firebaseio.com",
    projectId: "anti-social-media-7c6ba",
    storageBucket: "anti-social-media-7c6ba.appspot.com",
    messagingSenderId: "525135938773",
    appId: "1:525135938773:web:9d051859e28a8d62f24e5c"
};

const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

app.get('/disregard', (req, res) => {
    db
    .collection('disregards')
    .get()
    .then(data => {
        let disregards = [];
        data.forEach(doc => {
            disregards.push({
                disregardId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt
            });
        });
        return res.json(disregards);
    })
    .catch(err => console.error(err));
})


app.post('/disregard', (req, res) => {
    const newDisregard = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };
    db
        .collection('disregards')
        // .orderBy("createdAt", "desc")
        .add(newDisregard)
        .then((doc) => {
            return res.json({ message: `document ${doc.id} created succesfully!` });
        })
        .catch((err) => {
            res.status(500).json({ error: 'something failed....' });
            console.log(err);
        })
});

const isEmpty = (string) => {
    if(string.trim() === '') return true;
    else return false;
}

const isEmail = (email) => {
    const regEx = /\S+@\S+\.\S+/;
    if (email.match(regEx)) return true;
    else return false;
  };

// signup route 
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    let errors = {};

    if(isEmpty(newUser.email)) {
        errors.email = 'Must not be empty!'
    } else if(!isEmail(newUser.email)){
        errors.email = 'Must be a valid email address!'
    }

    if(isEmpty(newUser.password)) { errors.password = 'Must not be empty!' } 
    if(newUser.password !== newUser.confirmPassword) { errors.confirmPassword = 'Password must match confirmed password!' }
    if(isEmpty(newUser.handle)) { errors.handle = 'Must not be empty!' } 

    if(Object.keys(errors).length > 0) return res.status(400).json(errors);
    
    let token, userId;
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((doc) => {
            if(doc.exists){
                return res.status(400).json({ handle: 'sorry, this handle is already taken...'});
            } else {
                return firebase
                .auth()
                .createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch(err => {
            console.log(err);
            if(err.code === 'auth/email-already-in-use') {
                return res.status(400).json({ email: "this email is already in use!" })
            } else {
            return res.status(500).json({error: err.code});
            }
    });
});

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    let errors = {};

    if(isEmpty(user.email)) { errors.email = 'Must not be empty!' }
    if(isEmpty(user.password)) { errors.password = 'Must not be empty!' }

    if(Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return res.json({ token });
        })
        .catch((err) => {
            console.error(err);
            if(err.code === 'auth/wrong-password') {
                return res.status(403).json({ general: 'Credentials do not match, please try again!'})
            } else {
                return res.status(500).json({ error: err.code });
            }
        });
});



exports.api = functions.https.onRequest(app);
