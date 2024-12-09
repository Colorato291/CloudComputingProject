const Minio = require('minio');

const minioClient = new Minio.Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false
});

const bucketNames = ['entryPlates', 'exitPlates'];

async function checkBuckets() {
    bucketNames.forEach(name => {
        minioClient.bucketExists(name, (err) => {
            if (err && err.code === 'NoSuchBucket') {
              minioClient.makeBucket(name, (err) => {
                if (err) console.error('Error creating bucket:', err);
                else console.log('Bucket created successfully');
              });
            } else if (err) {
              console.error('Error checking bucket existence:', err);
            } else {
              console.log('Bucket already exists.');
            }
          });
    });
}

checkBuckets();

module.exports = minioClient;