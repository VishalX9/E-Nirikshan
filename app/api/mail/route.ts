import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Mail from '@/models/Mail';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API key
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { action } = body;

    // -------------------------
    // Enhance Email with AI
    // -------------------------
    if (action === 'enhance') {
      const { subject, body: emailBody, to } = body;

      if (!GEMINI_KEY) return NextResponse.json({ success: false, error: 'Gemini API key not configured' }, { status: 500 });
      if (!emailBody && !subject) return NextResponse.json({ success: false, error: 'Please provide email content to enhance' }, { status: 400 });

      try {
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are an expert email writer. Enhance the following email to make it more professional, clear, and engaging, maintaining the original intent.
Subject: ${subject || 'No subject'}
To: ${to || 'recipient'}
Body: ${emailBody || 'No content'}
Format your response EXACTLY as:
SUBJECT: [improved subject]
BODY: [improved email body]
Do not add any explanations or extra text.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const enhancedText = response?.text?.();

        if (!enhancedText) throw new Error('AI did not return any content');

        const subjectMatch = enhancedText.match(/SUBJECT:\s*(.+?)(?=\n|$)/);
        const bodyMatch = enhancedText.match(/BODY:\s*([\s\S]+)$/);
        const enhancedSubject = subjectMatch?.[1]?.trim() || subject;
        const enhancedBody = bodyMatch?.[1]?.trim() || emailBody;

        return NextResponse.json({ success: true, enhancedSubject, enhancedBody });
      } catch (aiError: any) {
        console.error('Gemini AI Error:', aiError);
        return NextResponse.json({ success: false, error: `AI enhancement failed: ${aiError.message}` }, { status: 500 });
      }
    }

    // -------------------------
    // Send Email
    // -------------------------
    if (action === 'send') {
      const { from, to, subject, body: emailBody } = body;
      if (!from || !to || !subject || !emailBody) return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });

      const newMail = new Mail({
        from,
        to,
        subject,
        body: emailBody,
        status: 'sent',
      });

      await newMail.save();
      return NextResponse.json({ success: true, message: 'Email sent successfully', data: newMail }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Invalid action provided' }, { status: 400 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unexpected error' }, { status: 500 });
  }
}
