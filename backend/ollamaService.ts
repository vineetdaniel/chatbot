import axios from 'axios';
import { NextApiResponse } from 'next';
import { IncomingForm, Fields, Files } from 'formidable';

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const TIMEOUT = 30000; // 30 seconds timeout

export async function generateStreamingResponse(
  messages: { role: string; content: string }[],
  model: string = 'llama2',
  res: NextApiResponse,
  pdfContent?: string
) {
  console.log('Backend: Sending streaming request to Ollama:', { messages, model, hasPdfContent: !!pdfContent });

  let prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  
  if (pdfContent) {
    prompt = `The following is the content of a PDF document:\n\n${pdfContent}\n\nPlease answer questions based on this content.\n\n${prompt}`;
  }
  
  // Add instructions for bullet points
  prompt += '\nPlease format your response as a list of bullet points, using "-" as the bullet character. Each bullet point should be on a new line.\n\nassistant:';

  try {
    const response = await axios.post(OLLAMA_ENDPOINT, {
      model: model,
      prompt: prompt,
      stream: true,
    }, {
      responseType: 'stream',
      timeout: TIMEOUT,
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    let buffer = '';
    response.data.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() !== '') {
          try {
            const json = JSON.parse(line);
            if (json.done) {
              res.write(`data: [DONE]\n\n`);
            } else {
              res.write(`data: ${JSON.stringify(json)}\n\n`);
            }
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        }
      }
    });

    response.data.on('end', () => {
      if (buffer.trim() !== '') {
        try {
          const json = JSON.parse(buffer);
          if (json.done) {
            res.write(`data: [DONE]\n\n`);
          } else {
            res.write(`data: ${JSON.stringify(json)}\n\n`);
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      }
      res.end();
    });

  } catch (error) {
    console.error('Backend: Error communicating with Ollama:', error);
    res.status(500).json({ error: 'Failed to generate response from Ollama' });
  }
}

export async function listModels(): Promise<string[]> {
  try {
    const response = await axios.get(`${OLLAMA_ENDPOINT}/api/tags`);
    return response.data.models || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

// Update this function to handle file uploads
export function parseForm(req: any): Promise<{ fields: Fields; files: Files }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}