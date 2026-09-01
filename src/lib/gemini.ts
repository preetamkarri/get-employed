import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables.');
  }
  return new GoogleGenerativeAI(apiKey);
};

export interface MatchResult {
  matchScore: number;
  missingKeywords: string[];
  overlapKeywords: string[];
  suitabilityAnalysis: string;
  suggestedCVEvents: string[];
}

export interface OutreachResult {
  coverLetter: string;
  emailReachout: string;
  linkedinReachout: string;
}

export interface SmartSearchParams {
  jobTitles: string[];
  country: string;
}

/**
 * Analyzes a CV and extracts the best-fit job titles and country for automated searching.
 * If profile preferences (jobTitles/locations) are provided, those take priority.
 */
export async function extractSearchParamsFromCV(
  cvText: string,
  profilePreferences?: { jobTitles: string[]; locations: string[] }
): Promise<SmartSearchParams> {
  // If the user has manually set preferences, use those
  if (
    profilePreferences &&
    profilePreferences.jobTitles.length > 0 &&
    profilePreferences.locations.length > 0
  ) {
    return {
      jobTitles: profilePreferences.jobTitles,
      country: profilePreferences.locations[0],
    };
  }

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are an expert career advisor. Analyze the following CV/resume text and extract:
      
      1. **jobTitles**: The 3-5 most relevant job titles this person should search for, based on their experience, skills, and career trajectory. Be specific (e.g. "Senior Data Engineer" not just "Engineer"). Include variations (e.g. both "Data Analyst" and "Business Intelligence Analyst" if applicable).
      
      2. **country**: The country where the person is located or seeking work, extracted from their address, location, or context clues in the CV. Use the full country name (e.g. "Germany", "United States", "India"). If unclear, default to "Remote".

      CV Text:
      """
      ${cvText.slice(0, 15000)}
      """

      Provide your response in JSON format:
      {
        "jobTitles": string[],
        "country": string
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText) as SmartSearchParams;

    // Merge with any partial profile preferences
    if (profilePreferences?.jobTitles?.length) {
      parsed.jobTitles = profilePreferences.jobTitles;
    }
    if (profilePreferences?.locations?.length) {
      parsed.country = profilePreferences.locations[0];
    }

    return parsed;
  } catch (error) {
    console.error('Error extracting search params from CV:', error);
    return {
      jobTitles: ['Software Engineer'],
      country: 'Remote',
    };
  }
}

export async function analyzeJobMatch(cvText: string, jobDescription: string): Promise<MatchResult> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are an expert HR Specialist and Technical Recruiter.
      Compare the candidate's CV text and the job description below.
      Identify the matching keywords (skills, tools, methodologies), the missing keywords that the job description emphasizes but are not in the CV, and provide a match score from 0 to 100 based on alignment.
      Also, write a professional suitability analysis and suggest specific CV changes (like bullet points or achievements to include) to improve the match.

      Candidate CV:
      """
      ${cvText}
      """

      Job Description:
      """
      ${jobDescription}
      """

      Provide your response in JSON format matching the following structure:
      {
        "matchScore": number,
        "missingKeywords": string[],
        "overlapKeywords": string[],
        "suitabilityAnalysis": string,
        "suggestedCVEvents": string[]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText) as MatchResult;
  } catch (error) {
    console.error('Error analyzing job match with Gemini:', error);
    return {
      matchScore: 50,
      missingKeywords: [],
      overlapKeywords: [],
      suitabilityAnalysis: 'Failed to analyze job match due to an error in the AI service.',
      suggestedCVEvents: [],
    };
  }
}

export async function generateOutreach(
  cvText: string,
  jobDescription: string,
  toneSamples: string[],
  contactInfo?: { name: string; title: string; company: string }
): Promise<OutreachResult> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const samplesBlock = toneSamples.length > 0 
      ? `Candidate's Writing Samples (Use this style, vocabulary, level of formality, and tone):\n${toneSamples.map((s, i) => `Sample ${i+1}:\n${s}`).join('\n\n')}`
      : 'Tone: Professional, confident, and direct.';

    const contactBlock = contactInfo 
      ? `Hiring Contact:\nName: ${contactInfo.name}\nTitle: ${contactInfo.title}\nCompany: ${contactInfo.company}`
      : `Company Name is mentioned in the job description. Find contact title if possible or address as "Hiring Team".`;

    const prompt = `
      You are an expert career coach and copywriter.
      Generate three personalized outreach pieces for the candidate applying for the job description below:
      1. A customized Cover Letter.
      2. A cold outreach Email directed to the hiring manager/recruiter.
      3. A short, high-impact LinkedIn reachout message (under 300 characters).

      Learn and mimic the tone, structure, and style provided in the Candidate's Writing Samples. Do not sound generic or robotic. Highlight key qualifications from the CV that align with the job description.

      Candidate CV:
      """
      ${cvText}
      """

      Job Description:
      """
      ${jobDescription}
      """

      ${contactBlock}

      ${samplesBlock}

      Provide your response in JSON format matching the following structure:
      {
        "coverLetter": string,
        "emailReachout": string,
        "linkedinReachout": string
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText) as OutreachResult;
  } catch (error) {
    console.error('Error generating outreach with Gemini:', error);
    return {
      coverLetter: 'Failed to generate cover letter.',
      emailReachout: 'Failed to generate email outreach.',
      linkedinReachout: 'Failed to generate LinkedIn reachout.',
    };
  }
}
