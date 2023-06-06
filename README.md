# app-asistant
AI assistant to take note on your meetings and analyze the output with different tasks

### Features

- SignIn in Google Accounts 
- Get your events scheduled list on Google Calendar
- Check if you confirmed your assistance
- Setup a call to performance the time scheduled using Twilio API per each event.
- Download the calls stores
- Sending .wav files to Google Speech to convert audio to text
- Using OpenAI API extract a overview about the transcription and the subjects reletaed to the user indicated.
- Sending a email with the overview got.

[![Diagram Flow](https://iili.io/H4z0obI.jpg "Diagram Flow")](https://iili.io/H4z0obI.jpg "Diagram Flow")

### Requirements

- Setup Google Cloud Project 
- Enable Gmail, Calendar and Speech APIs
- Get project credentials
- Twillio API credentials
- OpenAI API credentials

### Use cases

- Until this implementation the target is to get the overview from calls what happened over Google Meet about job meetings and works as an AI assistant when the user is busy/vactions/sick/etc and
- As tool for Recruiter team, where the interviwer must to reply a question list with freedom to know how deep is his knoledged about the subject, and instantantly the calls end, using AI will be able to analyze which answers were right or wrong, so, the Recruiter will have a glance at before be check for the technical team.
- Sending a overview about the new features presented in each Demo.
- ....?
