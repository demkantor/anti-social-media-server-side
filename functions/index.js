const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const express = require('express');
const app = express();


app.get('/disregard', (req, res) => {
    admin.firestore().collection('disregards').get()
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
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
    };
    admin
        .firestore()
        .collection('disregards')
        .orderBy('createdAt', 'desc')
        .add(newDisregard)
        .then((doc) => {
            return res.json({ message: `document ${doc.id} created succesfully!` });
        })
        .catch((err) => {
            res.status(500).json({ error: 'something failed....' });
            console.log(err);
        })
});



exports.api = functions.https.onRequest(app);