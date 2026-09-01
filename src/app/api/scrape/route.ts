import { NextRequest, NextResponse } from 'next/server';
import { scrapeWithFirecrawl, searchJobsWithApify } from '@/lib/scraper';
import { getDB, saveDB, Job } from '@/lib/db';
import { analyzeJobMatch } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, url, query, location, limit } = body;

    const db = getDB();
    const cvText = db.profile.cvText;

    if (type === 'url') {
      if (!url) {
        return NextResponse.json({ success: false, error: 'URL is required for URL scraping.' }, { status: 400 });
      }

      const existingJob = db.jobs.find(j => j.url === url);
      if (existingJob) {
        return NextResponse.json({ success: true, job: existingJob, message: 'Job already exists in database.' });
      }

      const scraped = await scrapeWithFirecrawl(url);

      let matchScore = 0;
      let missingKeywords: string[] = [];
      let overlapKeywords: string[] = [];
      let suitabilityAnalysis = 'Upload your CV in Profile to analyze suitability.';

      if (cvText) {
        try {
          const matchResult = await analyzeJobMatch(cvText, scraped.description);
          matchScore = matchResult.matchScore;
          missingKeywords = matchResult.missingKeywords;
          overlapKeywords = matchResult.overlapKeywords;
          suitabilityAnalysis = matchResult.suitabilityAnalysis;
        } catch (err) {
          console.error('Failed to run AI matching for URL scrape:', err);
        }
      }

      const newJob: Job = {
        id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: scraped.title,
        company: scraped.company,
        location: scraped.location,
        salary: scraped.salary,
        description: scraped.description,
        url: url,
        source: 'firecrawl',
        status: 'to-apply',
        matchScore,
        missingKeywords,
        overlapKeywords,
        suitabilityAnalysis,
        hiringContacts: [],
        outreachMessages: { coverLetter: '', emailReachout: '', linkedinReachout: '' },
        datePosted: new Date().toISOString(),
        dateScraped: new Date().toISOString(),
        dateApplied: null,
        notes: '',
      };

      db.jobs.push(newJob);
      saveDB(db);

      return NextResponse.json({ success: true, job: newJob });
    } 
    
    if (type === 'search') {
      if (!query) {
        return NextResponse.json({ success: false, error: 'Query is required for search scraping.' }, { status: 400 });
      }

      const items = await searchJobsWithApify(query, location || '', limit || 5);
      const importedJobs: Job[] = [];

      for (const item of items) {
        const jobUrl = item.applyLink || item.url || '';
        
        if (jobUrl && db.jobs.some(j => j.url === jobUrl)) {
          continue;
        }

        const title = item.title || 'Scraped Job';
        const company = item.companyName || item.company || 'Unknown Company';
        const jobLocation = item.location || 'Remote/Unknown';
        const description = item.description || item.descriptionSnippet || 'No description found.';
        const datePosted = item.postedAt || new Date().toISOString();

        const newJob: Job = {
          id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          title,
          company,
          location: jobLocation,
          salary: 'Not specified',
          description,
          url: jobUrl,
          source: 'apify',
          status: 'to-apply',
          matchScore: 0,
          missingKeywords: [],
          overlapKeywords: [],
          suitabilityAnalysis: 'Click "Analyze Match" to run AI keyword scoring.',
          hiringContacts: [],
          outreachMessages: { coverLetter: '', emailReachout: '', linkedinReachout: '' },
          datePosted,
          dateScraped: new Date().toISOString(),
          dateApplied: null,
          notes: '',
        };

        db.jobs.push(newJob);
        importedJobs.push(newJob);
      }

      if (importedJobs.length > 0) {
        saveDB(db);
      }

      return NextResponse.json({ success: true, jobs: importedJobs });
    }

    return NextResponse.json({ success: false, error: 'Invalid scrape type.' }, { status: 400 });
  } catch (error: any) {
    console.error('Scrape API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
