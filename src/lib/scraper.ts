import { HiringContact } from './db';

// FIRECRAWL integration
export async function scrapeWithFirecrawl(url: string): Promise<{
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string;
}> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not defined.');
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${errText}`);
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      throw new Error('Firecrawl returned unsuccessful scrape status.');
    }

    const markdown = json.data.markdown || '';
    const metadata = json.data.metadata || {};

    // Use Gemini to extract structured job details from Firecrawl's raw markdown
    const jobDetails = await extractJobDetailsFromMarkdown(markdown, url, metadata.title);
    return jobDetails;
  } catch (error) {
    console.error('Error scraping with Firecrawl:', error);
    throw error;
  }
}

// Helper to structure job details using Gemini
async function extractJobDetailsFromMarkdown(
  markdown: string,
  url: string,
  metaTitle?: string
): Promise<{
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string;
}> {
  try {
    // If Gemini key is available, use it to clean up the Markdown page into a clean Job Description structure.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        title: metaTitle || 'Scraped Job',
        company: 'Unknown Company',
        location: 'Remote/Unknown',
        description: markdown.slice(0, 5000), // fallback to raw markdown
        salary: 'Not specified',
      };
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      Extract structural job details from the following scraped webpage content (in markdown).
      Provide a clean title, company name, location, salary range (if mentioned, otherwise "Not specified"), and clean job description text.

      Webpage markdown content:
      """
      ${markdown.slice(0, 20000)}
      """

      Provide your response in JSON format matching the following structure:
      {
        "title": string,
        "company": string,
        "location": string,
        "description": string,
        "salary": string
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error parsing scraped markdown with Gemini:', error);
    return {
      title: metaTitle || 'Scraped Job',
      company: 'Unknown Company',
      location: 'Remote/Unknown',
      description: markdown.slice(0, 5000),
      salary: 'Not specified',
    };
  }
}

// APIFY integration
export async function searchJobsWithApify(
  query: string,
  location: string,
  limit: number = 10
): Promise<any[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('APIFY_API_TOKEN is not defined.');
  }

  try {
    // Call the Apify Google Jobs Scraper actor run endpoint
    // Actor: apify/google-jobs-scraper
    const searchQuery = `${query} in ${location}`;
    const response = await fetch(`https://api.apify.com/v2/acts/apify~google-jobs-scraper/runs?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queries: [searchQuery],
        maxPagesPerQuery: Math.ceil(limit / 10),
        csvFriendlyOutput: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apify run failed with status ${response.status}`);
    }

    const runJson = await response.json();
    const runId = runJson.data.id;
    const defaultDatasetId = runJson.data.defaultDatasetId;

    // Poll the run status until finished or max 40 seconds (since it's a short run)
    let isFinished = false;
    let attempts = 0;
    const maxAttempts = 12; // 12 * 5 seconds = 60 seconds max wait

    while (!isFinished && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      const checkResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
      if (checkResponse.ok) {
        const checkJson = await checkResponse.json();
        const status = checkJson.data.status;
        if (status === 'SUCCEEDED') {
          isFinished = true;
        } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
          throw new Error(`Apify scraping run ended with status: ${status}`);
        }
      }
    }

    if (!isFinished) {
      console.log('Apify run took too long, attempting to fetch partial dataset...');
    }

    // Fetch dataset results
    const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${token}&limit=${limit}`);
    if (!datasetResponse.ok) {
      throw new Error(`Failed to fetch Apify dataset items: ${datasetResponse.status}`);
    }

    const items = await datasetResponse.json();
    return items;
  } catch (error) {
    console.error('Error in Apify job scraping:', error);
    throw error;
  }
}

// APOLLO.IO integration
export async function findContactsWithApollo(
  companyName: string,
  domain?: string
): Promise<HiringContact[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    console.warn('APOLLO_API_KEY is not defined. Skipping Apollo search.');
    return [];
  }

  try {
    // If domain isn't provided, try to search organizations to find the domain first, or search directly
    const searchDomain = domain || (await guessCompanyDomain(companyName));
    
    const requestBody: any = {
      api_key: apiKey,
      person_titles: ['Hiring Manager', 'Recruiter', 'Talent Acquisition', 'Engineering Manager', 'Director of Engineering', 'VP of Engineering', 'HR Manager'],
      page: 1,
      per_page: 5,
    };

    if (searchDomain) {
      requestBody.q_organization_domains = searchDomain;
    } else {
      requestBody.q_organization_names = [companyName];
    }

    const response = await fetch('https://api.apollo.io/v1/people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Apollo API returned error: ${response.status} - ${errText}`);
      return [];
    }

    const data = await response.json();
    const people = data.people || [];

    return people.map((p: any) => ({
      name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      title: p.title || 'Hiring Contact',
      email: p.email || 'Email not found',
      source: 'Apollo.io',
    }));
  } catch (error) {
    console.error('Error finding contacts with Apollo:', error);
    return [];
  }
}

// Helper to guess company domain using Gemini if available
async function guessCompanyDomain(companyName: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      Given the company name "${companyName}", reply ONLY with its likely website domain (e.g. "google.com", "stripe.com").
      If you are unsure or if the company name is generic, reply with an empty string.

      Provide your response in JSON format matching the following structure:
      {
        "domain": string
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    return parsed.domain || '';
  } catch (error) {
    console.error('Error guessing domain:', error);
    return '';
  }
}
