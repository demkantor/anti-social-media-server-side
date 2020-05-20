const { db } = require('../util/admin');

// gets all the posts (disregards) from db
exports.getAllDisregards = (req, res) => {
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
};

// route to add a new post... aka disregard
exports.postNewDisregard = (req, res) => {
    if(req.body.body.trim() === '') {
        return res.status(400).json({ body: 'Disregard body must not be empty!' })
    } else {
    const newDisregard = {
        body: req.body.body,
        userHandle: req.user.handle,
        createdAt: new Date().toISOString()
    };
    db.collection('disregards')
        // .orderBy("createdAt", "desc")
        .add(newDisregard)
        .then((doc) => {
            return res.json({ message: `document ${doc.id} created succesfully!` });
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({ error: 'something failed....' });
        });
    }
    return null;
};

