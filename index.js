const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const dbPath = path.join(__dirname, "users.db");

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server Running at http://localhost:3001");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.get("/persons", async (req, res) => {
  const userQuery = `SELECT * FROM users`;
  const resultArray = await db.all(userQuery);
  res.send(resultArray);
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World" });
});

app.post("/register", async (req, res) => {
  const { username, name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const selectUserQuery = `
    SELECT * FROM users WHERE username="${username}"`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    const createUserQuery = `
        INSERT INTO users(username, name , email, password)
        VALUES(
        "${username}",
        "${name}",
        "${email}",
        "${hashedPassword}"
        );`;

    await db.run(createUserQuery);
    res.status(200);
    res.send("User Created Successfully");
  } else {
    res.status(400);
    res.send("User Already Exists");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const selectUserQuery = `
    SELECT * FROM users WHERE username="${username}"`;
  const dbUser = await db.get(selectUserQuery);
  if (username === "" || password === "") {
    res.status(400);
    res.json("Bad Request");
  }
  if (dbUser === undefined) {
    res.status(400);
    res.json("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "fdehwfjbkerghfegu");
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.json({ errorMsg: "Invalid Password" });
    }
  }
});
