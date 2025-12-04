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

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

let userSchema = new Schema({
  userName: {
    type: String,
    unique: true
  },
  password: String,
  favourites: [String]
});

let User = null;

function connect() {
  return new Promise((resolve, reject) => {
    if (User) return resolve();
    const db = mongoose.createConnection(mongoDBConnectionString);
    db.on('error', err => reject(err));
    db.once('open', () => {
      User = db.model('users', userSchema);
      resolve();
    });
  });
}

module.exports.connect = connect;

module.exports.registerUser = function (userData) {
  return connect().then(() => {
    return new Promise((resolve, reject) => {
      if (userData.password !== userData.password2) {
        reject('Passwords do not match');
      } else {
        bcrypt
          .hash(userData.password, 10)
          .then(hash => {
            userData.password = hash;
            const newUser = new User({
              userName: userData.userName,
              password: userData.password,
              favourites: []
            });
            newUser
              .save()
              .then(() => {
                resolve('User ' + userData.userName + ' successfully registered');
              })
              .catch(err => {
                if (err.code === 11000) {
                  reject('User Name already taken');
                } else {
                  reject('There was an error creating the user: ' + err);
                }
              });
          })
          .catch(err => reject(err));
      }
    });
  });
};

module.exports.checkUser = function (userData) {
  return connect().then(() => {
    return new Promise((resolve, reject) => {
      User.findOne({ userName: userData.userName })
        .exec()
        .then(user => {
          if (!user) {
            reject('Unable to find user ' + userData.userName);
            return;
          }
          if (!userData.password) {
            resolve(user);
            return;
          }
          bcrypt
            .compare(userData.password, user.password)
            .then(res => {
              if (res === true) {
                resolve(user);
              } else {
                reject('Incorrect password for user ' + userData.userName);
              }
            })
            .catch(err => {
              reject('There was an error verifying the user: ' + err);
            });
        })
        .catch(() => {
          reject('Unable to find user ' + userData.userName);
        });
    });
  });
};

module.exports.getFavourites = function (userName) {
  return connect().then(() => {
    return new Promise((resolve, reject) => {
      User.findOne({ userName })
        .exec()
        .then(user => {
          if (!user) {
            reject('Unable to find user ' + userName);
            return;
          }
          resolve(user.favourites);
        })
        .catch(() => {
          reject('Unable to get favourites for user ' + userName);
        });
    });
  });
};

module.exports.addFavourite = function (userName, favId) {
  return connect().then(() => {
    return new Promise((resolve, reject) => {
      User.findOne({ userName })
        .exec()
        .then(user => {
          if (!user) {
            reject('Unable to find user ' + userName);
            return;
          }
          if (user.favourites.length >= 50) {
            reject('Unable to update favourites for user ' + userName);
            return;
          }
          User.findOneAndUpdate(
            { userName },
            { $addToSet: { favourites: favId } },
            { new: true }
          )
            .exec()
            .then(updated => {
              resolve(updated.favourites);
            })
            .catch(() => {
              reject('Unable to update favourites for user ' + userName);
            });
        })
        .catch(() => {
          reject('Unable to update favourites for user ' + userName);
        });
    });
  });
};

module.exports.removeFavourite = function (userName, favId) {
  return connect().then(() => {
    return new Promise((resolve, reject) => {
      User.findOneAndUpdate(
        { userName },
        { $pull: { favourites: favId } },
        { new: true }
      )
        .exec()
        .then(user => {
          if (!user) {
            reject('Unable to update favourites for user ' + userName);
            return;
          }
          resolve(user.favourites);
        })
        .catch(() => {
          reject('Unable to update favourites for user ' + userName);
        });
    });
  });
};
