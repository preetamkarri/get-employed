import fs from 'fs';
import path from 'path';

export interface CandidateProfile {
  cvText: string;
  cvFileName: string;
  targetKeywords: string[];
  preferences: {
    jobTitles: string[];
    locations: string[];
    salaryRange: string;
  };
  toneSamples: string[];
}

export interface HiringContact {
  name: string;
  title: string;
  email: string;
  source: string;
}

export interface OutreachMessages {
  coverLetter: string;
  emailReachout: string;
  linkedinReachout: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  url: string;
  source: 'apify' | 'firecrawl' | 'manual';
  status: 'to-apply' | 'applied' | 'interviewing' | 'offered' | 'rejected';
  matchScore: number;
  missingKeywords: string[];
  overlapKeywords: string[];
  suitabilityAnalysis: string;
  hiringContacts: HiringContact[];
  outreachMessages: OutreachMessages;
  datePosted: string;
  dateScraped: string;
  dateApplied: string | null;
  notes: string;
}

export interface DBData {
  profile: CandidateProfile;
  jobs: Job[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'jobs_db.json');

const DEFAULT_DATA: DBData = {
  profile: {
    cvText: '',
    cvFileName: '',
    targetKeywords: [],
    preferences: {
      jobTitles: [],
      locations: [],
      salaryRange: '',
    },
    toneSamples: [],
  },
  jobs: [],
};

export function getDB(): DBData {
  if (!fs.existsSync(DB_FILE_PATH)) {
    saveDB(DEFAULT_DATA);
    return DEFAULT_DATA;
  }
  try {
    const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return DEFAULT_DATA;
  }
}

export function saveDB(data: DBData): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to database:', error);
  }
}
