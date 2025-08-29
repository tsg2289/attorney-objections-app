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
  const requestType = discoveryType === 'interrogatories' ? 'INTERROGATORY' : 
                     discoveryType === 'request-for-documents' ? 'REQUEST FOR PRODUCTION' : 
                     'REQUEST FOR ADMISSION';

  const basePrompt = `You are a legal assistant helping attorneys draft objections to discovery requests. Based on the discovery document provided, generate appropriate objections with spaces for answers.

Discovery Type: ${discoveryType}

Document Content:
${documentText}

Please format your response EXACTLY as follows for each discovery request:

SPECIAL ${requestType} NO. [NUMBER]: [Include the exact text of the original question/request from the document]
OBJECTION: [Provide appropriate legal objections]
ANSWER: 

Example format:
SPECIAL ${requestType} NO. 6: Please describe in detail the reasons for the incomplete remodel as of May 15, 2024, including the unfinished electrical work and multiple outlets not installed.
OBJECTION: This interrogatory is vague and ambiguous as it does not specify what constitutes "incomplete remodel" or what level of detail is required in the response.
ANSWER: 

IMPORTANT FORMATTING RULES:
- Extract the exact question/request text from the document and include it after the number
- Use appropriate legal objections such as:
  * Vague and ambiguous
  * Overly broad and burdensome
  * Seeks information not reasonably calculated to lead to the discovery of admissible evidence
  * Seeks privileged information protected by attorney-client privilege
  * Calls for a legal conclusion
  * Compound question
  * Seeks information outside the scope of discovery
  * Assumes facts not in evidence
- Leave "ANSWER:" with a blank line for the attorney to fill in
- Maintain proper legal formatting and capitalization
- Process each numbered request/question from the document

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
