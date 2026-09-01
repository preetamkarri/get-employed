import { NextRequest, NextResponse } from 'next/server';
import { getDB, saveDB, Job } from '@/lib/db';
import { searchJobsWithApify } from '@/lib/scraper';
import { extractSearchParamsFromCV, analyzeJobMatch } from '@/lib/gemini';

// GET: Returns AI-extracted search parameters from CV (job titles & country)
export async function GET() {
  try {
    const db = getDB();
    if (!db.profile.cvText) {
      return NextResponse.json(
        { success: false, error: 'Please upload your CV in Profile first.' },
        { status: 400 }
      );
    }

    const searchParams = await extractSearchParamsFromCV(
      db.profile.cvText,
      db.profile.preferences
    );

    return NextResponse.json({
      success: true,
      params: searchParams,
      cvFileName: db.profile.cvFileName,
    });
  } catch (error: any) {
    console.error('Error in GET /api/smart-search:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Executes AI Smart Search using extracted (or provided) parameters, limited to past 24h
export async function POST(req: NextRequest) {
  try {
    const db = getDB();
    if (!db.profile.cvText) {
      return NextResponse.json(
        { success: false, error: 'Please upload your CV in Profile first.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let jobTitles: string[] = body.jobTitles;
    let country: string = body.country;

    // Auto-extract params from CV if not explicitly passed
    if (!jobTitles || jobTitles.length === 0 || !country) {
      const extracted = await extractSearchParamsFromCV(
        db.profile.cvText,
        db.profile.preferences
      );
      jobTitles = jobTitles && jobTitles.length > 0 ? jobTitles : extracted.jobTitles;
      country = country || extracted.country;
    }

    const cvText = db.profile.cvText;
    const importedJobs: Job[] = [];
    const limitPerTitle = body.limitPerTitle || 3;

    // Search for each job title in country
    for (const titleQuery of jobTitles) {
      try {
        const rawItems = await searchJobsWithApify(
          titleQuery,
          country,
          limitPerTitle,
          true // publishedWithin24h = true
        );

        for (const item of rawItems) {
          const title = item.title || titleQuery;
          const company = item.company || item.companyName || 'Unknown Company';
          const location = item.location || country || 'Remote';
          const description = item.description || 'No description available.';
          const jobUrl = item.url || item.applyLink || '';
          const datePosted = item.datePosted || item.postedAt || new Date().toISOString();

          // Deduplicate based on URL or title + company
          const isDuplicate = db.jobs.some((j) => 
            (jobUrl && j.url === jobUrl) ||
            (j.title.toLowerCase() === title.toLowerCase() && j.company.toLowerCase() === company.toLowerCase())
          );
          if (isDuplicate) continue;

          // Auto-calculate AI match score with CV
          let matchScore = 0;
          let missingKeywords: string[] = [];
          let overlapKeywords: string[] = [];
          let suitabilityAnalysis = 'Scanned via AI Smart Search.';

          if (cvText && description.length > 20) {
            try {
              const matchResult = await analyzeJobMatch(cvText, description);
              matchScore = matchResult.matchScore;
              missingKeywords = matchResult.missingKeywords;
              overlapKeywords = matchResult.overlapKeywords;
              suitabilityAnalysis = matchResult.suitabilityAnalysis;
            } catch (matchErr) {
              console.error('Error auto-scoring job:', matchErr);
            }
          }

          const newJob: Job = {
            id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            title,
            company,
            location,
            salary: item.salary || 'Not specified',
            description,
            url: jobUrl,
            source: 'apify',
            status: 'to-apply',
            matchScore,
            missingKeywords,
            overlapKeywords,
            suitabilityAnalysis,
            hiringContacts: [],
            outreachMessages: { coverLetter: '', emailReachout: '', linkedinReachout: '' },
            datePosted,
            dateScraped: new Date().toISOString(),
            dateApplied: null,
            notes: `Auto-discovered via AI Smart Search for query "${titleQuery}" in ${country}`,
          };

          db.jobs.push(newJob);
          importedJobs.push(newJob);
        }
      } catch (searchErr) {
        console.error(`Smart search error for title "${titleQuery}":`, searchErr);
      }
    }

    if (importedJobs.length > 0) {
      saveDB(db);
    }

    return NextResponse.json({
      success: true,
      searchParams: { jobTitles, country },
      importedCount: importedJobs.length,
      jobs: importedJobs,
    });
  } catch (error: any) {
    console.error('Error in POST /api/smart-search:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
