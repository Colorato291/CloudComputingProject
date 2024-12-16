const { exec } = require('child_process');
const fs = require('fs').promises

async function analysePlate(imageBuffer) {
  await fs.writeFile('/tmp/img.png', imageBuffer);

  const result = await new Promise((resolve) => {
    exec('docker exec OpenALPR-plateReader alpr -c eu -j /tmp/img.png', (err, stdout, stderr) => {
      if (err || stderr) {
        console.error(`Error: ${err ? err.message : stderr}`);
        return resolve(null);
      }

      try {
        const parsedResult = JSON.parse(stdout.toString());

        const result = parsedResult.results
        if (result.length === 0) {
          return resolve(null);
        }

        let bestPlate = null;
        let bestCandidatesCount = 0;
        let bestConfidence = 0;
        result.forEach(result => {
          const candidateCount = result.candidates.length;
          if (candidateCount > bestCandidatesCount ||
            (candidateCount === bestCandidatesCount && result.confidence > bestConfidence)) {
            bestCandidatesCount = candidateCount;
            bestPlate = result.plate;
            bestConfidence = result.confidence;
          }
        });

        return resolve(bestPlate);
      } catch (error) {
        console.error('OALPR: Error parsing JSON:', error);
        return resolve(null);
      }
    });
  });

  return result;
}

module.exports = analysePlate;