import { NextResponse } from 'next/server';
import { authenticate, AuthRequest } from '@/middleware/auth';


const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

async function handler(req: AuthRequest) {
  try {
    const { achievements, challenges, goals, year, period } = await req.json();
    
    if (!achievements || !challenges || !goals) {
      return NextResponse.json({ error: 'Achievements, challenges, and goals are required' }, { status: 400 });
    }

    const systemPrompt = "You are a professional HR assistant that helps draft Annual Performance Appraisal Reports (APARs). Create well-structured, professional performance appraisal drafts based on the employee's achievements, challenges, and goals.";
    
    const userPrompt = `Please create a professional APAR draft for ${period} ${year} based on the following information:

Achievements:
${achievements}

Challenges:
${challenges}

Goals:
${goals}

Please structure the APAR in a professional format with clear sections.`;

    const payload = {
      contents: [{
        parts: [{ text: userPrompt }]
      }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.7,
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
    const draft = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return NextResponse.json({ draft });
    
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = authenticate(handler);
