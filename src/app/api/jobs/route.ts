import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB, Job } from '@/lib/db';
import { analyzeJobMatch } from '@/lib/gemini';

export async function GET() {
  try {
    const db = getDB();
    const sortedJobs = [...db.jobs].sort((a, b) => 
      new Date(b.dateScraped).getTime() - new Date(a.dateScraped).getTime()
    );
    return NextResponse.json({ success: true, jobs: sortedJobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, company, location, salary, description, url, source } = body;

    if (!title || !company || !description) {
      return NextResponse.json({ success: false, error: 'Title, company, and description are required.' }, { status: 400 });
    }

    const db = getDB();

    if (url && db.jobs.some(j => j.url === url)) {
      return NextResponse.json({ success: false, error: 'Job listing with this URL already exists.' }, { status: 409 });
    }

    let matchScore = 0;
    let missingKeywords: string[] = [];
    let overlapKeywords: string[] = [];
    let suitabilityAnalysis = 'Upload your CV in Profile to analyze suitability.';

    if (db.profile.cvText) {
      try {
        const matchResult = await analyzeJobMatch(db.profile.cvText, description);
        matchScore = matchResult.matchScore;
        missingKeywords = matchResult.missingKeywords;
        overlapKeywords = matchResult.overlapKeywords;
        suitabilityAnalysis = matchResult.suitabilityAnalysis;
      } catch (aiErr) {
        console.error('Failed to run AI analysis for new job:', aiErr);
      }
    }

    const newJob: Job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      company,
      location: location || 'Remote/Not specified',
      salary: salary || 'Not specified',
      description,
      url: url || '',
      source: source || 'manual',
      status: 'to-apply',
      matchScore,
      missingKeywords,
      overlapKeywords,
      suitabilityAnalysis,
      hiringContacts: [],
      outreachMessages: {
        coverLetter: '',
        emailReachout: '',
        linkedinReachout: '',
      },
      datePosted: new Date().toISOString(),
      dateScraped: new Date().toISOString(),
      dateApplied: null,
      notes: '',
    };

    db.jobs.push(newJob);
    saveDB(db);

    return NextResponse.json({ success: true, job: newJob });
  } catch (error: any) {
    console.error('Jobs POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, notes, title, company, location, salary, description, hiringContacts, outreachMessages } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Job ID is required.' }, { status: 400 });
    }

    const db = getDB();
    const jobIndex = db.jobs.findIndex(j => j.id === id);

    if (jobIndex === -1) {
      return NextResponse.json({ success: false, error: 'Job not found.' }, { status: 404 });
    }

    const job = db.jobs[jobIndex];

    if (status !== undefined) {
      job.status = status;
      if (status === 'applied' && !job.dateApplied) {
        job.dateApplied = new Date().toISOString();
      } else if (status !== 'applied') {
        job.dateApplied = null;
      }
    }
    if (notes !== undefined) job.notes = notes;
    if (title !== undefined) job.title = title;
    if (company !== undefined) job.company = company;
    if (location !== undefined) job.location = location;
    if (salary !== undefined) job.salary = salary;
    if (description !== undefined) {
      job.description = description;
      if (db.profile.cvText) {
        try {
          const matchResult = await analyzeJobMatch(db.profile.cvText, description);
          job.matchScore = matchResult.matchScore;
          job.missingKeywords = matchResult.missingKeywords;
          job.overlapKeywords = matchResult.overlapKeywords;
          job.suitabilityAnalysis = matchResult.suitabilityAnalysis;
        } catch (aiErr) {
          console.error('Failed to run AI match re-analysis:', aiErr);
        }
      }
    }
    if (hiringContacts !== undefined) job.hiringContacts = hiringContacts;
    if (outreachMessages !== undefined) job.outreachMessages = outreachMessages;

    db.jobs[jobIndex] = job;
    saveDB(db);

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error('Jobs PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Job ID is required.' }, { status: 400 });
    }

    const db = getDB();
    const initialLength = db.jobs.length;
    db.jobs = db.jobs.filter(j => j.id !== id);

    if (db.jobs.length === initialLength) {
      return NextResponse.json({ success: false, error: 'Job not found.' }, { status: 404 });
    }

    saveDB(db);
    return NextResponse.json({ success: true, message: 'Job deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
