// ---------------------------------------------------------------------------------------------------------->
// checks to see if email is already in users object for login
const getUserByEmail = function (email, database) {
  if (email.length === 0) {
    return undefined;
  }
  for (const key in database) {
    const userEmail = database[key].email;

    if (userEmail === email) {
      // user = key;
      return key;
    }
  }
  return undefined;
}

module.exports = { getUserByEmail };