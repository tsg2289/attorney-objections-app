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

function getAnswerPrompt(discoveryType: string, documentText: string, factPattern: string): string {
  const requestType = discoveryType === 'interrogatories' ? 'INTERROGATORY' : 
                     discoveryType === 'request-for-documents' ? 'REQUEST FOR PRODUCTION' : 
                     'REQUEST FOR ADMISSION';

  const basePrompt = `You are a legal assistant helping attorneys draft responses to discovery requests. Based on the discovery document and fact pattern provided, generate complete responses that include both objections and substantive answers.

Discovery Type: ${discoveryType}

Document Content:
${documentText}

Fact Pattern:
${factPattern}

Please format your response EXACTLY as follows for each discovery request:

SPECIAL ${requestType} NO. [NUMBER]: [Include the exact text of the original question/request from the document]
OBJECTION: [Provide appropriate legal objections if any apply]
ANSWER: [Provide a substantive answer based on the fact pattern provided]

Example format:
SPECIAL ${requestType} NO. 6: Please describe in detail the reasons for the incomplete remodel as of May 15, 2024, including the unfinished electrical work and multiple outlets not installed.
OBJECTION: Subject to and without waiving the foregoing objection, this interrogatory is vague and ambiguous as it does not specify what constitutes "incomplete remodel."
ANSWER: The remodel project began in January 2024 and was halted in May 2024 due to permit issues with the city. The electrical contractor, ABC Electric, failed to complete the installation of 5 outlets in the kitchen and 3 outlets in the bathroom as specified in the original contract dated January 15, 2024.

IMPORTANT FORMATTING RULES:
- Extract the exact question/request text from the document
- Provide appropriate objections when warranted, but still answer the request
- Use the fact pattern to provide specific, factual answers
- Common objection lead-ins: "Subject to and without waiving the foregoing objection..."
- Keep answers factual and based on the provided fact pattern
- Use appropriate legal objections such as:
  * Vague and ambiguous
  * Overly broad and burdensome
  * Seeks information not reasonably calculated to lead to the discovery of admissible evidence
  * Seeks privileged information protected by attorney-client privilege
  * Calls for a legal conclusion
  * Compound question
  * Assumes facts not in evidence
- Maintain proper legal formatting and capitalization
- Process each numbered request/question from the document

Please generate complete responses that attorneys can use directly in their discovery responses.`;

  return basePrompt;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const discoveryType = formData.get('discoveryType') as string;
    const factPattern = formData.get('factPattern') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!discoveryType) {
      return NextResponse.json({ error: 'Discovery type not specified' }, { status: 400 });
    }

    if (!factPattern) {
      return NextResponse.json({ error: 'Fact pattern not provided' }, { status: 400 });
    }

    // Extract text from the uploaded file
    const documentText = await extractTextFromFile(file);

    if (!documentText.trim()) {
      return NextResponse.json({ error: 'No text could be extracted from the file' }, { status: 400 });
    }

    // Generate answers using OpenAI
    const prompt = getAnswerPrompt(discoveryType, documentText, factPattern);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced legal assistant specializing in discovery responses. Provide detailed, properly formatted responses that include both objections when appropriate and substantive answers based on the provided facts.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.3, // Lower temperature for more consistent legal formatting
    });

    const answers = completion.choices[0]?.message?.content || 'No answers generated';

    return NextResponse.json({ answers });

  } catch (error) {
    console.error('Error generating answers:', error);
    return NextResponse.json(
      { error: 'Failed to generate answers' },
      { status: 500 }
    );
  }
}
