require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const passportJWT = require('passport-jwt');
const userService = require('./user-service');

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());
app.use(passport.initialize());

const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
  secretOrKey: process.env.JWT_SECRET
};

const strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
  userService
    .getUserById(jwt_payload._id)
    .then((user) => {
      if (user) next(null, { _id: user._id, userName: user.userName });
      else next(null, false);
    })
    .catch((err) => next(err, false));
});

passport.use(strategy);

const requireJWT = passport.authenticate('jwt', { session: false });

app.get('/', (req, res) => {
  res.json({ message: 'User API is running.' });
});

app.post('/api/user/register', (req, res) => {
  userService
    .registerUser(req.body)
    .then(() => res.status(200).json({ message: 'User registered successfully.' }))
    .catch((err) => res.status(400).json({ message: err }));
});

app.post('/api/user/login', (req, res) => {
  userService
    .checkUser(req.body)
    .then((user) => {
      const payload = { _id: user._id, userName: user.userName };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
      res.json({ message: 'Login successful', token });
    })
    .catch((err) => res.status(400).json({ message: err }));
});

app.get('/api/user/favourites', requireJWT, (req, res) => {
  userService
    .getFavourites(req.user.userName)
    .then((favs) => res.json(favs))
    .catch((err) => res.status(400).json({ message: err }));
});

app.put('/api/user/favourites/:id', requireJWT, (req, res) => {
  userService
    .addFavourite(req.user.userName, req.params.id)
    .then((favs) => res.json(favs))
    .catch((err) => res.status(400).json({ message: err }));
});

app.delete('/api/user/favourites/:id', requireJWT, (req, res) => {
  userService
    .removeFavourite(req.user.userName, req.params.id)
    .then((favs) => res.json(favs))
    .catch((err) => res.status(400).json({ message: err }));
});

let initialized = false;
let initPromise = null;

function ensureInitialized() {
  if (!initPromise) {
    initPromise = userService.initialize(process.env.MONGO_URL).then(() => {
      initialized = true;
    });
  }
  return initPromise;
}

app.use(async (req, res, next) => {
  if (!initialized) {
    try {
      await ensureInitialized();
    } catch (err) {
      return res.status(500).json({ message: 'Initialization error' });
    }
  }
  next();
});

module.exports = app;

if (!process.env.VERCEL) {
  ensureInitialized().then(() => {
    app.listen(HTTP_PORT, () => {});
  });
}
