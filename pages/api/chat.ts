import type { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';
import { generateStreamingResponse, listModels } from '../../backend/ollamaService';

// Initialize the cors middleware
const cors = Cors({
  methods: ['POST', 'HEAD'],
});

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  if (req.method === 'POST') {
    if (req.body.messages) {
      try {
        const messages = req.body.messages;
        const pdfContent = req.body.pdfContent;
        await generateStreamingResponse(messages, 'llama2', res, pdfContent);
      } catch (error) {
        console.error('Error processing messages:', error);
        res.status(400).json({ error: 'Invalid messages format' });
      }
    } else {
      try {
        const models = await listModels();
        res.status(200).json({ models });
      } catch (error) {
        console.error('Error fetching models:', error);
        res.status(500).json({ error: 'Error fetching models' });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}