import { NextResponse } from 'next/server';
import { authenticate, AuthRequest } from '@/middleware/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/utils/db';
import Mail from '@/models/Mail';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function handler(req: AuthRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action } = body;

    // --- ENHANCE EMAIL ---
    if (action === 'enhance') {
      const { subject, body: emailBody, to } = body;
      if (!emailBody && !subject) {
        return NextResponse.json({ success: false, error: 'Provide subject or body to enhance' }, { status: 400 });
      }

      if (!GEMINI_API_KEY) {
        return NextResponse.json({ success: false, error: 'Gemini API key not configured' }, { status: 500 });
      }

      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are an expert email writer. Enhance the following email to make it professional, clear, and engaging, keeping the original intent.
Original Email:
Subject: ${subject || 'No subject'}
To: ${to || 'recipient'}
Body: ${emailBody || 'No content'}
Format EXACTLY as:
SUBJECT: [improved subject]
BODY: [improved email body]
Do not add any explanations or extra text.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const enhancedText = response.text();

        const subjectMatch = enhancedText.match(/SUBJECT:\s*(.+?)(?=\n|$)/);
        const bodyMatch = enhancedText.match(/BODY:\s*([\s\S]+)$/);
        const enhancedSubject = subjectMatch?.[1].trim() || subject;
        const enhancedBody = bodyMatch?.[1].trim() || emailBody;

        return NextResponse.json({ success: true, enhancedSubject, enhancedBody });

      } catch (aiError: any) {
        console.error('Gemini AI Error:', aiError);
        return NextResponse.json({ success: false, error: `AI enhancement failed: ${aiError.message}` }, { status: 500 });
      }
    }

    // --- SEND EMAIL ---
    if (action === 'send') {
      const { from, to, subject, body: emailBody } = body;
      if (!from || !to || !subject || !emailBody) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }

      const newMail = new Mail({
        from, to, subject, body: emailBody, status: 'sent',
      });
      await newMail.save();

      return NextResponse.json({ success: true, message: 'Email sent successfully', data: newMail }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unexpected error' }, { status: 500 });
  }
}

export const POST = authenticate(handler);
