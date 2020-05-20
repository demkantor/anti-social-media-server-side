const { db, admin } = require('../util/admin');
const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators');
const BusBoy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");
const firebaseConfig = require('../util/config');
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);



// signup route - with confirmation of valid email, pasword match
exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    const { valid, errors } = validateSignupData(newUser);
    if(!valid) return res.status(400).json(errors);

    const noImg = 'no-image.png';
    
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
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
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
    return null;
};

// logs in a user, validation for email and password fields before sending to firebase for more auth
exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    const { valid, errors } = validateLoginData(user);
    if(!valid) return res.status(400).json(errors);

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
    return null;
};

// allows user to add bio details
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);
    
    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(()=> {
            return res.json({ message: 'Details added successfully!'});
        })
        .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        });
};

// get logged in users details
exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
    .then((doc) => {
        if(doc.exists){
            userData.credentials = doc.data();
            return db.collection('respects').where('userHandle', '==', req.user.handle).get();
        }
        return null;
    })
    .then((data) => {
        userData.respects = [];
        data.forEach((doc) => {
            userData.respects.push(doc.data());
        });
        return res.json(userData);
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    });
};

// allows user to upload a profile picture
exports.uploadImage = (req, res) => {
    const busboy = new BusBoy({ headers: req.headers });

    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
            return res.status(400).json({ error: "Wrong file type submitted" });
          }
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFileName = `${Math.round(Math.random()*10000000000000)}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
        return null;
    });
    busboy.on('finish', ()=> {
        admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
            },
          },
        })
        .then(()=> {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
            return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
        })
        .then(() => {
            return res.json({ message: 'Image uploaded succesfully!'});
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({ error: 'something failed....' });
        });
    });
    busboy.end(req.rawBody);
};