const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const morgan = require('morgan');
let user;

const cookieParser = require('cookie-parser')
app.use(cookieParser())

app.set("view engine", "ejs"); // tells the Express app to use EJS as its templating engine.
app.use(express.urlencoded({ extended: true })); // body parser
app.use(morgan('dev'));

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

// generate random string for Short URL ID/user ID - 6 random alphanumeric characters:
const generateRandomString = function (length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}
// checks to see if email/password is empty and if email is already in users object
const registrationCheck = function (email, password) {
  if (email.length === 0 || password.length == 0) {
    return false;
  }
  for (const key in users) {
    const userEmail = users[key].email;
    if (userEmail === email) {
      return false;
    };
  };
  return true
};

// checks to see if email is already in users object for login
const getUserByEmail = function (email, password) {
  if (email.length === 0 || password.length == 0) {
    return false;
  }
  for (const key in users) {
    const userEmail = users[key].email;
    const userPassword = users[key].password;

    if (userEmail === email && userPassword === password) {
      user = key;
      return true;
    }
  }
  return false;
}

app.get("/", (req, res) => {
  res.send("Hello!");
});

// register
app.get("/register", (req, res) => {
  const templateVars = {
    username: req.cookies["user_id"],
    urls: urlDatabase,
    users: users
  };
  if (req.cookies["user_id"]) {
    return res.redirect('/urls');
  }
  res.render("register", templateVars);
});

app.post("/register", (req, res) => {
  const id = generateRandomString(13);
  const email = req.body.email;
  const password = req.body.password;
  if (registrationCheck(email, password) === false) {
    return res.status(400).send('Invalid email or password');
  } else {
    users[id] = { id, email, password };
    res.cookie('user_id', id);
    return res.redirect('/urls');
  }
});

// login verification
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (getUserByEmail(email, password) === false) {
    return res.status(403).send('Invalid email or password');
  } else {
    res.cookie('user_id', user);
    return res.redirect('/urls');
  }
});

app.get("/login", (req, res) => {
  const templateVars = {
    username: req.cookies["user_id"],
    urls: urlDatabase,
    users: users
  };
  if (req.cookies["user_id"]) {
    return res.redirect('/urls');
  }
  res.render("login", templateVars);
});

app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect(`/login`);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  const templateVars = {
    username: req.cookies["user_id"],
    urls: urlDatabase,
    users: users
  };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  if (req.cookies["user_id"]) {
    const shortUrl = generateRandomString(6);
    urlDatabase[shortUrl] = req.body.longURL;
    return res.redirect(`/urls/${shortUrl}`);
  }
  res.status(403).send('Please login');
});

app.get("/urls/new", (req, res) => {
  const templateVars = {
    username: req.cookies["user_id"],
    users: users
  };
  if (!req.cookies["user_id"]) {
    return res.redirect('/login');
  }
  res.render("urls_new", templateVars);
});

// delete short URL
app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect(`/urls`);
});

// edit URL
app.post("/urls/:id/edit", (req, res) => {
  const id = req.params.id;
  urlDatabase[id] = req.body.NewURL
  res.redirect(`/urls`);
});

app.get("/u/:id", (req, res) => {
  const { id } = req.params;
  const longURL = urlDatabase[id];
  if (!longURL) {
    res.status(404).send("URL not found");
  }
  res.redirect(longURL);
});

app.get("/urls/:id", (req, res) => {
  const templateVars = {
    id: req.params.id,
    longURL: urlDatabase[req.params.id],
    username: req.cookies["user_id"],
    users: users
  };
  res.render("urls_show", templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});