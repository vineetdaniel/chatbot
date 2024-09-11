import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, XMarkIcon, DocumentArrowUpIcon, ClipboardIcon } from '@heroicons/react/24/outline';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [pdfContent, setPdfContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const formData = new FormData();
      formData.append('pdf', file);

      try {
        const response = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          setPdfContent(result.content);
          setMessages(prevMessages => [...prevMessages, { role: 'system', content: 'PDF uploaded successfully. You can now ask questions about its content.' }]);
        } else {
          console.error('Failed to upload PDF');
        }
      } catch (error) {
        console.error('Error uploading PDF:', error);
      }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    const newMessages = [...messages, userMessage];
    console.log('Frontend: Sending message to backend:', newMessages);

    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          pdfContent: pdfContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let assistantMessage = { role: 'assistant', content: '' };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsLoading(false);
            } else {
              try {
                const parsedData = JSON.parse(data);
                assistantMessage.content += parsedData.response;
                setMessages(prevMessages => {
                  const updatedMessages = [...prevMessages];
                  const lastMessage = updatedMessages[updatedMessages.length - 1];
                  if (lastMessage.role === 'assistant') {
                    return [...updatedMessages.slice(0, -1), assistantMessage];
                  } else {
                    return [...updatedMessages, assistantMessage];
                  }
                });
              } catch (error) {
                console.error('Error parsing message:', error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Frontend: Error sending message:', error);
      setIsLoading(false);
      setMessages(prevMessages => [...prevMessages, { role: 'system', content: 'An error occurred while sending the message. Please try again.' }]);
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const closeChat = () => {
    setIsOpen(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const copyEntireChat = () => {
    const chatText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    copyToClipboard(chatText);
  };

  const formatMessage = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.trim().startsWith('-')) {
        return <li key={index}>{line.trim().substring(1).trim()}</li>;
      }
      return <p key={index}>{line}</p>;
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 bg-blue-500 text-white rounded-full p-3 shadow-lg hover:bg-blue-600"
      >
        <ChatBubbleLeftRightIcon className="h-6 w-6" />
      </button>

      <Dialog open={isOpen} onClose={closeChat} className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white rounded-lg w-full max-w-md mx-auto shadow-xl flex flex-col" style={{ height: '80vh' }}>
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Chat</h2>
              <div className="flex items-center">
                <button
                  onClick={copyEntireChat}
                  className="text-gray-500 hover:text-gray-700 mr-2"
                  title="Copy Entire Chat"
                >
                  <ClipboardIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-500 hover:text-gray-700 mr-2"
                  title="Upload PDF"
                >
                  <DocumentArrowUpIcon className="h-6 w-6" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="application/pdf"
                  className="hidden"
                />
                <button
                  onClick={closeChat}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-2 rounded-lg ${message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'} relative group`}>
                    {message.role === 'assistant' ? (
                      <ul className="list-none pl-0 pr-6">
                        {formatMessage(message.content)}
                      </ul>
                    ) : (
                      <span className="pr-6">{message.content}</span>
                    )}
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="absolute bottom-1 right-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      title="Copy this message"
                    >
                      <ClipboardIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="text-center">
                  <svg className="inline-block w-8 h-8 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="border-t p-4 flex">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                className="flex-grow border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your message..."
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-blue-500 text-white rounded-r-lg px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </Dialog>
    </>
  );
}