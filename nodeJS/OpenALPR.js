const { exec } = require('child_process');
const fs = require('fs').promises // Izmanto promises, lai nodrošinātu await darbību

async function analysePlate(imageBuffer) {
  // Bildes pagaidu saglabāšana no atmiņas bufera
  await fs.writeFile('/tmp/img.png', imageBuffer);

  const result = await new Promise((resolve) => {
    // OpenALPR komandas izpilde (nenorāda latvijas šablonu, jo mēdz sniegt nepareizu rezultātu)
    exec('docker exec OpenALPR-plateReader alpr -c eu -j /tmp/img.png', (err, stdout, stderr) => {
      if (err || stderr) { // Ja ir kāda kļūda, atgriež null
        console.error(`Error: ${err ? err.message : stderr}`);
        return resolve(null);
      }

      try {
        // Iegūst rezultātu
        const parsedResult = JSON.parse(stdout.toString());
        const result = parsedResult.results

        if (result.length === 0) { // Ja nav rezultātu, atgriež null
          return resolve(null);
        }

        let bestPlate = null;
        let bestCandidatesCount = 0;
        let bestConfidence = 0;
        // Labākās numurzīmes izgūšana (ja ALPR attēlā atpazīst vairākus numurus)
        result.forEach(result => {
          const candidateCount = result.candidates.length;
          // Saglabā numurzīmi, ja numurzīmei ir vairāk kandidātu
          // vai vienāds kandidātu skaits, bet lielāks confidence
          if (candidateCount > bestCandidatesCount ||
            (candidateCount === bestCandidatesCount && result.confidence > bestConfidence)) {
            bestCandidatesCount = candidateCount;
            bestPlate = result.plate;
            bestConfidence = result.confidence;
          }
        });
        // Atgriež labāko rezultātu
        return resolve(bestPlate);
      } catch (error) {
        console.error('OALPR: Error parsing JSON:', error);
        return resolve(null); // JSON kļūdas gadījumā atgriež null
      }
    });
  });
  // Atgriež rezultātu
  return result;
}
// Eksportē funkciju
module.exports = analysePlate;