import twilio from 'twilio';
import { getConfigCall } from '../utils.js';

const MAX_CALL_DURATION = 60 * 15;

let twilioClient = null;
let twillioPhone = null;

class TwillioService {

  constructor({accountSid, authToken, twillioPhoneNumber}) {
    twilioClient = twilio(accountSid, authToken);
    twillioPhone = twillioPhoneNumber;
  }

  async executeCall({ numberPhone, pinAccess, time, onSuccess, onError }){
    let duration = time || 10;
    if (duration > MAX_CALL_DURATION) duration = MAX_CALL_DURATION;

    const twimlData = getConfigCall(duration);

    twilioClient.calls
      .create({
        twiml: twimlData,
        to: numberPhone,
        from: twillioPhone,
        record: true,
        sendDigits: `${pinAccess}#`
      })
      .then((call) => {
        if (onSuccess && onSuccess instanceof Function) {
          onSuccess(call)
        }
      })
      .catch((err) => {
        if (onSuccess && onSuccess instanceof Function) {
          onError(err)
        }
      });
  }

  async getCalls() {
    return new Promise((resolve, reject) => {      
      twilioClient.recordings.list(async (err, recording) => {
        if (err) {
          reject(err)
        } else {
          resolve(recording)
        }
      })
    })
  }
}

export default TwillioService
