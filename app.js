var express = require('express')
app = express();

const SECRET_KEY = "TODO-LIST-SECRET";

const session = require('cookie-session');
app.use(session({
    name: 'session',
    keys: [SECRET_KEY],
    maxAge: 24 * 60 * 60 * 1000
}));

var mongojs = require('mongojs'),
    db = mongojs('todolist');

var bodyParser = require('body-parser'),
    path = require('path'),
    validator = require('express-validator'),
    CryptoJS = require("crypto-js"),
    ObjectId = mongojs.ObjectId;

// Validation Middeleware
app.use(validator({
    errorFormatter: (param, msg, value) => {
        var namespace = param.split('.'),
            root = namespace.shift(),
            formParam = root;

        return {
            param: formParam,
            msg: msg,
        };
    }
}))

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Set static path
app.use(express.static(path.join(__dirname, 'public')));

function generateResponse(success, message, data) {
    if (success)
        console.log("Success");
    else
        console.warn("Error", data);

    return {
        success,
        message,
        data
    };
}

/**
 * ----------------------------------
 * Auth routes
 * ------------------------------------
 */

//  Signup
app.post('/register', (req, res) => {
    var person = {
        email: req.body.email,
        // password: CryptoJS.AES.encrypt(req.body.password, SECRET_KEY)
        password: req.body.password
    }

    db.users.insert(person, (err, user) => {
        if (err)
            res.status(400).json(generateResponse(false, "Error", err));

        req.session = { user: user['_id'] };
        res.status(200).json(generateResponse(true, "Success", "User registered"));
    });
});

// Login
app.post('/login', (req, res) => {
    var person = {
        email: req.body.email,
        // password: CryptoJS.AES.encrypt(req.body.password, SECRET_KEY)
        password: req.body.password
    }

    db.users.findOne(person, (err, user) => {
        if (err) {
            res.status(400).json(generateResponse(false, "Error", err));
        }
        else {
            req.session = { user: user['_id'] };
            res.status(200).json(generateResponse(true, "Success", user));
        }

    });
});

app.post('/signout', (req, res) => {
    req.session = null;

    res.status(200).json(generateResponse(true, "Success", "Logged out"));
})

// ________________________________________________________________________

/**
 * ----------------------------------
 * Application routes
 * ------------------------------------
 */

//  Create
app.post('/list/create', (req, res) => {
    var {
        title,
        type
    } = req.body;

    var list = {
        title,
        type,
        author: req.session['user']
    };

    if (req.session)
        db.lists.insert(list, (err, data) => {
            if (err)
                res.status(400).json(generateResponse(false, "Error", err));

            res.status(200).json(generateResponse(true, "Success", data));
        });
    else
        res.status(400).json(generateResponse(false, "Error", "Unauthenticated request"));
});

// Read all
app.get('/list', (req, res) => {
    if (req.session)
        db.lists.find((err, lists) => {
            if (err)
                res.status(400).json(generateResponse(false, "Error", err));

            res.status(200).json(generateResponse(true, "Success", lists));
        });
    else
        res.status(400).json(generateResponse(false, "Error", "Unauthenticated request"));
});

// Read specific
app.get('/list/:id', (req, res) => {
    if (req.session)
        db.lists.findOne({ _id: ObjectId(req.params.id) }, (err, list) => {
            if (err)
                res.status(400).json(generateResponse(false, "Error", err));

            res.status(200).json(generateResponse(true, "Success", list));
        });
    else
        res.status(400).json(generateResponse(false, "Error", "Unauthenticated request"));
});

// Update
app.post('/list/update/:id', (req, res) => {
    var {
        title,
        type
    } = req.body;

    var list = {
        title,
        type,
        author: req.session['user']
    }

    if (req.session)
        db.lists.update(
            { _id: ObjectId(req.params.id) }, list, { upsert: false, multi: false },
            (err, data) => {
                if (err)
                    res.status(400).json(generateResponse(false, "Error", err));

                res.status(200).json(generateResponse(true, "Success", data));
            }
        );
    else
        res.status(400).json(generateResponse(false, "Error", "Unauthenticated request"));
});

// Delete
app.post('/list/delete/:id', (req, res) => {
    if (req.session)
        db.lists.remove({ _id: ObjectId(req.params.id), author: req.session['user'] }, (err, lists) => {
            if (err)
                res.status(400).json(generateResponse(false, "Error", err));

            res.status(200).json(generateResponse(true, "Success", lists));
        });
    else
        res.status(400).json(generateResponse(false, "Error", "Unauthenticated request"));
});

app.listen(3000, () => {
    console.log('Server running on port 3000...');
});