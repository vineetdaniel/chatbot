import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import fs from 'fs';
import pdf from 'pdf-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Received request to /api/upload-pdf');
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);

  if (req.method !== 'POST') {
    console.log(`Method ${req.method} not allowed`);
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      res.status(500).json({ error: 'Failed to process file upload' });
      return;
    }

    console.log('Parsed form fields:', fields);
    console.log('Parsed form files:', files);

    const file = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf;

    if (!file) {
      console.log('No PDF file uploaded');
      res.status(400).json({ error: 'No PDF file uploaded' });
      return;
    }

    if (!('filepath' in file)) {
      console.log('Invalid file format');
      res.status(400).json({ error: 'Invalid file format' });
      return;
    }

    try {
      console.log('Reading file:', file.filepath);
      const dataBuffer = await fs.promises.readFile(file.filepath);
      console.log('Parsing PDF');
      const pdfData = await pdf(dataBuffer);
      console.log('PDF parsed successfully');
      const response = { content: pdfData.text };
      console.log('Sending response');
      res.status(200).json(response);
      console.log('Response sent successfully');
    } catch (error) {
      console.error('Error processing PDF:', error);
      res.status(500).json({ error: 'Failed to process PDF' });
    } finally {
      // Clean up the temporary file
      try {
        console.log('Deleting temporary file:', file.filepath);
        await fs.promises.unlink(file.filepath);
        console.log('Temporary file deleted successfully');
      } catch (unlinkErr) {
        console.error('Error deleting temporary file:', unlinkErr);
      }
    }
  });

  // Add a timeout to ensure the request doesn't stall
  const timeout = setTimeout(() => {
    if (!res.writableEnded) {
      console.log('Request timed out');
      res.status(500).json({ error: 'Request timed out' });
    }
  }, 30000); // 30 seconds timeout

  // Clear the timeout when the response is sent
  res.on('finish', () => {
    clearTimeout(timeout);
    console.log('Response finished');
  });
}