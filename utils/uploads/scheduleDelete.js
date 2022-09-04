const scheduler = require('node-schedule');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Upload = require('../../models/Upload');
const uploadDirectory = require('./checkUploadFolder');

const scheduleDelete = (uploadId) => {
  //Calculating 30 min later time.
  let date = new Date();
  date.setMinutes(date.getMinutes() + 30);

  //Node Scheduler
  const job = scheduler.scheduleJob(
    date,
    async function (id) {
      const upload = await Upload.findById(id);

      if (!upload.attached) {
        //if file is not used in any listings then delete it from Upload collection & public/uploaded folder.
        await Upload.findByIdAndDelete(id);

        const imagePath = path.join(
          uploadDirectory,
          upload.path.split('/').pop()
        );

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }.bind(null, uploadId)
  );

  // console.log(job);
};

const deleteStrayUploads = async () => {
  const job = scheduler.scheduleJob('*/30 * * * *', async function () {
    try {
      if (!fs.existsSync(uploadDirectory)) {
        fs.mkdirSync(uploadDirectory);
      }
      //Reading all files in public/uploaded folder.
      const files = fs.readdirSync(uploadDirectory);

      //Fetching all images's path in Upload collection.
      const allUploads = await Upload.find({}, '-_id path');

      if (files.length > 0) {
        let allImages = [];
        if (allUploads.length > 0) {
          allImages = allUploads.map((u) => u.path.split('/').pop());
        }

        const imagesToDelete = _.difference(files, allImages);

        if (imagesToDelete.length > 0) {
          imagesToDelete.forEach((image) => {
            let deleteImagePath = uploadDirectory + '/' + image;
            try {
              if (fs.existsSync(deleteImagePath)) {
                fs.unlinkSync(deleteImagePath);
              }
            } catch (err) {
              console.log(err);
              //TODO: Some kind of email alert or logger needed here.
            }
          });
        }
      }
    } catch (err) {
      console.log(err);
      //TODO: Some kind of email alert or logger needed here.
    }
  });
};

module.exports = { scheduleDelete, deleteStrayUploads };
