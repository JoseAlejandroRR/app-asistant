import * as dotenv from 'dotenv'
import http from "http";
import { writeFile } from 'fs/promises';
import { readFileSync, unlinkSync } from 'fs';
import { downloadFile, loadData, storeData } from './utils.js';
import cron from "node-cron";
import GoogleService from './services/GoogleService.js';
import TwillioService from './services/TwilioService.js';
import OpenAIService from './services/OpenAIService.js';

dotenv.config()

const {
  GOOGLE_ACCOUNT,
  TWILIO_SID,
  TWILLIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  OPENAI_API_KEY,
  USER_NAME,
  PORT,
} = process.env 

const MINUTE_TIME = (1000 * 60);

let DATA = loadData();

const DOMAIN = `${process.env.HOST}:${PORT}`;

let accessGranted = false;

const googleService = new GoogleService(DOMAIN);

const twillioClient = new TwillioService({
  accountSid: TWILIO_SID,
  authToken: TWILLIO_AUTH_TOKEN,
  twillioPhoneNumber: TWILIO_PHONE_NUMBER,
});

const openAI = new OpenAIService(OPENAI_API_KEY);

const storeCall = (event, call) => {
  const alreadyExist = DATA.records.some((record) => record.event.id === event.id)

  if (alreadyExist) return;

  DATA.records.push({
    event, 
    call
  })

  storeData(DATA);
}

const processEvent = async (event) => {
  const startTime = event.start.dateTime;
  const endTime = event.end.dateTime;
  let duration = 15 * MINUTE_TIME;

    
  if (startTime && endTime) {
    duration = (Date.parse(endTime) - Date.parse(startTime) ) / MINUTE_TIME
  }
  console.log(`Checking Meeting: ${event.summary}`);
  const isConfirmed = event.attendees
  .some((user) => user.email === GOOGLE_ACCOUNT && user.responseStatus === "accepted")
  
  const isNow = ((Date.now() - (Date.parse(startTime))) / MINUTE_TIME);
  // console.log("NOW", isNow)
  if (isNow < 0) {
    console.log("IS not now Call...")
    return;
  }
  
  if (!isConfirmed ) {
    console.log(`Skiping Meeting: ${event.summary}`)
    return
  }
  
  const targetPhone = event?.conferenceData?.entryPoints[2].label || null
  const pinAccess = event?.conferenceData?.entryPoints[2].pin || null;
  if (!targetPhone) {
    console.log("Wrong phone Number:", targetPhone);
    return
  }
  
  console.log(`Calling: ${targetPhone}`, duration)
  duration = 30;
  twillioClient.executeCall({
    numberPhone: targetPhone, pinAccess, time: duration,
    onSuccess: (call) => {
      console.log(call);
      console.log(`Call ID: ${call.sid}`);
      storeCall(event, call);
    },
    onError: (err) => {
      console.log("[twilioClient] Error executing call: ", err);
    }
  });
}

const processCall = async (record,recording) => {
  const { event } = record;
  const filePath = `./audios/${recording.callSid}.wav`;
  await downloadFile(recording.mediaUrl, filePath);
  console.log('File downloaded successfully!');

  const textFromCall = await googleService.getTextFromAudio(filePath)
  const sumarize = await openAI.getSummary(textFromCall, USER_NAME)
  console.log("TEXT Sumary:")
  console.log(sumarize.data.choices)
  record.summary = sumarize.data;

  const arr = DATA.records
    .filter((item) => item.event.id !== event.id);

  DATA.records = arr;
  DATA.records.push(record)

  storeData(DATA)

  googleService.sendEmail({
    subject: `App-Sistant: ${event.summary}`,
    content: `
    <b>Summary</b><hr/><p>${sumarize.data.choices[0].text}.</p>
    `
  });
}

const startWorker = async () => {
  try {
    const tokensData = readFileSync('tokens.json', 'utf8');
    const token = JSON.parse(tokensData);
    const accountData = await googleService.getAccountData(token);
    DATA.email = accountData.emailAddress;
    storeData(DATA);
    accessGranted = true;
  } catch (err) {
    console.log("[startWorker] Invalid Account Token: ", err);
    console.log(`Go to login at: ${DOMAIN}`);
  }
}

const main = async () => {
  try {
    const events = await googleService.getCalendarEvents();

    if (events.length) {
      events.forEach((event) => {
        const check = DATA.records.some((record) => record.event.id === event.id);
        if (!check) {
          processEvent(event)
        }
      });
    } else {
      console.log('No events.');
    }
  } catch (err) {
    console.error('Error loading events:', err);
  } 

  try {
    const calls = await twillioClient.getCalls();

    calls.forEach((call) => {
      const record = DATA.records.find((record) => record.call.sid === call.callSid)
      if (record) {
        if (!record.summary) {
          processCall(record, call)
        }
      }
    })
  } catch (err) {
    console.log("[twillioClient]: Error getting calls:", err)
  }
  
}

const server = http.createServer(async (req, res) => {
  if (req.url.indexOf('/oauth2callback') > -1) {
    const qs = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const code = qs.get("code");
    const auth = await googleService.oAuth2Client.getToken(code);
    await writeFile("tokens.json", JSON.stringify(auth.tokens));
    await startWorker();
    res.end("Authentication successful! You can close this tab now.");

  } else if (req.url.indexOf('/logout') > -1) {
    accessGranted = false;
    await unlinkSync("tokens.json");
    await startWorker();
    res.writeHead(302, { location: "/" });
    res.end();
  } else {
    console.log("GO TO LOGIN")
    const loginURL = await googleService.getLoginURL(DOMAIN);
    res.writeHead(302, { location: loginURL });
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${DOMAIN}`);
});

cron.schedule('*/30 * * * *', () => {
  if (!accessGranted) return;
  
  main()
});

setTimeout(() => {
  startWorker();
}, 1000);