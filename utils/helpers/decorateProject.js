const {
  listingTypes: { SELL_PROJECT }
} = require('../../models/Listing/enums');

const arrayToObject = (key, array) => {
  if (!Array.isArray(array)) {
    throw new TypeError('Object provided is not an array');
  }

  if (array.length === 0) {
    return {};
  }

  if (!array.every((arrayObj) => arrayObj.hasOwnProperty(key))) {
    throw new TypeError(`Some objects in the array do not have key ${key}`);
  }

  let reducer = (previous, current) => {
    let obj = { ...current };
    delete obj[key];

    previous[current[key]] = obj;

    return previous;
  };

  return array.reduce(reducer, {});
};

const decorateProject = (projectListing) => {
  projectListing = projectListing.toObject();
  let type = projectListing.type;

  if (type !== SELL_PROJECT) {
    return projectListing;
  }

  return {
    ...projectListing,
    [type]: {
      ...projectListing[type],
      units: arrayToObject('apartmentType', projectListing[type].units)
    }
  };
};

module.exports = decorateProject;
