import fs from "fs";
import https from 'https';

export const initialData = {
  records: []
} 

export const readFile = (path) => {
  try {
    const file = fs.readFileSync(path, { encoding: "utf-8" });
    return file
  } catch {
    return null;
  }
}

export const writeFile = (path, content) => {
  try {
    fs.writeFileSync(path, content, { encoding: 'utf8' })

    return true
  } catch(err) {
    console.log(err);
    return false
  }
}

export const loadData = () => {
  const localConfig = readFile("./data.json")
  if (localConfig) {
    return JSON.parse(localConfig)
  }
  return initialData
}

export const storeData = (data) => {
  writeFile("./data.json", JSON.stringify(data));
}

export const getConfigCall = (duration) => {
  const twimlData = `
  <Response>
    <Gather timeout="${duration}">
      <Say>Hey, this is Jose\' Virtual Assistant, I will be present to take notes. Thanks.</Say>
    </Gather>
    <Say>My time is over. Good bye, Thank you.</Say>
  </Response>
  `;
  
  return twimlData
}

export const downloadFile = async (url, outputPath) => {
  const file = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file, status code: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (error) => {
        fs.unlink(outputPath, () => reject(error));
      });
    });
  });
}
