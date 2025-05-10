'use client';

import type React from 'react';

import { type FormEvent, useEffect, useRef, useState, useCallback } from 'react';
import { useActions, readStreamableValue } from 'ai/rsc';
import type { AI } from './action';
import { ChatScrollAnchor } from '@/lib/hooks/chat-scroll-anchor';
import Textarea from 'react-textarea-autosize';
import { useEnterSubmit } from '@/lib/hooks/use-enter-submit';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// Main components
import SearchResultsComponent from '@/components/answer/SearchResultsComponent';
import UserMessageComponent from '@/components/answer/UserMessageComponent';
import FollowUpComponent from '@/components/answer/FollowUpComponent';
import InitialQueries from '@/components/answer/InitialQueries';
import Header from '@/components/header';

// Sidebar components
import LLMResponseComponent from '@/components/answer/LLMResponseComponent';
import ImagesComponent from '@/components/answer/ImagesComponent';
import VideosComponent from '@/components/answer/VideosComponent';

// Function calling components
const MapComponent = dynamic(() => import('@/components/answer/Map'), { ssr: false });
import MapDetails from '@/components/answer/MapDetails';
import ShoppingComponent from '@/components/answer/ShoppingComponent';
import FinancialChart from '@/components/answer/FinancialChart';
import Spotify from '@/components/answer/Spotify';
import ImageGenerationComponent from '@/components/answer/ImageGenerationComponent';
import { Mic, Paperclip, Send } from 'lucide-react';

// OPTIONAL: Use Upstash rate limiting to limit the number of requests per user
import RateLimit from '@/components/answer/RateLimit';
import { mentionToolConfig } from './tools/mentionToolConfig';

// Types
interface SearchResult {
  favicon: string;
  link: string;
  title: string;
}

interface Message {
  falBase64Image: any;
  logo: string | undefined;
  semanticCacheKey: any;
  cachedData: string;
  id: number;
  type: string;
  content: string;
  userMessage: string;
  images: Image[];
  videos: Video[];
  followUp: FollowUp | null;
  isStreaming: boolean;
  searchResults?: SearchResult[];
  conditionalFunctionCallUI?: any;
  status?: string;
  places?: Place[];
  shopping?: Shopping[];
  ticker?: string | undefined;
  spotify?: string | undefined;
  isolatedView: boolean;
}

interface StreamMessage {
  isolatedView: any;
  searchResults?: any;
  userMessage?: string;
  llmResponse?: string;
  llmResponseEnd?: boolean;
  images?: any;
  videos?: any;
  followUp?: any;
  conditionalFunctionCallUI?: any;
  status?: string;
  places?: Place[];
  shopping?: Shopping[];
  ticker?: string;
  spotify?: string;
  cachedData?: string;
  semanticCacheKey?: any;
  falBase64Image?: any;
}

interface Image {
  link: string;
}

interface Video {
  link: string;
  imageUrl: string;
}

interface Place {
  cid: React.Key | null | undefined;
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  rating: number;
  category: string;
  phoneNumber?: string;
  website?: string;
}

interface FollowUp {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface Shopping {
  type: string;
  title: string;
  source: string;
  link: string;
  price: string;
  shopping: any;
  position: number;
  delivery: string;
  imageUrl: string;
  rating: number;
  ratingCount: number;
  offers: string;
  productId: string;
}

const mentionTools = mentionToolConfig.useMentionQueries ? mentionToolConfig.mentionTools : [];

export default function Page() {
  const [file, setFile] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentionTool, setSelectedMentionTool] = useState<string | null>(null);
  const [selectedMentionToolLogo, setSelectedMentionToolLogo] = useState<string | null>(null);
  const [showRAG, setShowRAG] = useState(false);

  // Set up action that will be used to stream all the messages
  const { myAction } = useActions<typeof AI>();

  // Set up form submission handling
  const { formRef, onKeyDown } = useEnterSubmit();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Set up state for the messages
  const [messages, setMessages] = useState<Message[]>([]);

  // Set up state for the CURRENT LLM response (for displaying in the UI while streaming)
  const [currentLlmResponse, setCurrentLlmResponse] = useState('');

  // Set up handler for when the user clicks on the follow up button
  const handleFollowUpClick = useCallback(
    async (question: string) => {
      setCurrentLlmResponse('');
      await handleUserMessageSubmission({
        message: question,
        mentionTool: null,
        logo: null,
        file: file,
      });
    },
    [file],
  );

  // For the form submission, we need to set up a handler that will be called when the user submits the form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        if (e.target && ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).nodeName)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (inputRef?.current) {
          inputRef.current.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputRef]);

  // Set up handler for when a submission is made, which will call the myAction function
  const handleSubmit = async (payload: {
    message: string;
    mentionTool: string | null;
    logo: string | null;
    file: string;
  }) => {
    if (!payload.message) return;
    await handleUserMessageSubmission(payload);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setInputValue('');

    const payload = {
      message: inputValue.trim(),
      mentionTool: selectedMentionTool,
      logo: selectedMentionToolLogo,
      file: file,
    };
    await handleSubmit(payload);
    setShowRAG(false);
    setSelectedMentionTool(null);
    setSelectedMentionToolLogo(null);
    setFile('');
    setFileName(null);
  };

  const handleUserMessageSubmission = async (payload: {
    logo: any;
    message: string;
    mentionTool: string | null;
    file: string;
  }): Promise<void> => {
    const newMessageId = Date.now();
    const newMessage = {
      id: newMessageId,
      type: 'userMessage',
      userMessage: payload.message,
      mentionTool: payload.mentionTool,
      file: payload.file,
      logo: payload.logo,
      content: '',
      images: [],
      videos: [],
      followUp: null,
      isStreaming: true,
      searchResults: [] as SearchResult[],
      places: [] as Place[],
      shopping: [] as Shopping[],
      status: '',
      ticker: undefined,
      spotify: undefined,
      semanticCacheKey: null,
      cachedData: '',
      isolatedView: !!payload.mentionTool, // Set isolatedView based on mentionTool
      falBase64Image: null,
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    let lastAppendedResponse = '';
    try {
      const streamableValue = await myAction(
        payload.message,
        payload.mentionTool,
        payload.logo,
        payload.file,
      );

      let llmResponseString = '';
      for await (const message of readStreamableValue(streamableValue)) {
        const typedMessage = message as StreamMessage;
        setMessages((prevMessages) => {
          const messagesCopy = [...prevMessages];
          const messageIndex = messagesCopy.findIndex((msg) => msg.id === newMessageId);
          if (messageIndex !== -1) {
            const currentMessage = messagesCopy[messageIndex];

            currentMessage.status =
              typedMessage.status === 'rateLimitReached'
                ? 'rateLimitReached'
                : currentMessage.status;

            if (typedMessage.isolatedView) {
              currentMessage.isolatedView = true;
            }

            if (typedMessage.llmResponse && typedMessage.llmResponse !== lastAppendedResponse) {
              currentMessage.content += typedMessage.llmResponse;
              lastAppendedResponse = typedMessage.llmResponse;
            }

            currentMessage.isStreaming = typedMessage.llmResponseEnd
              ? false
              : currentMessage.isStreaming;
            currentMessage.searchResults =
              typedMessage.searchResults || currentMessage.searchResults;
            currentMessage.images = typedMessage.images
              ? [...typedMessage.images]
              : currentMessage.images;
            currentMessage.videos = typedMessage.videos
              ? [...typedMessage.videos]
              : currentMessage.videos;
            currentMessage.followUp = typedMessage.followUp || currentMessage.followUp;
            currentMessage.semanticCacheKey = messagesCopy[messageIndex];
            currentMessage.falBase64Image = typedMessage.falBase64Image;

            if (typedMessage.conditionalFunctionCallUI) {
              const functionCall = typedMessage.conditionalFunctionCallUI;
              if (functionCall.type === 'places') currentMessage.places = functionCall.places;
              if (functionCall.type === 'shopping') currentMessage.shopping = functionCall.shopping;
              if (functionCall.type === 'ticker') currentMessage.ticker = functionCall.data;
              if (functionCall.trackId) currentMessage.spotify = functionCall.trackId;
            }

            if (typedMessage.cachedData) {
              const data = JSON.parse(typedMessage.cachedData);
              currentMessage.searchResults = data.searchResults;
              currentMessage.images = data.images;
              currentMessage.videos = data.videos;
              currentMessage.content = data.llmResponse;
              currentMessage.isStreaming = false;
              currentMessage.semanticCacheKey = data.semanticCacheKey;
              currentMessage.conditionalFunctionCallUI = data.conditionalFunctionCallUI;
              currentMessage.followUp = data.followUp;

              if (data.conditionalFunctionCallUI) {
                const functionCall = data.conditionalFunctionCallUI;
                if (functionCall.type === 'places') currentMessage.places = functionCall.places;
                if (functionCall.type === 'shopping')
                  currentMessage.shopping = functionCall.shopping;
                if (functionCall.type === 'ticker') currentMessage.ticker = functionCall.data;
                if (functionCall.trackId) currentMessage.spotify = functionCall.trackId;
              }
            }
          }
          return messagesCopy;
        });
        if (typedMessage.llmResponse) {
          llmResponseString += typedMessage.llmResponse;
          setCurrentLlmResponse(llmResponseString);
        }
      }
    } catch (error) {
      console.error('Error streaming data for user message:', error);
    }
  };

  const handleFileUpload = (file: File) => {
    console.log('file', file);
    setFileName(file.name);
    // file reader to read the file and set the file state
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      const base64File = e.target?.result;
      if (base64File) {
        console.log('base64File', base64File);
        setFile(String(base64File));
      }
    };
    fileReader.readAsDataURL(file);
  };

  const clearFile = () => {
    setFile('');
    setFileName(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#111111] text-gray-200">
      <Header />

      <main className="flex-1 overflow-hidden relative">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-180px)] px-4 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-in fade-in duration-700">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 16V12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 8H12.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold mb-2 animate-in fade-in duration-700 delay-100">
              Good to See You!
            </h1>
            <h2 className="text-xl mb-6 text-gray-400 animate-in fade-in duration-700 delay-200">
              What are you looking for?
            </h2>
            <p className="text-sm text-gray-500 mb-12 animate-in fade-in duration-700 delay-300">
              I'm available 24/7 for you, ask me anything.
            </p>

            <div className="w-full max-w-md animate-in fade-in duration-700 delay-400">
              <InitialQueries
                questions={[
                  'When did Daft Punk release Da Funk?',
                  "How is Apple's stock doing these days?",
                  'Where can I get the best bagel in NYC?',
                  'I want to buy a mens patagonia vest',
                ]}
                handleFollowUpClick={handleFollowUpClick}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-6 pb-32 pt-5 px-4 max-w-5xl mx-auto">
            {messages.map((message, index) => (
              <div key={`message-${index}`} className="animate-in fade-in duration-500 ease-out">
                {message.isolatedView ? (
                  <div className="max-w-4xl mx-auto w-full">
                    {selectedMentionTool === 'fal-ai/stable-diffusion-v3-medium' ||
                    message.falBase64Image ? (
                      <ImageGenerationComponent
                        key={`image-${index}`}
                        src={message.falBase64Image || '/placeholder.svg'}
                        query={message.userMessage}
                      />
                    ) : (
                      <LLMResponseComponent
                        key={`llm-response-${index}`}
                        llmResponse={message.content}
                        currentLlmResponse={currentLlmResponse}
                        index={index}
                        semanticCacheKey={message.semanticCacheKey}
                        isolatedView={true}
                        logo={message.logo}
                      />
                    )}
                  </div>
                ) : (
                  // Render regular view
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-3/4 space-y-4">
                      {message.status && message.status === 'rateLimitReached' && (
                        <div className="rounded-lg overflow-hidden">
                          <RateLimit />
                        </div>
                      )}

                      {message.type === 'userMessage' && (
                        <UserMessageComponent message={message.userMessage} />
                      )}

                      {message.ticker && message.ticker.length > 0 && (
                        <div className="rounded-lg overflow-hidden bg-neutral-800 border border-stone-700">
                          <FinancialChart key={`financialChart-${index}`} ticker={message.ticker} />
                        </div>
                      )}

                      {message.spotify && message.spotify.length > 0 && (
                        <div className="rounded-lg overflow-hidden bg-neutral-800 border border-stone-700">
                          <Spotify key={`spotify-${index}`} spotify={message.spotify} />
                        </div>
                      )}

                      {message.searchResults && message.searchResults.length > 0 && (
                        <SearchResultsComponent
                          key={`searchResults-${index}`}
                          searchResults={message.searchResults}
                        />
                      )}

                      {message.places && message.places.length > 0 && (
                        <div className="rounded-lg overflow-hidden bg-neutral-800 border border-stone-700">
                          <MapComponent key={`map-${index}`} places={message.places} />
                        </div>
                      )}

                      <LLMResponseComponent
                        llmResponse={message.content}
                        currentLlmResponse={currentLlmResponse}
                        index={index}
                        semanticCacheKey={message.semanticCacheKey}
                        key={`llm-response-${index}`}
                        isolatedView={false}
                      />

                      {message.followUp && (
                        <FollowUpComponent
                          key={`followUp-${index}`}
                          followUp={message.followUp}
                          handleFollowUpClick={handleFollowUpClick}
                        />
                      )}
                    </div>

                    <div className="w-full md:w-1/4 space-y-4">
                      {message.shopping && message.shopping.length > 0 && (
                        <ShoppingComponent key={`shopping-${index}`} shopping={message.shopping} />
                      )}

                      {message.images && message.images.length > 0 && (
                        <ImagesComponent key={`images-${index}`} images={message.images} />
                      )}

                      {message.videos && message.videos.length > 0 && (
                        <VideosComponent key={`videos-${index}`} videos={message.videos} />
                      )}

                      {message.places && message.places.length > 0 && (
                        <MapDetails key={`map-details-${index}`} places={message.places} />
                      )}

                      {message.falBase64Image && (
                        <ImageGenerationComponent
                          key={`image-${index}`}
                          src={message.falBase64Image || '/placeholder.svg'}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="fixed inset-x-0 bottom-0 z-10">
          <div className="mx-auto max-w-3xl px-4 pb-8 pt-6">
            {/* Modified Chat Form Component */}
            <div className="relative">
              {/* Mention query dropdown above the input */}
              {mentionQuery && (
                <div className="mb-4 bg-neutral-800 rounded-lg border border-stone-700 overflow-hidden animate-in slide-in-from-bottom duration-300">
                  <ul className="divide-y divide-stone-700">
                    {mentionTools
                      .filter((tool) =>
                        tool.name.toLowerCase().includes(mentionQuery.toLowerCase()),
                      )
                      .map((tool) => (
                        <li
                          key={tool.id}
                          className="flex items-center cursor-pointer hover:bg-neutral-700 p-3 transition-colors"
                          onClick={() => {
                            setSelectedMentionTool(tool.id);
                            setSelectedMentionToolLogo(tool.logo);
                            tool.enableRAG && setShowRAG(true);
                            setMentionQuery('');
                            setInputValue(' '); // Update the input value with a single blank space
                          }}>
                          {tool.logo ? (
                            <img
                              src={tool.logo || '/placeholder.svg'}
                              alt={tool.name}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <span role="img" aria-label="link" className="mr-2 text-gray-400">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 256 256"
                                fill="currentColor"
                                className="h-4 w-4">
                                <path d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8Z"></path>
                              </svg>
                            </span>
                          )}

                          <p className="ml-2 text-gray-200 font-medium">@{tool.name}</p>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {fileName && (
                <div className="mb-4 px-3 py-2 bg-neutral-800 rounded-md text-sm flex items-center justify-between animate-in fade-in duration-300">
                  <span className="truncate text-gray-300">{fileName}</span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="ml-2 text-gray-400 hover:text-gray-200 transition-colors">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6 6L18 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Main form with textarea and controls */}
              <form
                ref={formRef}
                onSubmit={async (e) => {
                  e.preventDefault();
                  handleFormSubmit(e);
                  setCurrentLlmResponse('');
                  if (window.innerWidth < 600) {
                    (e.target as HTMLFormElement)['message']?.blur();
                  }
                  const value = inputValue.trim();
                  setInputValue('');
                  if (!value) return;
                }}
                className="relative">
                <div className="relative flex flex-col w-full overflow-hidden rounded-xl border border-stone-600 bg-neutral-800 shadow-lg transition-shadow focus-within:ring-1 focus-within:ring-gray-600">
                  {/* Textarea area at the top */}
                  <div className="min-h-[100px] max-h-[200px] w-full px-4 pt-4 pb-2">
                    <Textarea
                      ref={inputRef}
                      tabIndex={0}
                      onKeyDown={onKeyDown}
                      placeholder="Ask anything..."
                      className="w-full resize-none bg-transparent focus-within:outline-none text-base text-gray-200 min-h-[80px] leading-[1.25] scrollbar-hide"
                      autoFocus
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                      name="message"
                      rows={3}
                      value={inputValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        setInputValue(value);

                        if (value.includes('@')) {
                          const mentionIndex = value.lastIndexOf('@');
                          const query = value.slice(mentionIndex + 1);
                          setMentionQuery(query);
                        } else {
                          setMentionQuery('');
                        }

                        if (value.trim() === '') {
                          setSelectedMentionTool(null);
                          setSelectedMentionToolLogo(null);
                          setShowRAG(false);
                        }
                      }}
                      style={{ overflow: 'hidden' }} // Hide scrollbar
                    />
                  </div>

                  {/* Control bar at the bottom */}
                  <div className="flex items-center justify-between w-full border-t border-stone-700 py-2 px-3">
                    <div className="flex items-center">
                      {showRAG && (
                        <label
                          htmlFor="fileInput"
                          className="flex items-center justify-center w-10 h-10 cursor-pointer text-gray-400 hover:text-gray-200 transition-colors">
                          <Paperclip size={18} />
                        </label>
                      )}

                      <input
                        id="fileInput"
                        type="file"
                        accept=".doc,.docx,.pdf,.txt,.js,.tsx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file);
                          }
                        }}
                      />

                      {selectedMentionToolLogo && (
                        <div className="flex items-center justify-center w-10 h-10">
                          <img
                            src={selectedMentionToolLogo || '/placeholder.svg'}
                            className="w-6 h-6 rounded-full"
                            alt="Tool"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={inputValue === ''}
                      className={cn(
                        'rounded-full w-9 h-9 flex items-center justify-center transition-all',
                        inputValue
                          ? 'bg-stone-600 text-gray-200 hover:bg-gray-600'
                          : 'bg-stone-700 text-gray-500',
                      )}>
                      <Send size={16} />
                      <span className="sr-only">Send message</span>
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-2 text-xs text-center text-gray-500">
                <span className="inline-flex items-center">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-1">
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 16V12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 8H12.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Press / to focus the input box
                </span>
              </div>
            </div>
          </div>
        </div>
        <ChatScrollAnchor trackVisibility={true} />
      </main>
    </div>
  );
}
