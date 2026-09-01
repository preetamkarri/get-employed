import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Parses a PDF buffer and returns the text content.
 * Uses Gemini's native PDF understanding to extract text,
 * which avoids pdfjs-dist worker bundling issues with Next.js.
 */
export async function parsePDF(buffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for PDF parsing.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const base64Data = buffer.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data,
        },
      },
      {
        text: `Extract ALL the text content from this PDF resume/CV verbatim. 
Preserve the structure (sections, bullet points, dates, etc.) but output as clean plain text.
Do NOT summarize or rewrite — just extract the raw text exactly as it appears.
Do NOT add any commentary or prefix like "Here is the text:".
Output ONLY the extracted text.`,
      },
    ]);

    const text = result.response.text();
    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF.');
    }
    return text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file. Make sure it is a valid PDF.');
  }
}

