import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/db';
import { analyzeJobMatch } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID is required.' }, { status: 400 });
    }

    const db = getDB();
    const jobIndex = db.jobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) {
      return NextResponse.json({ success: false, error: 'Job not found.' }, { status: 404 });
    }

    if (!db.profile.cvText) {
      return NextResponse.json({ success: false, error: 'Please upload your CV in the Profile section before matching.' }, { status: 400 });
    }

    const job = db.jobs[jobIndex];
    const matchResult = await analyzeJobMatch(db.profile.cvText, job.description);

    job.matchScore = matchResult.matchScore;
    job.missingKeywords = matchResult.missingKeywords;
    job.overlapKeywords = matchResult.overlapKeywords;
    job.suitabilityAnalysis = matchResult.suitabilityAnalysis;
    
    // Attach CV suggestion metadata dynamically
    (job as any).suggestedCVEvents = matchResult.suggestedCVEvents;

    db.jobs[jobIndex] = job;
    saveDB(db);

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error('AI Match API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
