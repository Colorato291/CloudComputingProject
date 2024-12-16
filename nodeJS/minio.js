const Minio = require('minio');

const minioClient = new Minio.Client({
    endPoint: 'minio',
    port: 9000,
    useSSL: false,
    accessKey: '221RDB026',
    secretKey: 'password'
});

const bucketNames = ['entryplates', 'exitplates'];

async function checkBuckets() {
  for (const name of bucketNames) {
      try {
          const exists = await minioClient.bucketExists(name);
          if (!exists) {
              await minioClient.makeBucket(name);
              console.log(`MinIO: Bucket ${name} created successfully`);
          } else {
              console.log(`MinIO: Bucket ${name} already exists`);
          }
      } catch (err) {
          console.error(`MinIO: Error checking or creating bucket ${name}:`, err);
      }
  }
}

module.exports = {minioClient, checkBuckets};
