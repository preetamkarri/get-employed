import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/db';
import { generateOutreach } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, contactName, contactTitle } = body;

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID is required.' }, { status: 400 });
    }

    const db = getDB();
    const jobIndex = db.jobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) {
      return NextResponse.json({ success: false, error: 'Job not found.' }, { status: 404 });
    }

    if (!db.profile.cvText) {
      return NextResponse.json({ success: false, error: 'Please upload your CV in the Profile section before generating outreach.' }, { status: 400 });
    }

    const job = db.jobs[jobIndex];
    
    let contactInfo = undefined;
    if (contactName) {
      contactInfo = {
        name: contactName,
        title: contactTitle || 'Hiring Contact',
        company: job.company,
      };
    } else if (job.hiringContacts && job.hiringContacts.length > 0) {
      const firstContact = job.hiringContacts[0];
      contactInfo = {
        name: firstContact.name,
        title: firstContact.title,
        company: job.company,
      };
    }

    const outreach = await generateOutreach(
      db.profile.cvText,
      job.description,
      db.profile.toneSamples || [],
      contactInfo
    );

    job.outreachMessages = outreach;
    db.jobs[jobIndex] = job;
    saveDB(db);

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error('AI Outreach API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
