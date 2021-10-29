require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const uniqid = require("uniqid");

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
      date: { type: Date, default: Date.now() },
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
          _id: user._id,
          username: user.username,
          count: user.count,
          log: [],
        };

        for (let i = 0; i < user.log.length; i++) {
          jsonObj.log.push({
            description: user.log[i].description,
            duration: user.log[i].duration,
            date: user.log[i].date.toDateString(),
          });
        }

        res.json(jsonObj);
      }
    }
  ).clone();
});

app.post("/api/users", (req, res) => {
  const userId = uniqid();

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
    _id: req.body[":_id"],
  });
  if (idFound) {
    //Push new data into the array
    if (req.body.date !== "") {
      idFound.log.push({
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date,
      });
    } else {
      idFound.log.push({
        description: req.body.description,
        duration: req.body.duration,
      });
    }

    //Update the array (this was pushed in the code above)
    User.findByIdAndUpdate(
      idFound._id,
      {
        count: idFound.log.length,
        log: idFound.log,
      },
      function (err, user) {
        if (err) {
          console.log(err);
        } else {
          console.log("User activity has been updated.");
          res.json({
            _id: idFound._id,
            username: idFound.username,
            date:
              req.body.date !== ""
                ? new Date(req.body.date).toDateString()
                : new Date().toDateString(),
            duration: parseInt(req.body.duration),
            description: req.body.description,
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
