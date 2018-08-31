# multer-s3-gcs

Upload to Amazon S3 and Google Cloud Storage in parallel made easy

## Instalation

```
$ npm i -S multer-s3-gcs
```


## Usage

```javascript
const express = require('express');
const multer = require('multer');
const AWSBucket = require('s3-bucket-toolkit');
const GCStorage = require('@google-cloud/storage');
const MulterS3GCS = require('multer-s3-gcs');

const app = express();
// configure your buckets
const awsBucket = new AWSBucket({ /* ... */ });
const gcs = GCStorage({ /* ... */ });
const gcsBucket = gcs.bucket(/* ... */);

// apply multer S3 and GCS Storage Engine
const upload = multer({
  storage: MulterS3GCS({
    awsBucket: awsBucket,
    gcsBucket: gcsBucket,
    destination: function (req, file, cb) {
      cb(null, '/bucket-folder/' + file.originalname)
    }
  }),
});

app.post('/endpoint/upload', upload.array('files'), function(req, res, next) {
  // Upload success
  console.log(req.files);
  res.send(200);
});
```
