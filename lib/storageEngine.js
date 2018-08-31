const _ = require('lodash');
const stream = require('stream');
const Promise = require('bluebird');

const awsBucketUploadStream = (bucket, Key) => {
  const s3 = bucket.S3;
  const pass = new stream.PassThrough();
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    // TODO: change key
    Key: `demo-${Key}`,
    Body: pass,
  };
  return {
    awsWriteStream: pass,
    awsUploadPromise: s3.upload(params).promise(),
  };
};

const gcsBucketUploadStream = (bucket, Key) => {
  const gcFile = bucket.file(Key);
  return gcFile.createWriteStream();
};

// https://github.com/petkaantonov/bluebird/issues/332#issuecomment-58326173
const streamToPromise = streamObj =>
   new Promise((resolve, reject) => {
     streamObj.on('end', resolve);
     streamObj.on('error', reject);
   });

// Built based on multer storage engine
// https://github.com/expressjs/multer/blob/master/StorageEngine.md
function MyCustomStorage (opts) {
  this.getDestination = (opts.destination || getDestination)
  this.awsBucket = _.get(opts, 'awsBucket');
  this.gcsBucket = _.get(opts, 'gcsBucket');
}

MyCustomStorage.prototype._handleFile = function _handleFile (req, file, cb) {
  const awsBucket = this.awsBucket;
  const gcsBucket = this.gcsBucket;
  this.getDestination(req, file, function (err, path) {
    if (err) return cb(err)
    const { writeStream, promise } = bucketUploadStream(awsBucket,
      `custom-upload.txt`);
    file.stream.pipe(writeStream);
    promise.then(console.log);

    const gcsWriteStream = gcsBucketUploadStream(gcsBucket,
      `custom-upload.txt`);
    file.stream.pipe(gcsWriteStream).on('error', console.log)
      .on('finish', console.log);

    // Old
    var outStream = fs.createWriteStream(path)

    file.stream.pipe(outStream)
    outStream.on('error', cb)
    outStream.on('finish', function () {
      cb(null, {
        path: path,
        size: outStream.bytesWritten
      })
    })
  })
}

MyCustomStorage.prototype._removeFile = function _removeFile (req, file, cb) {
  fs.unlink(file.path, cb)
}

module.exports = function (opts) {
  return new MyCustomStorage(opts)
}
