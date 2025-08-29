import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export async function POST(request: NextRequest) {
  try {
    const { objections, discoveryType, filename } = await request.json();

    if (!objections) {
      return NextResponse.json({ error: 'No objections provided' }, { status: 400 });
    }

    // Create a new document with legal formatting
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 24, // 12pt font (size is in half-points)
            },
            paragraph: {
              spacing: {
                line: 480, // Double spacing (240 = single, 480 = double)
                after: 240, // 12pt space after paragraph
              },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch margins (1440 twips = 1 inch)
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: `OBJECTIONS TO ${discoveryType.toUpperCase().replace('-', ' ')}`,
                  bold: true,
                  font: 'Times New Roman',
                  size: 24,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                line: 480, // Double spacing
                after: 480, // Extra space after title
              },
            }),
            
            // Add a blank line
            new Paragraph({
              children: [new TextRun({ text: '', font: 'Times New Roman', size: 24 })],
              spacing: { line: 480 },
            }),

            // Process objections text and create paragraphs
            ...processObjectionsText(objections),
          ],
        },
      ],
    });

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc);

    // Return the document as a downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename || 'objections.docx'}"`,
      },
    });

  } catch (error) {
    console.error('Error generating DOCX:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}

function processObjectionsText(text: string): Paragraph[] {
  const lines = text.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      // Add blank paragraph for empty lines
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '', font: 'Times New Roman', size: 24 })],
          spacing: { line: 480 },
        })
      );
      continue;
    }

    // Check if line is a special interrogatory/request number
    if (trimmedLine.match(/^Special\s+(Interrogatory|Request|Admission)\s+No\.\s*\d+/i)) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              bold: true,
              font: 'Times New Roman',
              size: 24,
            }),
          ],
          spacing: {
            line: 480,
            before: 240, // Extra space before new sections
            after: 240,
          },
        })
      );
    }
    // Check if line starts with "OBJECTION:" or "ANSWER:"
    else if (trimmedLine.match(/^(OBJECTION|ANSWER):/i)) {
      const parts = trimmedLine.split(':');
      const label = parts[0];
      const content = parts.slice(1).join(':').trim();

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${label}:`,
              bold: true,
              font: 'Times New Roman',
              size: 24,
            }),
            ...(content ? [
              new TextRun({
                text: ` ${content}`,
                font: 'Times New Roman',
                size: 24,
              })
            ] : [])
          ],
          spacing: {
            line: 480,
            after: 120, // Smaller space after objection/answer labels
          },
        })
      );
    }
    // Regular text lines
    else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              font: 'Times New Roman',
              size: 24,
            }),
          ],
          spacing: {
            line: 480,
            after: 120,
          },
        })
      );
    }
  }

  return paragraphs;
}
