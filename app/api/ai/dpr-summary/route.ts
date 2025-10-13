import { NextResponse } from 'next/server';
import { authenticate, AuthRequest } from '@/middleware/auth';

// The Gemini API key will be read from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// **FIX**: Switch to gemini-2.0-flash (stable model without thinking overhead)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

async function handler(req: AuthRequest) {
  try {
    const { content } = await req.json();
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Limit input to 4000 words maximum
    const words = content.trim().split(/\s+/);
    const maxWords = 4000;
    
    let truncatedContent = content;
    if (words.length > maxWords) {
      truncatedContent = words.slice(0, maxWords).join(' ') + '\n\n[Content truncated - exceeded 4000 word limit]';
    }

    const combinedPrompt = `Summarize the following Daily Progress Report in three brief sections: 1. Key Accomplishments, 2. Challenges, 3. Next Actions. The entire summary must be very concise and under 150 words. Do not add any introductory or concluding phrases. Here is the report:\n\n---\n\n${truncatedContent}`;
    
    const payload = {
        contents: [{
          parts: [{ text: combinedPrompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
        }
      };
  
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        console.error("Gemini API Error:", errorBody);
        return NextResponse.json({ error: `Gemini API error: ${errorBody.error?.message || response.statusText}` }, { status: response.status });
      }

      const result = await response.json();
      const summary = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
      if (!summary) {
        console.error("Gemini API returned an empty summary. Response:", result);
        const blockReason = result.candidates?.[0]?.finishReason;
        const safetyMessage = blockReason ? ` (Reason: ${blockReason})` : '';
        return NextResponse.json({ error: `Failed to generate summary. The model did not return any content.${safetyMessage}` }, { status: 500 });
      }

      return NextResponse.json({ summary });
    
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = authenticate(handler);
