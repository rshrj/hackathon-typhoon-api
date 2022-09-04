const Upload = require('../../models/Upload/Upload');

const findAndAttach = async (uploads) => {
  if (!Array.isArray(uploads)) {
    throw new Error('Please provide an array of upload paths');
  }

  try {
    await Promise.all(
      uploads.map(async (upload) => {
        let foundUpload = await Upload.findOne({ path: upload });

        if (!foundUpload) {
          return Promise.reject('Some of the upload paths were not found');
        }

        if (foundUpload.attached) {
          return Promise.reject(
            'Some of the upload paths are already attached'
          );
        }

        foundUpload.attached = true;
        await foundUpload.save();

        return foundUpload;
      })
    );

    return true;
  } catch (error) {
    throw error;
  }
};

const findAndDelete = async (uploads) => {
  if (!Array.isArray(uploads)) {
    throw new Error('Please provide an array of upload paths');
  }

  try {
    await Promise.all(
      uploads.map(async (upload) => {
        let foundUpload = await Upload.findOneAndDelete({ path: upload });

        if (!foundUpload) {
          return Promise.reject('Some of the upload paths were not found');
        }

        return foundUpload;
      })
    );

    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = { findAndAttach, findAndDelete };