import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const llamaApiCall = async (prompt, format) => {
  const llamaEndpoint = 'http://localhost:11434/api/generate';

  try {
    const response = await axios.post(llamaEndpoint, {
      model: process.env.LLAMA_MODEL,
      prompt,
      stream: false,
      format,

    });

    if (response?.data?.response) {
      return JSON.parse(response.data.response.trim());
    } else {
      console.error('Invalid Llama response format:', response.data);
      return {};
    }
  } catch (error) {
    console.error('Error communicating with Llama API:', error.response?.data || error.message);
    return {};
  }
};

export { llamaApiCall };
