import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import mammoth from 'mammoth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.type === 'application/msword' || 
      file.name.endsWith('.docx') || 
      file.name.endsWith('.doc')) {
    // Handle Word documents
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    // Handle text files
    const text = new TextDecoder().decode(arrayBuffer);
    return text;
  } else {
    throw new Error('Unsupported file type. Please upload a .doc, .docx, or .txt file.');
  }
}

function getObjectionPrompt(discoveryType: string, documentText: string): string {
  const basePrompt = `You are a legal assistant helping attorneys draft objections to discovery requests. Based on the discovery document provided, generate appropriate objections with spaces for answers.

Discovery Type: ${discoveryType}

Document Content:
${documentText}

Please format your response as follows:
- For each discovery request/question, provide appropriate objections
- Use the format: "Special ${discoveryType === 'interrogatories' ? 'Interrogatory' : discoveryType === 'request-for-documents' ? 'Request for Production' : 'Request for Admission'} No. XX"
- Follow with "OBJECTION:" and list applicable objections
- Then add "ANSWER:" with a space for the attorney to fill in
- Use common legal objections such as:
  * Objection: Vague and ambiguous
  * Objection: Overly broad and burdensome
  * Objection: Seeks information not reasonably calculated to lead to the discovery of admissible evidence
  * Objection: Seeks privileged information protected by attorney-client privilege
  * Objection: Calls for a legal conclusion
  * Objection: Compound question
  * Objection: Seeks information outside the scope of discovery

Please maintain proper legal formatting and be specific to the type of discovery being objected to.`;

  return basePrompt;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const discoveryType = formData.get('discoveryType') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!discoveryType) {
      return NextResponse.json({ error: 'Discovery type not specified' }, { status: 400 });
    }

    // Extract text from the uploaded file
    const documentText = await extractTextFromFile(file);

    if (!documentText.trim()) {
      return NextResponse.json({ error: 'No text could be extracted from the file' }, { status: 400 });
    }

    // Generate objections using OpenAI
    const prompt = getObjectionPrompt(discoveryType, documentText);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced legal assistant specializing in discovery objections. Provide detailed, properly formatted objections that attorneys can use in their legal practice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent legal formatting
    });

    const objections = completion.choices[0]?.message?.content || 'No objections generated';

    return NextResponse.json({ objections });

  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}
