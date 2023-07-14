const PORT = 8080; // default port 8080
const express = require("express");
const app = express();
const morgan = require('morgan');
const bcrypt = require("bcryptjs");
const cookieSession = require('cookie-session');
const helperFunctions = require("./helpers");

// app.use(cookieParser()); // Allows us to read and set the cookie using `req.cookies` a res.cookie() respectively
app.use(cookieSession({
  name: 'session',
  keys: ["sosecret"],
  // cookie expire options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

app.set("view engine", "ejs"); // tells the Express app to use EJS as its templating engine.
app.use(express.urlencoded({ extended: true })); // body parser
app.use(morgan('dev')); // logging middleware

// stores the shortened URLs
const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "userRandomID",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "user2RandomID",
  },
  i3BaGr: {
    longURL: "https://www.cbc.ca",
    userID: "user2RandomID",
  },
};

// stores user information
const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    hashedPassword: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    hashedPassword: "dishwasher-funk",
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
};

// checks to see if email/password is empty and if email is already in users object for registration
const registrationCheck = function (email, password) {
  if (email.length === 0 || password.length == 0) {
    return false;
  }
  for (const key in users) {
    const userEmail = users[key].email;
    if (userEmail === email) {
      return false;
    }
  }
  return true;
};

// returns the URLs associated a user
const urlsForUser = function (id) {
  let URLs = {}; // url list for user
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      URLs[shortURL] = urlDatabase[shortURL];
    }
  }
  return URLs;
};

// authenticates password
const authenticate = function (email, password) {
  const user = helperFunctions.getUserByEmail(email, users);
  const hashedPassword = users[user].hashedPassword;
  if (bcrypt.compareSync(password, hashedPassword)) {
    return true;
  }
  return false;
};

// register
app.get("/register", (req, res) => {
  const templateVars = {
    username: req.session.user_id,
    urls: urlDatabase,
    users: users
  };
  if (req.session.user_id) {
    return res.redirect('/urls');
  }
  res.render("register", templateVars);
});

app.post("/register", (req, res) => {
  const id = generateRandomString(13);
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);

  if (registrationCheck(email, password) === false) {
    return res.status(400).send('Invalid email or password');
  } else {
    users[id] = { id, email, hashedPassword };
    req.session.user_id = id;
    return res.redirect('/urls');
  }
});

// login verification
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const user = helperFunctions.getUserByEmail(email, users);
  if (password.length === 0) {
    return res.status(400).send('Invalid email or password');
  }
  if (user === undefined || authenticate(email, password) === false) {
    return res.status(400).send('Invalid email or password');
  } else {
    req.session.user_id = user;
    return res.redirect('/urls');
  }
});

app.get("/login", (req, res) => {
  const templateVars = {
    username: req.session.user_id,
    urls: urlDatabase,
    users: users
  };
  if (req.session.user_id) {
    return res.redirect('/urls');
  }
  res.render("login", templateVars);
});

// logout
app.post("/logout", (req, res) => {
  req.session = null; // clears cookie and logout
  res.redirect(`/login`);
});

// url index
app.get("/urls", (req, res) => {
  const templateVars = {
    username: req.session.user_id,
    urls: urlDatabase,
    users: users
  };
  if (req.session.user_id) {
    templateVars.urls = urlsForUser(req.session.user_id);
    return res.render("urls_index", templateVars,);
  }
  res.send('Please register or login');
});

app.post("/urls", (req, res) => {
  if (req.session.user_id) {
    const shortUrl = generateRandomString(6);
    urlDatabase[shortUrl] = {};
    urlDatabase[shortUrl].longURL = req.body.longURL;
    urlDatabase[shortUrl].userID = req.session.user_id;
    return res.redirect(`/urls/${shortUrl}`);
  }
  res.send('Please register or login');
});

// create shorened URL
app.get("/urls/new", (req, res) => {
  const templateVars = {
    username: req.session.user_id,
    users: users
  };
  if (!req.session.user_id) {
    return res.redirect('/login');
  }
  res.render("urls_new", templateVars);
});

// delete short URL
app.post("/urls/:id/delete", (req, res) => {
  const id = req.params.id;
  if (urlDatabase[id].userID === req.session.user_id) {
    delete urlDatabase[req.params.id];
    return res.redirect(`/urls`);
  }
  res.send('Please register or login');
});

// edit URL
app.post("/urls/:id/edit", (req, res) => {
  const id = req.params.id;
  if (urlDatabase[id].userID === req.session.user_id) {
    urlDatabase[id].longURL = req.body.NewURL;
    return res.redirect(`/urls`);
  }
  res.send('Please register or login');
});

// short url link
app.get("/u/:id", (req, res) => {
  const id = req.params.id;

  if (!urlDatabase[id] || !urlDatabase[id].longURL) {
    return res.status(404).send("URL not found");
  }
  const longURL = urlDatabase[id].longURL;
  res.redirect(longURL);
});

// short url hyperlinks
app.get("/urls/:id", (req, res) => {
  const templateVars = {
    id: req.params.id,
    longURL: urlDatabase[req.params.id].longURL,
    username: req.session.user_id,
    users: users
  };
  res.render("urls_show", templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

// initial practice
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/", (req, res) => {
  res.send("Hello!");
});