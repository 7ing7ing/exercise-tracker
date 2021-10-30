require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const ObjectID = require("bson-objectid");

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("Connection state: " + mongoose.connection.readyState);
  });

app.use(cors());
app.use(express.static("public"));
//Parse incoming request bodies in a middleware before your handlers, available under the req.body property.
app.use(
  express.urlencoded({
    extended: true,
  })
);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  count: { type: Number, required: true },
  _id: String,
  log: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: String, default: new Date().toDateString() },
    },
  ],
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async function (req, res) {
  User.find({}, "_id username", function (err, users) {
    console.log(users);
    if (err) {
      console.log(err);
    } else {
      res.json(users);
    }
  });
});

app.get("/api/users/:_id/logs", async function (req, res) {
  await User.findOne(
    {
      _id: req.params._id,
    },
    "_id username count log",
    function (err, user) {
      if (err) {
        console.log(err);
      } else {
        var jsonObj = {
          username: user.username,
          count: user.count,
          _id: user._id,
          log: [],
        };

        let from = new Date(req.query.from);
        let to = new Date(req.query.to);
        let limit = parseInt(req.query.limit);
        let counter = 0;

        for (let i = 0; i < user.log.length; i++) {
          let actualDate = new Date(user.log[i].date);
          if (
            ((req.query.to &&
              req.query.from &&
              actualDate >= from &&
              actualDate <= to) ||
              (req.query.to && !req.query.from && actualDate <= to) ||
              (!req.query.to && req.query.from && actualDate >= from) ||
              (!req.query.to && !req.query.from)) &&
            ((req.query.limit && counter < limit) || !req.query.limit)
          ) {
            jsonObj.log.push({
              //exercises are introduced one by one inside the for
              description: user.log[i].description,
              duration: Number(user.log[i].duration),
              date: new Date(user.log[i].date).toDateString(),
            });
            counter++; //increment after introducing an exercise in the result (jsonObj.log.push)
          }
        }
        jsonObj.count = Number(counter);
        res.json(jsonObj);
      }
    }
  ).clone();
});

app.post("/api/users", (req, res) => {
  const userId = ObjectID();

  const newUser = new User({
    username: req.body.username,
    _id: userId,
    count: 0,
  });

  newUser.save(function (err, user) {
    if (err) return console.log(err);
    console.log("User created succesfully");
  });

  res.json({
    username: req.body.username,
    _id: userId,
  });
});

app.post("/api/users/:_id/exercises", async function (req, res) {
  let idFound = await User.findOne({
    _id: req.params[":_id"],
  });
  if (idFound) {
    //Push new data into the array
    if (req.body.date !== "") {
      idFound.log.push({
        description: req.body.description,
        duration: Number(req.body.duration),
        date: new Date(req.body.date).toDateString(),
      });
    } else {
      idFound.log.push({
        description: req.body.description,
        duration: Number(req.body.duration),
      });
    }

    //Update the array (this was pushed in the code above)
    User.findByIdAndUpdate(
      idFound._id,
      {
        count: Number(idFound.log.length),
        log: idFound.log,
      },
      function (err, user) {
        if (err) {
          console.log(err);
        } else {
          console.log("User activity has been updated.");
          res.json({
            username: idFound.username,
            description: req.body.description,
            duration: Number(req.body.duration),
            _id: idFound._id,
            date:
              req.body.date !== ""
                ? new Date(req.body.date).toDateString()
                : new Date().toDateString(),
          });
        }
      }
    );
  } else {
    res.json({
      error: "ID not found",
    });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
