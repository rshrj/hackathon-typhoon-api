const objToArray = (obj, keyName) => {
  return Object.keys(obj).map((key) => ({ ...obj[key], [keyName]: key }));
};

module.exports = objToArray;
