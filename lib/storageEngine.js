const _ = require("lodash");
const stream = require("stream");
const Promise = require("bluebird");

const awsBucketUploadStream = (bucket, Key) => {
  const s3 = bucket.S3;
  const pass = new stream.PassThrough();
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    // TODO: change key
    Key: `demo-${Key}`,
    Body: pass
  };
  return {
    awsWriteStream: pass,
    awsUploadPromise: s3.upload(params).promise()
  };
};

const gcsBucketUploadStream = (bucket, Key) => {
  const gcFile = bucket.file(Key);
  return gcFile.createWriteStream();
};

// https://github.com/petkaantonov/bluebird/issues/332#issuecomment-58326173
const streamToPromise = streamObj =>
  new Promise((resolve, reject) => {
    streamObj.on("finish", resolve);
    streamObj.on("error", reject);
  });

// Built based on multer storage engine
// https://github.com/expressjs/multer/blob/master/StorageEngine.md
function StorageEngine(opts) {
  this.getDestination = opts.destination || getDestination;
  this.awsBucket = _.get(opts, "awsBucket");
  this.gcsBucket = _.get(opts, "gcsBucket");
}

StorageEngine.prototype._handleFile = function _handleFile(req, file, cb) {
  const awsBucket = this.awsBucket;
  const gcsBucket = this.gcsBucket;
  this.getDestination(req, file, function(err, path) {
    if (err) return cb(err);
    console.log('destination', path)
    const { awsWriteStream, awsUploadPromise } = awsBucketUploadStream(awsBucket, path);
    // Pipe file stream to AWS Upload Manager
    file.stream.pipe(awsWriteStream);
    const aUploadPromise = streamToPromise(awsWriteStream);

    const gcsWriteStream = gcsBucketUploadStream(gcsBucket, path);
    // Pipe file stream to GCS file
    file.stream.pipe(gcsWriteStream);
    const gcsUploadPromise = streamToPromise(gcsWriteStream);

    // Parallel promisified uploads begin
    Promise.all([aUploadPromise, gcsUploadPromise])
      .then(() => {
        console.log('Is it done?');
        cb(null, {
          path: path,
          size: gcsWriteStream.bytesWritten,
        });
      })
      .catch((err) => {
        console.log(err);
        cb(err);
      });
  });
};

StorageEngine.prototype._removeFile = function _removeFile(req, file, cb) {
  fs.unlink(file.path, cb);
};

module.exports = function(opts) {
  return new StorageEngine(opts);
};
