module.exports = (method, data) => {
  const { error, value } = method.validate(data, { abortEarly : false});
  let message = {};
  if (error) {
    if (error && error.details && error.details.length !== 0) {
      error.details.forEach((e) => {
        message[e.path[0]] = e.message;
      });
    } else {
      console.log("Something went wrong in prepareErrorMessage");
      message["toasts"] = ["Something went wrong."];
    }
    return { error: message };
  } else {
    return { value };
  }
};
