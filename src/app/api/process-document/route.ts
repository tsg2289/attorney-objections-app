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

function getCombinedPrompt(discoveryType: string, documentText: string, factPattern: string): string {
  const requestType = discoveryType === 'interrogatories' ? 'INTERROGATORY' : 
                     discoveryType === 'request-for-documents' ? 'REQUEST FOR PRODUCTION' : 
                     'REQUEST FOR ADMISSION';

  const basePrompt = `You are a legal assistant helping attorneys draft comprehensive responses to discovery requests. Generate TWO separate sections: one with objections only, and another with complete responses including both objections and substantive answers.

Discovery Type: ${discoveryType}

Document Content:
${documentText}

Fact Pattern:
${factPattern}

Please provide your response in TWO DISTINCT SECTIONS:

=== OBJECTIONS ONLY SECTION ===

For each discovery request, provide objections in this format:
SPECIAL ${requestType} NO. [NUMBER]: [Include the exact text of the original question/request]
OBJECTION: [Provide appropriate legal objections]
ANSWER: 

=== COMPLETE RESPONSES SECTION ===

For each discovery request, provide full responses in this format:
SPECIAL ${requestType} NO. [NUMBER]: [Include the exact text of the original question/request]
OBJECTION: [Provide appropriate legal objections if any apply, using "Subject to and without waiving the foregoing objection" when answering despite objections]
ANSWER: [Provide substantive answer based on the fact pattern provided]

IMPORTANT FORMATTING RULES:
- Extract the exact question/request text from the document
- Use section dividers exactly as shown above
- For objections-only section: Leave ANSWER: blank
- For complete responses: Provide factual answers based on the fact pattern
- Use appropriate legal objections such as:
  * Vague and ambiguous
  * Overly broad and burdensome  
  * Seeks information not reasonably calculated to lead to the discovery of admissible evidence
  * Seeks privileged information protected by attorney-client privilege
  * Calls for a legal conclusion
  * Compound question
  * Assumes facts not in evidence
- Maintain proper legal formatting and capitalization

Please generate both sections for all numbered requests in the document.`;

  return basePrompt;
}

function splitResponse(response: string): { objections: string; answers: string } {
  // Split the response into objections and answers sections
  const objectionsMarker = '=== OBJECTIONS ONLY SECTION ===';
  const answersMarker = '=== COMPLETE RESPONSES SECTION ===';
  
  const objectionsStart = response.indexOf(objectionsMarker);
  const answersStart = response.indexOf(answersMarker);
  
  let objections = '';
  let answers = '';
  
  if (objectionsStart !== -1 && answersStart !== -1) {
    // Extract objections section
    objections = response.substring(objectionsStart + objectionsMarker.length, answersStart).trim();
    // Extract answers section
    answers = response.substring(answersStart + answersMarker.length).trim();
  } else {
    // Fallback: treat entire response as combined content
    objections = response;
    answers = response;
  }
  
  return { objections, answers };
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

    // Extract text from the uploaded file
    const documentText = await extractTextFromFile(file);

    if (!documentText.trim()) {
      return NextResponse.json({ error: 'No text could be extracted from the file' }, { status: 400 });
    }

    // If fact pattern is provided, generate both objections and answers
    if (factPattern && factPattern.trim()) {
      // Generate combined objections and answers
      const combinedPrompt = getCombinedPrompt(discoveryType, documentText, factPattern);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an experienced legal assistant specializing in discovery responses. Provide detailed, properly formatted responses that include both objections when appropriate and substantive answers based on the provided facts.'
          },
          {
            role: 'user',
            content: combinedPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content || 'No response generated';
      
      // Split response into objections and answers sections
      const sections = splitResponse(response);
      
      return NextResponse.json({ 
        objections: sections.objections,
        answers: sections.answers 
      });
    } else {
      // Generate objections only
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
        temperature: 0.3,
      });

      const objections = completion.choices[0]?.message?.content || 'No objections generated';

      return NextResponse.json({ objections });
    }

  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}
