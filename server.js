const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const moment = require('moment');

const { Schema } = mongoose;
//connect to the db
mongoose.connect(process.env['DBKEY'], { useNewUrlParser: true });

//create schemas
const userSchema = new Schema({
  username: String,
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
})

let User = mongoose.model("User", userSchema);

//add user function
const addUser = (name, done) => {
  let newUser = new User({ "username": name });
  newUser.save((error, data) => {
    error ? done(null) : done(null, data);
  });
};

//find all users function
const findAllPeople = (done) => {
  User.find((err, data) => {
    err ? done(null) : done(null, data);
  })
};

//update user exercise function
const findAndUpdate = (id, userData, done) => {
  let date;
  if (userData.date != "") {
    date = moment(userData.date).toDate().toDateString();
  } else {
    date = (new Date()).toDateString();
  }
  User.findByIdAndUpdate(
    //userData[":_id"],
    id,
    {
      "$push": { log: { description: userData.description, duration: userData.duration, date: date } }
    },

    { "new": true },
    (err, data) => {
      err ? done(err) : done(null, data);
    })
};

//return a users full logs function
const getLogs = (id, done) => {
  User.findById(id, (err, data) => {
    err ? done(null) : done(null, data);
  });
};


app.use(cors())
app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//create new user route
app.post("/api/users", (req, res, next) => {
  let name = req.body.username;
  addUser(name, (err, data) => {
    if (err) {
      console.log(err);
      return next(err);
    }
    console.log("----New User------")
    console.log(data);
    console.log("----New User------")
    res.json({ username: data.username, _id: data._id });
  });
});

//get all users route
app.get("/api/users", (req, res, next) => {
  findAllPeople((err, data) => {
    if (err) {
      console.log(err);
      return next(err);
    }
    console.log("----Get All Users--")
    console.log(data);
    console.log("----Get All Users--")
    //keep only the needed properties of response object
    let result = data.map((x) => {
      return { "_id": x["_id"], "username": x.username, "__v": x["__v"] }
    })
    res.send(result);
  });
});

//add exercise route
app.post("/api/users/:_id/exercises", (req, res, next) => {
  console.log("--Add Exercise request--");
  console.log(req.body);
  console.log("--Add Exercise request--");
  //find and update takes the id from req.params and the rest from req.body
  findAndUpdate(req.params["_id"], req.body, (err, data) => {
    if (err) {
      console.log(err);
      return next(err);
    }
    if (data == null) {
      res.send("not found");
    } else {

      console.log("--add ex data response--");
      console.log(data);
      console.log("---add ex data response---")
      //get last element of log
      let last = data.log[data.log.length - 1];
      //craft response
      let response = { "_id": data["_id"], "username": data.username, "date": last.date.toDateString(), "duration": last.duration, "description": last.description };
      res.json(response);
    }
  });
});

//get all user logs route
app.get("/api/users/:_id/logs", (req, res, next) => {
  if (Object.keys(req.query).length != 0) {
    console.log("--get logs--");
    console.log(req.query);
    console.log("--get logs--");
  }
  let id = req.params["_id"];
  getLogs(id, (err, data) => {
    if (err) {
      console.log(err)
      return next(err);
    }
    let response;
    console.log("---get logs data---")
    console.log(data)
    console.log("---get logs data---")
    if (Object.keys(req.query).length == 0) {
      response = {
        "_id": data["_id"],
        "username": data.username,
        "count": data.log.length,
        "log": data.log.map((x) => {
          return {
            "description": x.description,
            "duration": x.duration,
            "date": (new Date(x.date)).toDateString()
          }
        })
      }
    } else if (Object.keys(req.query).length == 1) {
      //if only limit is present
      let trueLog = data.log;

      if (trueLog.length >= req.query.limit) {
        trueLog = data.log.slice(0, req.query.limit);
      }

      response = {
        "_id": data["_id"],
        "username": data.username,
        "count": data.log.length,
        "log": trueLog.map((x) => {
          return {
            "description": x.description,
            "duration": x.duration,
            "date": (new Date(x.date)).toDateString()
          }
        })
      }
    } else {
      let from = (new Date(req.query.from));
      let to = (new Date(req.query.to));
      let log = data.log.filter((x) => {
        let date = new Date(x.date);
        return (date >= from && date <= to)
      })
        .map((x) => {
          return {
            "description": x.description,
            "duration": x.duration,
            "date": (new Date(x.date)).toDateString()
          }
        });
      let trueLog = log;

      if (log.length >= req.query.limit) {
        trueLog = log.slice(0, req.query.limit);
      }
      response = {
        "_id": data["_id"],
        "username": data.username,
        "from": from.toDateString(),
        "to": to.toDateString(),
        "count": trueLog.length,
        "log": trueLog
      }
    }
    res.json(response);
  })
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
