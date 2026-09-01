import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/db';
import { parsePDF } from '@/lib/pdfParser';

export async function GET() {
  try {
    const db = getDB();
    return NextResponse.json({ success: true, profile: db.profile });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const db = getDB();

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const text = await parsePDF(buffer);

      db.profile.cvText = text;
      db.profile.cvFileName = file.name;
      saveDB(db);

      return NextResponse.json({ 
        success: true, 
        message: 'CV uploaded and parsed successfully!', 
        fileName: file.name,
        textSnippet: text.slice(0, 150) + '...'
      });
    } else {
      const body = await req.json();
      const { targetKeywords, preferences, toneSamples } = body;

      if (targetKeywords !== undefined) db.profile.targetKeywords = targetKeywords;
      if (preferences !== undefined) db.profile.preferences = preferences;
      if (toneSamples !== undefined) db.profile.toneSamples = toneSamples;

      saveDB(db);
      return NextResponse.json({ success: true, message: 'Profile updated successfully!', profile: db.profile });
    }
  } catch (error: any) {
    console.error('Profile API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
