import { Configuration, OpenAIApi } from "openai"

 
let openaiClient = null;

class OpenAIService {

  constructor(OPENAI_API_KEY) {
    const configuration = new Configuration({
      apiKey: OPENAI_API_KEY,
    });

    openaiClient = new OpenAIApi(configuration);
  }

  async getSummary(text, interestedPerson) {
    const response = await openaiClient.createCompletion({
      model: "text-davinci-003",
      prompt: `Give me a summary of the following text first and then a summary of everything that is related to "${interestedPerson}":\\n\\${text}.`,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
  
    return response
  }
}

export default OpenAIService