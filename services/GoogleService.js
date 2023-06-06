import { google } from "googleapis"
import { SpeechClient } from "@google-cloud/speech";
import fs from "fs";
import { readFile } from 'fs/promises';

const oAuthCredentials = await readFile(`${process.env.PWD}/oauth_credentials.json`, 'utf8').then(JSON.parse);
const credentials = await readFile(`${process.env.PWD}/credentials.json`, 'utf8').then(JSON.parse);


let gmailService = null;

const getGmailService = async (auth) => {
  const gmail = google.gmail({ version: 'v1', auth });
  return gmail;
};

const speechClient = new SpeechClient({
  projectId: credentials.project_id,
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  }
});

class GoogleService {

  constructor(domain) {
    const { client_id, client_secret } = oAuthCredentials.installed;
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, `${domain}/oauth2callback`);
    
  }

  async getAccountData(token) {
    return new Promise((resolve, reject) => {
        this.oAuth2Client.setCredentials(token)
        gmailService = google.gmail({ version: 'v1', auth: this.oAuth2Client });
        gmailService.users.getProfile({ userId: "me" }, (err, res) => {
          if (err) return reject(err);
          resolve(res.data)
        });
    })
  }
 
  async getLoginURL() {
    
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/gmail.metadata",
      ],
    });
    console.log('Autorice la aplicación visitando esta URL:', authUrl);
    return authUrl;
  }

  async getCalendarEvents() {
    const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items;

    return events;
  }

  async sendEmail(opc) {
    const utf8Subject = `=?utf-8?B?${Buffer.from(opc.subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${process.env.GOOGLE_ACCOUNT}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      opc.content
    ];
    const messageText = messageParts.join('\n');
    const gmailService = await getGmailService(this.oAuth2Client);
    const rawMessage = Buffer.from(messageText).toString('base64');
    const { data: { id } = {} } = await gmailService.users.messages.send({
      userId: 'me',
      resource: {
        raw: rawMessage,
      },
    });
    return id;
  }

  async getTextFromAudio(filePath) {
    const audio = {
      content: fs.readFileSync(filePath).toString('base64'),
    };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 8000,
      languageCode: 'es-ES',
    };
    const request = {
      audio: audio,
      config: config,
    };
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    return transcription
  }
}

export default GoogleService
