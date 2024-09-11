import Head from 'next/head';
import Chatbot from '../components/Chatbot';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Chatbot UI</title>
        <meta name="description" content="Chatbot UI with Next.js and Ollama" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">Welcome to Chatbot UI</h1>
        <p className="text-xl mb-4">Click the chat icon in the bottom right to start a conversation.</p>
        <Chatbot />
      </main>
    </div>
  );
}