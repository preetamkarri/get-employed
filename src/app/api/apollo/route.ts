import { NextRequest, NextResponse } from 'next/server';
import { findContactsWithApollo } from '@/lib/scraper';
import { getDB, saveDB } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, company, domain } = body;

    if (!company) {
      return NextResponse.json({ success: false, error: 'Company name is required.' }, { status: 400 });
    }

    const contacts = await findContactsWithApollo(company, domain);

    if (jobId) {
      const db = getDB();
      const jobIndex = db.jobs.findIndex(j => j.id === jobId);
      if (jobIndex !== -1) {
        db.jobs[jobIndex].hiringContacts = contacts;
        saveDB(db);
      }
    }

    return NextResponse.json({ success: true, contacts });
  } catch (error: any) {
    console.error('Apollo API Route Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
