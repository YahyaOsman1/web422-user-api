/*********************************************************************************
* WEB422 – Assignment 3
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
*
* Name: yahya osman Student ID: 179264239 Date: 03/12/2025
*
* Vercel App (Deployed) Link: _____________________________________________________
*
********************************************************************************/

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
    .checkUser({ userName: jwt_payload.userName, password: '' })
    .then((user) => {
      if (user) next(null, { _id: user._id, userName: user.userName });
      else next(null, false);
    })
    .catch(() => next(null, false));
});

passport.use(strategy);

const requireJWT = passport.authenticate('jwt', { session: false });

app.get('/', (req, res) => {
  res.json({ message: 'User API is running.' });
});

app.post('/api/user/register', (req, res) => {
  userService
    .registerUser(req.body)
    .then((msg) => res.status(200).json({ message: msg }))
    .catch((err) => {
      const message = err && err.message ? err.message : err;
      res.status(400).json({ message });
    });
});

app.post('/api/user/login', (req, res) => {
  userService
    .checkUser(req.body)
    .then((user) => {
      const payload = { _id: user._id, userName: user.userName };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
      res.json({ message: 'Login successful', token });
    })
    .catch((err) => {
      const message = err && err.message ? err.message : err;
      res.status(400).json({ message });
    });
});

app.get('/api/user/favourites', requireJWT, (req, res) => {
  userService
    .getFavourites(req.user.userName)
    .then((favs) => res.json(favs))
    .catch((err) => {
      const message = err && err.message ? err.message : err;
      res.status(400).json({ message });
    });
});

app.put('/api/user/favourites/:id', requireJWT, (req, res) => {
  userService
    .addFavourite(req.user.userName, req.params.id)
    .then((favs) => res.json(favs))
    .catch((err) => {
      const message = err && err.message ? err.message : err;
      res.status(400).json({ message });
    });
});

app.delete('/api/user/favourites/:id', requireJWT, (req, res) => {
  userService
    .removeFavourite(req.user.userName, req.params.id)
    .then((favs) => res.json(favs))
    .catch((err) => {
      const message = err && err.message ? err.message : err;
      res.status(400).json({ message });
    });
});
module.exports = app;
if (!process.env.VERCEL) {
  app.listen(HTTP_PORT, () => {
    console.log(`User API listening on: ${HTTP_PORT}`);
  });
}
