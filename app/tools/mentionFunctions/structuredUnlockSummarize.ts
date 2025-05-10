// "use server"

// // 1. Import dependencies
// import OpenAI from "openai";
// import { zodResponseFormat } from "openai/helpers/zod";
// import { z } from "zod";

// // 2. Initialize OpenAI client
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // Define Zod schema for URL extraction
// const UrlExtraction = z.object({
//     url: z.string(),
// });

// // 3. Define the main function
// export async function brightDataWebScraper(mentionTool: string, userMessage: string, streamable: any) {
//     let targetUrl: string;
//     try {
//         // 4. Extract URL from user message using parsed output feature
//         const urlCompletion = await openai.beta.chat.completions.parse({
//             model: "gpt-4o-2024-08-06",
//             messages: [
//                 { role: "system", content: "Extract the most likely valid URL from a natural language query." },
//                 { role: "user", content: userMessage }
//             ],
//             response_format: zodResponseFormat(UrlExtraction, "extractedUrl"),
//         });

//         // 5. Parse and validate URL data
//         const extractedUrl = urlCompletion.choices[0]?.message?.parsed?.url ?? '';

//         if (!extractedUrl) {
//             streamable.update({ llmResponse: `No valid URL found in the user message \n\n` });
//             throw new Error('No valid URL found in the user message');
//         }

//         streamable.update({ llmResponse: `Extracting Information from: [${extractedUrl}](${extractedUrl}) \n\n` });

//         targetUrl = extractedUrl;

//         // 6. Make API request to Bright Data
//         const apiUrl = `http://localhost:3001/api/bright-data`;
//         const response = await fetch(apiUrl, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ url: targetUrl, query: userMessage }),
//         });

//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }

//         // 7. Process API response
//         const responseData = await response.json();

//         if (!responseData.content) {
//             throw new Error('No content received from the server');
//         }

//         let contentForLLM = responseData.content;

//         // 8. Summarize content using OpenAI
//         const summaryStream = await openai.chat.completions.create({
//             model: "gpt-4-turbo-preview",
//             stream: true,
//             messages: [
//                 { role: "system", content: "Always respond in valid markdown format to the user query based on the context provided" },
//                 { role: "user", content: `Here is the context: <context>${contentForLLM}</context> Response to the user query: ${userMessage}` }
//             ]
//         });

//         // 9. Process and stream summary chunks
//         for await (const chunk of summaryStream) {
//             if (chunk.choices[0]?.delta?.content) {
//                 streamable.update({ llmResponse: chunk.choices[0].delta.content });
//             }
//         }

//         streamable.done({ llmResponseEnd: true });
//     } catch (error: unknown) {
//         // 10. Error handling
//         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//         try {
//             let userFriendlyMessage = `Sorry, I was unable to get information from the website. `;
//             if (errorMessage.includes('No content received')) {
//                 userFriendlyMessage += 'The website data could not be processed correctly. This might be due to changes in the website structure or temporary issues.';
//             } else {
//                 userFriendlyMessage += errorMessage;
//             }
//             streamable.update({ llmResponse: userFriendlyMessage });
//             streamable.done({ llmResponseEnd: true });
//         } catch (streamError) {
//             // Error handling for stream update failure
//         }
//     }
// }

'use server';

import { HfInference } from '@huggingface/inference';
import { z } from 'zod';

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Define Zod schema for URL extraction
const UrlExtraction = z.object({
  url: z.string(),
});

// Main web scraper function
export async function brightDataWebScraper(
  mentionTool: string,
  userMessage: string,
  streamable: any,
) {
  let targetUrl: string;

  try {
    // 1. Extract URL from user message
    streamable.update({ llmResponse: `Analyzing your query to find the relevant website...\n\n` });

    // First try a mapping approach for common sites (faster and more reliable)
    const mappedUrl = checkCommonSiteMappings(userMessage);

    let extractedUrl: string | null = null;

    if (mappedUrl) {
      extractedUrl = mappedUrl;
      console.log('URL found via mapping:', extractedUrl);
    } else {
      // Fall back to LLM extraction if mapping doesn't work
      const rawExtractedUrl = await extractUrlFromQuery(userMessage);

      if (rawExtractedUrl) {
        // Clean and validate the extracted URL
        extractedUrl = cleanAndValidateUrl(rawExtractedUrl);
        console.log('URL found via LLM and cleaned:', extractedUrl);
      }
    }

    if (!extractedUrl) {
      streamable.update({ llmResponse: `No valid URL found in the user message \n\n` });
      throw new Error('No valid URL found in the user message');
    }

    streamable.update({
      llmResponse: `Extracting information from: [${extractedUrl}](${extractedUrl}) \n\n`,
    });
    targetUrl = extractedUrl;

    // 2. Make API request to Bright Data
    const apiUrl = `http://localhost:3001/api/bright-data`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: targetUrl, query: userMessage }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 3. Process API response
    const responseData = await response.json();

    if (!responseData.content) {
      throw new Error('No content received from the server');
    }

    let contentForLLM = responseData.content;

    // 4. Summarize content using Hugging Face model
    await summarizeWithMistral(contentForLLM, userMessage, streamable);
  } catch (error: unknown) {
    // 5. Error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    try {
      let userFriendlyMessage = `Sorry, I was unable to get information from the website. `;
      if (errorMessage.includes('No content received')) {
        userFriendlyMessage +=
          'The website data could not be processed correctly. This might be due to changes in the website structure or temporary issues.';
      } else {
        userFriendlyMessage += errorMessage;
      }
      streamable.update({ llmResponse: userFriendlyMessage });
      streamable.done({ llmResponseEnd: true });
    } catch (streamError) {
      // Error handling for stream update failure
      console.error('Error updating stream:', streamError);
    }
  }
}

// Check common website mappings first (faster than LLM)
function checkCommonSiteMappings(query: string): string | null {
  const lowerQuery = query.toLowerCase();

  const siteMappings: Record<string, string> = {
    // "hacker news": "https://news.ycombinator.com/",
    hn: 'https://news.ycombinator.com/',
    'y combinator': 'https://news.ycombinator.com/',
    reddit: 'https://www.reddit.com/',
    twitter: 'https://twitter.com/',
    'x.com': 'https://twitter.com/',
    x: 'https://twitter.com/',
    github: 'https://github.com/',
    stackoverflow: 'https://stackoverflow.com/',
    'stack overflow': 'https://stackoverflow.com/',
    youtube: 'https://www.youtube.com/',
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    nytimes: 'https://www.nytimes.com/',
    'new york times': 'https://www.nytimes.com/',
    bbc: 'https://www.bbc.com/',
    cnn: 'https://www.cnn.com/',
    wikipedia: 'https://en.wikipedia.org/',
    amazon: 'https://www.amazon.com/',
    ebay: 'https://www.ebay.com/',
    linkedin: 'https://www.linkedin.com/',
    netflix: 'https://www.netflix.com/',
  };

  for (const [keyword, url] of Object.entries(siteMappings)) {
    if (lowerQuery.includes(keyword)) {
      return url;
    }
  }

  return null;
}

// URL extraction function with improved cleaning
async function extractUrlFromQuery(query: string) {
  try {
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.3',
      inputs: `<s>You are an expert at extracting the most likely valid URL from user queries. 
              When users mention websites by name but don't provide the exact URL, you know the 
              correct URL to use.
              
              For example:
              - "What are the top 5 stories on hacker news right now?" → https://news.ycombinator.com/
              - "Tell me about the latest tech news on Reddit" → https://www.reddit.com/r/technology/
              - "What's trending on Twitter?" → https://twitter.com/
              
              Return ONLY the URL, nothing else. Do not include any quotes, tags, or additional text.</s>
              
              <user>${query}</user>`,
      parameters: {
        max_new_tokens: 100,
        temperature: 0.1,
        return_full_text: false,
      },
    });

    // Clean up the response
    let extractedText = response.generated_text.trim();

    // Remove any quotes, tags or extra characters that might be in the response
    extractedText = extractedText
      .replace(/['"`]/g, '') // Remove quotes
      .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML/XML tags
      .replace(/[\n\r]/g, '') // Remove newlines
      .trim();

    // Extract URL using regex - look for http/https URL patterns
    const urlRegex = /(https?:\/\/[^\s<>]+)/g;
    const matches = extractedText.match(urlRegex);

    if (matches && matches.length > 0) {
      // Clean up the URL - remove trailing punctuation or closing brackets
      return matches[0].replace(/[,.;:!?)]+$/, '');
    }

    // If no URL was found, check if there's any text that looks like a domain
    // and convert it to a proper URL with https://
    const domainRegex = /([a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/;
    const domainMatches = extractedText.match(domainRegex);

    if (domainMatches && domainMatches.length > 0) {
      return `https://${domainMatches[0]}`;
    }

    // Fallback: If the response doesn't match our patterns but starts with www.
    // add https:// to it
    if (extractedText.startsWith('www.')) {
      return `https://${extractedText}`;
    }

    console.log('Raw LLM response for URL extraction:', extractedText);
    return extractedText; // Return the raw text as a last resort, will be cleaned later
  } catch (error) {
    console.error('Error extracting URL:', error);
    return null;
  }
}

// URL validation and cleaning function
function cleanAndValidateUrl(url: string): string | null {
  try {
    if (!url) return null;

    // Remove any trailing or leading quotes, spaces, brackets
    let cleanUrl = url
      .trim()
      .replace(/^['"`<(\s]+|['"`>)\s]+$/g, '')
      .replace(/<\/?[^>]+(>|$)/g, ''); // Remove any HTML/XML tags

    // Check for closing tags that might be included
    const tagIndex = cleanUrl.indexOf('</');
    if (tagIndex !== -1) {
      cleanUrl = cleanUrl.substring(0, tagIndex);
    }

    // Add https:// prefix if missing
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Validate URL format
    try {
      new URL(cleanUrl);
      return cleanUrl;
    } catch (e) {
      console.warn('Invalid URL format:', cleanUrl);
      return null;
    }
  } catch (error) {
    console.error('Error cleaning URL:', error);
    return null;
  }
}

// Content summarization using Hugging Face streaming API
async function summarizeWithMistral(content: string, query: string, streamable: any) {
  try {
    const prompt = `<s>Always respond in valid markdown format to the user query based on the context provided</s>
                  <user>Here is the context: <context>${content}</context>
                  Response to the user query: ${query}</user>`;

    // Using the SDK's streaming interface
    const stream = await hf.textGenerationStream({
      model: 'mistralai/Mistral-7B-Instruct-v0.3',
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
        return_full_text: false,
      },
    });

    // Process the stream
    for await (const chunk of stream) {
      if (chunk.token.text) {
        streamable.update({ llmResponse: chunk.token.text });
      }
    }

    streamable.done({ llmResponseEnd: true });
  } catch (error) {
    console.error('Streaming error:', error);

    // Fall back to non-streaming API if streaming fails
    try {
      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.3',
        inputs: `<s>Always respond in valid markdown format to the user query based on the context provided</s>
                <user>Here is the context: <context>${content}</context>
                Response to the user query: ${query}</user>`,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.7,
          return_full_text: false,
        },
      });

      streamable.update({ llmResponse: response.generated_text });
      streamable.done({ llmResponseEnd: true });
    } catch (fallbackError) {
      const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
      streamable.update({
        llmResponse: `Sorry, I was unable to summarize the content: ${errorMessage}`,
      });
      streamable.done({ llmResponseEnd: true });
    }
  }
}
