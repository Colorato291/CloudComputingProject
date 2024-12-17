const Minio = require('minio');

// Minio klienta definēšana
const minioClient = new Minio.Client({
    endPoint: 'minio',
    port: 9000,
    useSSL: false,
    accessKey: '221RDB026',
    secretKey: 'password'
});

// Nepieciešamo bucket nosaukumi
const bucketNames = ['entryplates', 'exitplates'];
// Funkcija bucket pārbaudei, ja nav, tad izveido
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
