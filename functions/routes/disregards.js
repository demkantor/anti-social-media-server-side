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
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        respectCount: 0,
        commentCount: 0
    };
    db.collection('disregards')
        // .orderBy("createdAt", "desc")
        .add(newDisregard)
        .then((doc) => {
            const resDisregard = newDisregard;
            resDisregard.disregardId = doc.id;
            return res.json(resDisregard);
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({ error: 'something failed....' });
        });
    }
    return null;
};


// route to get a single disregard
exports.getDisregard = (req, res) => {
    let disregardData = {};
    db.doc(`/disregards/${req.params.disregardId}`)
        .get()
        .then((doc) => {
            if(!doc.exists){
                return res.status(400).json({ error: 'Disregard not found!' });
            }
            disregardData = doc.data();
            disregardData.disregardId = doc.id;
            return db
            .collection('comments')
            .orderBy('createdAt', 'desc')
            .where('disregardId', '==', req.params.disregardId)
            .get();
        })
        .then((data) => {
            disregardData.comments = [];
            data.forEach((doc) => {
                disregardData.comments.push(doc.data());
            });
            return res.json(disregardData);
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({ error: err.code });
        });
};


// comment on a disregard post
exports.commentOnDisregard = (req, res) => {
    if(req.body.body.trim() === '') 
    return res.status(400).json({ error: 'Must not be empty!' });

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        disregardId: req.params.disregardId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };

    db.doc(`/disregards/${req.params.disregardId}`)
        .get()
        .then((doc) => {
            if(!doc.exists){
                return res.status(404).json({ error: 'Disregard not found!' });
            }
            return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
        })
        .then(() => {
            return db.collection('comments').add(newComment);
        })
        .then(() => {
            return res.json(newComment);
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({ error: 'Uh oh... Something went wrong' });
        });
    return null;
};


// respect a disregard
exports.respectDisregard = (req, res) => {
    const respectDocument = 
        db.collection('respects')
        .where('userHandle', '==', req.user.handle)
        .where('disregardId', '==', req.params.disregardId)
        .limit(1);
    const disregardDocument = db.doc(`/disregards/${req.params.disregardId}`);
    let diregardData = {};

    disregardDocument.get()
        .then((doc) => {
            if(doc.exists){
                disregardData = doc.data();
                disregardData.disregardId = doc.id;
                return respectDocument.get();
            } else {
                return res.status(404).json({ error: 'Disregard not found!' });
            }
        })
        .then((data) => {
            if (data.empty) {
                return db.collection('respects')
                .add({
                    disregardId : req.params.disregardId,
                    userHandle: req.user.handle
                })
                .then(() => {
                    disregardData.respectCount++
                    return disregardDocument.update({ respectCount: disregardData.respectCount });
                })
                .then(() => {
                    return res.json(disregardData);
                })
            } else {
                return res.status(400).json({ error: 'Disregard already respected!' });
            }
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({ error: err.code });
        });
}


// disrespect a disregard
exports.disrespectDisregard = (req, res) => {
    const respectDocument = 
        db.collection('respects').where('userHandle', '==', req.user.handle)
        .where('disregardId', '==', req.params.disregardId)
        .limit(1);
    const disregardDocument = db.doc(`/disregards/${req.params.disregardId}`);
    let diregardData = {};

    disregardDocument.get()
        .then((doc) => {
            if(doc.exists){
                disregardData = doc.data();
                disregardData.disregardId = doc.id;
                return respectDocument.get();
            } else {
                return res.status(404).json({ error: 'Disregard not found!' });
            }
        })
        .then((data) => {
            if(data.empty){
                return res.status(400).json({ error: 'Disregard not respected!' });
            } else {
                return db.doc(`/respects/${data.docs[0].id}`).delete()
                    .then(() => {
                        disregardData.respectCount--;
                        return disregardDocument.update({ respectCount: disregardData.respectCount });
                    })
                    .then(() => {
                        return res.json(disregardData);
                    })
            }
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({ error: err.code });
        });
};


// delete a disregard 
exports.deleteDisregard = (req, res) => {
    const document = db.doc(`/disregards/${req.params.disregardId}`);
    document.get()
        .then((doc) => {
            if (!doc.exists) {
                return res.status(404).json({ error: 'Disregard not found' });
            }
            if (doc.data().userHandle !== req.user.handle) {
                return res.status(403).json({ error: 'Unauthorized...' });
            } else {
                return document.delete();
            }
        })
        .then(() => {
            return res.json({ message: 'Disregard deleted successfully!' });
          })
          .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: err.code });
          });
};

