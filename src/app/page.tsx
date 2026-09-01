"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  LayoutDashboard,
  Search,
  User,
  Plus,
  Trash2,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Star,
  ExternalLink,
  Mail,
  CheckCircle2,
  ChevronRight,
  X,
  ArrowUpRight,
  Upload,
  Play,
  RefreshCw,
  Copy,
  Check,
  Info,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Job, CandidateProfile } from '@/lib/db';

export default function Home() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tracker' | 'scraper' | 'profile'>('dashboard');
  
  // Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Interaction State
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddJobModal, setShowAddJobModal] = useState<boolean>(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'analysis' | 'contacts' | 'outreach'>('analysis');
  const [copiedTextType, setCopiedTextType] = useState<string | null>(null);

  // Scraper Form State
  const [scrapeType, setScrapeType] = useState<'smart' | 'url' | 'search'>('smart');
  const [smartJobTitlesText, setSmartJobTitlesText] = useState<string>('');
  const [smartCountry, setSmartCountry] = useState<string>('');
  const [smartLoadingParams, setSmartLoadingParams] = useState<boolean>(false);
  const [scrapeUrl, setScrapeUrl] = useState<string>('');
  const [scrapeQuery, setScrapeQuery] = useState<string>('');
  const [scrapeLocation, setScrapeLocation] = useState<string>('');
  const [scrapeLimit, setScrapeLimit] = useState<number>(3);
  const [scrapeLoading, setScrapeLoading] = useState<boolean>(false);
  const [scrapeMessage, setScrapeMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Manual Job Form State
  const [manualForm, setManualForm] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',
    description: '',
    url: ''
  });

  // Action Loading states
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [apolloLoading, setApolloLoading] = useState<boolean>(false);
  const [outreachLoading, setOutreachLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  // Profile Settings Form State
  const [targetKeywordsText, setTargetKeywordsText] = useState<string>('');
  const [prefJobTitles, setPrefJobTitles] = useState<string>('');
  const [prefLocations, setPrefLocations] = useState<string>('');
  const [prefSalaryRange, setPrefSalaryRange] = useState<string>('');
  const [toneSample1, setToneSample1] = useState<string>('');
  const [toneSample2, setToneSample2] = useState<string>('');

  // CV File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Data Fetch
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [jobsRes, profileRes] = await Promise.all([
          fetch('/api/jobs').then(r => r.json()),
          fetch('/api/profile').then(r => r.json())
        ]);
        
        if (jobsRes.success) setJobs(jobsRes.jobs);
        if (profileRes.success) {
          setProfile(profileRes.profile);
          // Prepopulate forms
          setTargetKeywordsText(profileRes.profile.targetKeywords.join(', '));
          setPrefJobTitles(profileRes.profile.preferences.jobTitles.join(', '));
          setPrefLocations(profileRes.profile.preferences.locations.join(', '));
          setPrefSalaryRange(profileRes.profile.preferences.salaryRange);
          setToneSample1(profileRes.profile.toneSamples[0] || '');
          setToneSample2(profileRes.profile.toneSamples[1] || '');
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update lists when operations happen
  const refreshJobs = async () => {
    try {
      const res = await fetch('/api/jobs').then(r => r.json());
      if (res.success) {
        setJobs(res.jobs);
        // Sync selected job details
        if (selectedJob) {
          const updated = res.jobs.find((j: Job) => j.id === selectedJob.id);
          if (updated) setSelectedJob(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Drop Board Handlers
  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData('text/plain', jobId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: Job['status']) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain');
    if (!jobId) return;

    try {
      // Optimistic update
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
      
      const res = await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status })
      }).then(r => r.json());

      if (!res.success) {
        // Rollback
        refreshJobs();
      }
    } catch (err) {
      console.error(err);
      refreshJobs();
    }
  };

  const handleMoveStatus = async (jobId: string, status: Job['status']) => {
    try {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
      await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status })
      });
      refreshJobs();
    } catch (err) {
      console.error(err);
      refreshJobs();
    }
  };

  // CRUD Operations
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...manualForm, source: 'manual' })
      }).then(r => r.json());

      if (res.success) {
        setJobs(prev => [res.job, ...prev]);
        setShowAddJobModal(false);
        setManualForm({ title: '', company: '', location: '', salary: '', description: '', url: '' });
      } else {
        alert(res.error || 'Failed to add job.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job listing?')) return;
    try {
      const res = await fetch(`/api/jobs?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.success) {
        setJobs(prev => prev.filter(j => j.id !== id));
        if (selectedJob?.id === id) setSelectedJob(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // File Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await fetch('/api/profile', {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      if (res.success) {
        // Reload profile
        const profileRes = await fetch('/api/profile').then(r => r.json());
        if (profileRes.success) setProfile(profileRes.profile);
        alert(res.message);
      } else {
        alert(res.error || 'Failed to parse resume.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  // Settings Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      targetKeywords: targetKeywordsText.split(',').map(s => s.trim()).filter(Boolean),
      preferences: {
        jobTitles: prefJobTitles.split(',').map(s => s.trim()).filter(Boolean),
        locations: prefLocations.split(',').map(s => s.trim()).filter(Boolean),
        salaryRange: prefSalaryRange
      },
      toneSamples: [toneSample1, toneSample2].filter(Boolean)
    };

    try {
      setUploading(true);
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        setProfile(res.profile);
        alert('Profile preferences updated successfully.');
      } else {
        alert(res.error || 'Failed to update preferences.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // AI & Contact Scraping Actions
  const handleAIKeywordAnalysis = async (jobId: string) => {
    try {
      setAiLoading(true);
      const res = await fetch('/api/ai-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      }).then(r => r.json());

      if (res.success) {
        setJobs(prev => prev.map(j => j.id === jobId ? res.job : j));
        setSelectedJob(res.job);
      } else {
        alert(res.error || 'Analysis failed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIOutreachGenerate = async (jobId: string) => {
    try {
      setOutreachLoading(true);
      const res = await fetch('/api/ai-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      }).then(r => r.json());

      if (res.success) {
        setJobs(prev => prev.map(j => j.id === jobId ? res.job : j));
        setSelectedJob(res.job);
      } else {
        alert(res.error || 'Failed to generate outreach texts.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOutreachLoading(false);
    }
  };

  const handleApolloContactFinder = async (jobId: string, company: string, domain?: string) => {
    try {
      setApolloLoading(true);
      const res = await fetch('/api/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, company, domain })
      }).then(r => r.json());

      if (res.success) {
        // Refresh local database jobs
        refreshJobs();
      } else {
        alert('Apollo.io returned no contacts. Verify company name or supply Apollo API key.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApolloLoading(false);
    }
  };

  // AI Smart Search Handlers
  const handleFetchSmartParams = async () => {
    try {
      setSmartLoadingParams(true);
      setScrapeMessage({ text: 'Analyzing your CV to determine optimal job titles and country...', type: 'info' });
      const res = await fetch('/api/smart-search').then(r => r.json());
      if (res.success) {
        setSmartJobTitlesText((res.params.jobTitles || []).join(', '));
        setSmartCountry(res.params.country || 'Remote');
        setScrapeMessage({ text: `Extracted ${res.params.jobTitles?.length || 0} target job roles for ${res.params.country}.`, type: 'success' });
      } else {
        setScrapeMessage({ text: res.error || 'Failed to extract CV search parameters.', type: 'error' });
      }
    } catch (err: any) {
      console.error(err);
      setScrapeMessage({ text: err.message || 'Error analyzing CV.', type: 'error' });
    } finally {
      setSmartLoadingParams(false);
    }
  };

  const handleSmartSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setScrapeLoading(true);
      setScrapeMessage({
        text: '🤖 Running AI Smart Search on Google Jobs (filtering past 24h & auto-scoring CV match)...',
        type: 'info'
      });

      const parsedTitles = smartJobTitlesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitles: parsedTitles,
          country: smartCountry,
          limitPerTitle: scrapeLimit,
        })
      }).then(r => r.json());

      if (res.success) {
        setScrapeMessage({
          text: `✨ Smart Search complete! Imported ${res.importedCount} new fresh job listings (posted in last 24h) with CV match scores.`,
          type: 'success'
        });
        refreshJobs();
      } else {
        setScrapeMessage({ text: res.error || 'Smart search failed.', type: 'error' });
      }
    } catch (err: any) {
      console.error(err);
      setScrapeMessage({ text: err.message || 'Error executing smart search.', type: 'error' });
    } finally {
      setScrapeLoading(false);
    }
  };

  // Scraper Trigger Handler
  const handleScraperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setScrapeLoading(true);
      setScrapeMessage({ text: scrapeType === 'url' ? 'Scraping career page via Firecrawl...' : 'Running Google Jobs Scraper on Apify (this can take 20-30s)...', type: 'info' });

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          scrapeType === 'url' 
            ? { type: 'url', url: scrapeUrl }
            : { type: 'search', query: scrapeQuery, location: scrapeLocation, limit: scrapeLimit }
        )
      }).then(r => r.json());

      if (res.success) {
        setScrapeMessage({ 
          text: scrapeType === 'url' 
            ? `Successfully imported: ${res.job.title} at ${res.job.company}!`
            : `Search complete! Imported ${res.jobs?.length || 0} new job listings.`, 
          type: 'success' 
        });
        setScrapeUrl('');
        setScrapeQuery('');
        setScrapeLocation('');
        refreshJobs();
      } else {
        setScrapeMessage({ text: res.error || 'Scraping request failed.', type: 'error' });
      }
    } catch (err: any) {
      console.error(err);
      setScrapeMessage({ text: err.message || 'Error occurred.', type: 'error' });
    } finally {
      setScrapeLoading(false);
    }
  };

  // Clipboard Copier Utility
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextType(type);
    setTimeout(() => setCopiedTextType(null), 2000);
  };

  // Filter & Helper computations
  const getJobByStatus = (status: Job['status']) => jobs.filter(j => j.status === status);
  const averageMatchScore = jobs.filter(j => j.matchScore > 0).length > 0
    ? Math.round(jobs.reduce((acc, curr) => acc + (curr.matchScore || 0), 0) / jobs.filter(j => j.matchScore > 0).length)
    : 0;

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="logo-container">
          <Briefcase className="glow-active" size={24} style={{ color: 'var(--primary)' }} />
          <span className="logo-text">GetEmployed</span>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracker')}
          >
            <Briefcase size={18} />
            Job Tracker
          </button>

          <button 
            className={`nav-item ${activeTab === 'scraper' ? 'active' : ''}`}
            onClick={() => setActiveTab('scraper')}
          >
            <Search size={18} />
            Scraper Hub
          </button>

          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            My Profile
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="profile-card-mini">
            <div className="profile-avatar">
              {profile?.cvFileName ? profile.cvFileName[0].toUpperCase() : 'CV'}
            </div>
            <div>
              <p className="profile-name">{profile?.cvFileName ? profile.cvFileName : 'Upload Resume'}</p>
              <p className="profile-status">
                {profile?.cvText ? `${profile.targetKeywords.length} targets active` : 'No profile initialized'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        
        {/* VIEW 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <header className="header">
              <div>
                <h1 className="header-title">Welcome Back</h1>
                <p className="header-subtitle">Analyze, optimize, and submit applications within the prime 24-48 hr window.</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-primary" onClick={() => setShowAddJobModal(true)}>
                  <Plus size={16} style={{ marginRight: '6px', display: 'inline' }} />
                  Add Manual Job
                </button>
              </div>
            </header>

            {/* Metrics cards */}
            <div className="stats-grid">
              <div className="glass-panel stat-card">
                <span className="stat-label">Tracked Positions</span>
                <span className="stat-value">{jobs.length}</span>
                <div className="stat-change up">
                  <Star size={12} /> Live Tracking Console
                </div>
              </div>
              
              <div className="glass-panel stat-card">
                <span className="stat-label">Applications Sent</span>
                <span className="stat-value">{getJobByStatus('applied').length}</span>
                <div className="stat-change up" style={{ color: 'var(--primary)' }}>
                  <CheckCircle2 size={12} /> {getJobByStatus('interviewing').length} interviewing stages
                </div>
              </div>

              <div className="glass-panel stat-card">
                <span className="stat-label">Average Match Index</span>
                <span className="stat-value">{averageMatchScore}%</span>
                <div className="stat-change" style={{ color: averageMatchScore >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                  <Info size={12} /> Based on CV keywords
                </div>
              </div>

              <div className="glass-panel stat-card">
                <span className="stat-label">Next 48 Hours Goal</span>
                <span className="stat-value">{getJobByStatus('to-apply').length}</span>
                <div className="stat-change up" style={{ color: 'var(--secondary)' }}>
                  <Clock size={12} /> Applications ready to go
                </div>
              </div>
            </div>

            {/* Dashboard details */}
            <div className="dashboard-grid">
              <div className="glass-panel recent-jobs-panel">
                <div className="recent-jobs-header">
                  <h2 className="panel-title">Recent Inbound Jobs (24-48h)</h2>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('tracker')}>View Board</button>
                </div>

                <div className="jobs-list">
                  {jobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <AlertCircle size={32} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-muted)' }} />
                      No job listings fetched yet. Head to the <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setActiveTab('scraper')}>Scraper Hub</span> to begin scraping.
                    </div>
                  ) : (
                    jobs.slice(0, 5).map(job => (
                      <div key={job.id} className="job-row-item">
                        <div className="job-meta-left">
                          <h3 className="job-row-title">{job.title}</h3>
                          <p className="job-row-company">{job.company} • {job.location}</p>
                          <div className="job-row-tags">
                            <span className={`badge ${job.matchScore >= 80 ? 'badge-match' : job.matchScore >= 50 ? 'badge-match-medium' : 'badge-match-low'}`}>
                              {job.matchScore > 0 ? `AI Match: ${job.matchScore}%` : 'Not Analyzed'}
                            </span>
                            <span className="badge badge-source">{job.source}</span>
                            <span className="badge badge-status">{job.status}</span>
                          </div>
                        </div>
                        <div>
                          <button 
                            className="btn btn-secondary"
                            onClick={() => {
                              setSelectedJob(job);
                              setActiveTab('tracker');
                            }}
                          >
                            Optimize
                            <ChevronRight size={14} style={{ marginLeft: '4px', display: 'inline' }} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tips / Info box */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 className="panel-title">Application Workflows</h2>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '8px', color: 'var(--primary)' }}>
                    <Search size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>1. Scrape & Source</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Add specific job descriptions using URLs via Firecrawl or bulk scrape search terms using Apify.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '8px', borderRadius: '8px', color: 'var(--secondary)' }}>
                    <Star size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>2. AI keyword checks</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Calculate match ratings instantly against your uploaded resume. Find missing keywords and insert bullet suggestions.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '8px', borderRadius: '8px', color: 'var(--accent)' }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>3. Outreach & Email</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Run Apollo contact searches to query emails. Generate custom cold pitch scripts matching your trained style.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: JOB TRACKER BOARD */}
        {activeTab === 'tracker' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <header className="header">
              <div>
                <h1 className="header-title">Job Application Board</h1>
                <p className="header-subtitle">Drag and drop job postings to update their status. Select cards to launch the AI Assistant.</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-primary" onClick={() => setShowAddJobModal(true)}>
                  <Plus size={16} style={{ marginRight: '6px', display: 'inline' }} />
                  Add Manual Job
                </button>
              </div>
            </header>

            {/* Kanban Board */}
            <div className="kanban-board">
              {(['to-apply', 'applied', 'interviewing', 'offered', 'rejected'] as Job['status'][]).map(status => {
                const columnJobs = getJobByStatus(status);
                const prettyHeaders: Record<string, string> = {
                  'to-apply': 'To Apply',
                  'applied': 'Applied',
                  'interviewing': 'Interviewing',
                  'offered': 'Offer Received',
                  'rejected': 'Rejected'
                };
                
                return (
                  <div 
                    key={status} 
                    className="kanban-column"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status)}
                  >
                    <div className="kanban-column-header">
                      <h3 className="column-title">{prettyHeaders[status]}</h3>
                      <span className="column-count">{columnJobs.length}</span>
                    </div>

                    <div className="kanban-cards-container">
                      {columnJobs.map(job => (
                        <div 
                          key={job.id} 
                          className="glass-panel kanban-card"
                          draggable
                          onDragStart={(e) => handleDragStart(e, job.id)}
                          onClick={() => {
                            setSelectedJob(job);
                            setActiveDrawerTab('analysis');
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <h4 className="kanban-card-title">{job.title}</h4>
                            <Trash2 
                              size={12} 
                              style={{ color: 'var(--text-muted)', flexShrink: 0, cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteJob(job.id);
                              }}
                            />
                          </div>
                          <p className="kanban-card-company">{job.company}</p>
                          
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                            <span className={`badge ${job.matchScore >= 80 ? 'badge-match' : job.matchScore >= 50 ? 'badge-match-medium' : 'badge-match-low'}`}>
                              {job.matchScore > 0 ? `${job.matchScore}% Match` : 'Unrated'}
                            </span>
                            <span className="badge badge-source">{job.source}</span>
                            {job.hiringContacts.length > 0 && (
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                Contact Found
                              </span>
                            )}
                          </div>

                          <div className="kanban-card-footer">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <MapPin size={10} /> {job.location.slice(0, 15)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Assistant Drawer Side Panel */}
            {selectedJob && (
              <>
                <div className="drawer-backdrop" onClick={() => setSelectedJob(null)} />
                <div className="drawer">
                  <div className="drawer-header">
                    <div style={{ maxWidth: '85%' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedJob.title}</h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                        {selectedJob.company} • {selectedJob.location}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {selectedJob.url && (
                          <a 
                            href={selectedJob.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="badge badge-source"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            View Post <ExternalLink size={10} />
                          </a>
                        )}
                        <span className="badge badge-status">Salary: {selectedJob.salary}</span>
                      </div>
                    </div>
                    <button className="drawer-close" onClick={() => setSelectedJob(null)}>
                      <X size={20} />
                    </button>
                  </div>

                  <div className="drawer-content">
                    <div className="tabs-header">
                      <button 
                        className={`tab-btn ${activeDrawerTab === 'analysis' ? 'active' : ''}`}
                        onClick={() => setActiveDrawerTab('analysis')}
                      >
                        Keyword analysis
                      </button>
                      <button 
                        className={`tab-btn ${activeDrawerTab === 'contacts' ? 'active' : ''}`}
                        onClick={() => setActiveDrawerTab('contacts')}
                      >
                        Hiring managers
                      </button>
                      <button 
                        className={`tab-btn ${activeDrawerTab === 'outreach' ? 'active' : ''}`}
                        onClick={() => setActiveDrawerTab('outreach')}
                      >
                        Custom outreach
                      </button>
                    </div>

                    {/* Tab Content 1: AI Match Score */}
                    {activeDrawerTab === 'analysis' && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Score Indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            border: '4px solid var(--card-border)',
                            borderTopColor: selectedJob.matchScore >= 80 ? 'var(--success)' : selectedJob.matchScore >= 50 ? 'var(--accent)' : 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.5rem',
                            color: selectedJob.matchScore >= 80 ? 'var(--success)' : selectedJob.matchScore >= 50 ? 'var(--accent)' : 'var(--foreground)'
                          }}>
                            {selectedJob.matchScore > 0 ? `${selectedJob.matchScore}%` : '--'}
                          </div>
                          <div>
                            <h4 style={{ fontWeight: 600 }}>Keywords Matching Index</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {selectedJob.matchScore >= 80 
                                ? 'Strong fit! Major skill overlaps detected.' 
                                : selectedJob.matchScore > 0 
                                  ? 'Moderate fit. Suggest checking the missing skills.' 
                                  : 'Run the matching algorithm to analyze fit.'
                              }
                            </p>
                          </div>
                          {selectedJob.matchScore === 0 && (
                            <button 
                              className="btn btn-primary" 
                              style={{ marginLeft: 'auto' }}
                              onClick={() => handleAIKeywordAnalysis(selectedJob.id)}
                              disabled={aiLoading}
                            >
                              {aiLoading ? <RefreshCw size={14} className="glow-active" style={{ animation: 'spin 1s linear infinite' }} /> : 'Analyze Fit'}
                            </button>
                          )}
                        </div>

                        {selectedJob.matchScore > 0 && (
                          <>
                            <div className="glass-panel" style={{ padding: '16px' }}>
                              <h5 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>Suitability Report</h5>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {selectedJob.suitabilityAnalysis}
                              </p>
                            </div>

                            {/* Skills Tags */}
                            <div>
                              <h5 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>Matching Skills / Overlaps</h5>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {selectedJob.overlapKeywords?.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None found.</span>}
                                {selectedJob.overlapKeywords?.map(kw => (
                                  <span key={kw} className="badge badge-match">{kw}</span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h5 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--warning)' }}>Missing Keywords & Skills</h5>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {selectedJob.missingKeywords?.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None! You match everything perfectly.</span>}
                                {selectedJob.missingKeywords?.map(kw => (
                                  <span key={kw} className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* CV suggestions */}
                            {(selectedJob as any).suggestedCVEvents && (selectedJob as any).suggestedCVEvents.length > 0 && (
                              <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
                                <h5 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FileText size={14} /> Resume Improvement Suggestions
                                </h5>
                                <ul style={{ listStyleType: 'disc', paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {(selectedJob as any).suggestedCVEvents.map((bullet: string, idx: number) => (
                                    <li key={idx} style={{ lineHeight: 1.4 }}>{bullet}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <button 
                              className="btn btn-secondary" 
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                              onClick={() => handleAIKeywordAnalysis(selectedJob.id)}
                              disabled={aiLoading}
                            >
                              <RefreshCw size={14} className={aiLoading ? 'glow-active' : ''} />
                              Re-Analyze CV Fit
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Tab Content 2: Hiring Contact / Apollo.io */}
                    {activeDrawerTab === 'contacts' && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ fontWeight: 600 }}>Recruiters & Hiring Leads</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Find hiring decision-makers at {selectedJob.company} via the Apollo API.
                            </p>
                          </div>
                          <button 
                            className="btn btn-primary"
                            style={{ marginLeft: 'auto' }}
                            onClick={() => handleApolloContactFinder(selectedJob.id, selectedJob.company)}
                            disabled={apolloLoading}
                          >
                            {apolloLoading ? <RefreshCw size={14} className="glow-active" style={{ animation: 'spin 1s linear infinite' }} /> : 'Search Apollo'}
                          </button>
                        </div>

                        <div className="jobs-list" style={{ marginTop: '10px' }}>
                          {selectedJob.hiringContacts?.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', border: '1px dashed var(--card-border)', borderRadius: '8px' }}>
                              <Mail size={24} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--text-muted)' }} />
                              No contacts loaded. Click "Search Apollo" to find hiring manager details.
                            </div>
                          ) : (
                            selectedJob.hiringContacts?.map((contact, idx) => (
                              <div key={idx} className="job-row-item" style={{ padding: '12px 16px' }}>
                                <div>
                                  <h5 style={{ fontWeight: 600, fontSize: '0.875rem' }}>{contact.name}</h5>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{contact.title}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                                    {contact.email}
                                  </code>
                                  {contact.email && contact.email !== 'Email not found' && (
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                      onClick={() => copyToClipboard(contact.email, `contact-${idx}`)}
                                    >
                                      {copiedTextType === `contact-${idx}` ? 'Copied!' : 'Copy'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab Content 3: Outreach Generates */}
                    {activeDrawerTab === 'outreach' && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ fontWeight: 600 }}>AI Outreach Copilot</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Generate tone-optimized materials using your resume and style training samples.
                            </p>
                          </div>
                          
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleAIOutreachGenerate(selectedJob.id)}
                            disabled={outreachLoading}
                          >
                            {outreachLoading ? <RefreshCw size={14} className="glow-active" style={{ animation: 'spin 1s linear infinite' }} /> : 'Generate Outreach'}
                          </button>
                        </div>

                        {selectedJob.outreachMessages?.coverLetter ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '10px' }}>
                            
                            {/* Email Pitch */}
                            <div className="glass-panel" style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h5 style={{ fontWeight: 600, fontSize: '0.9rem' }}>Cold Email pitch</h5>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => copyToClipboard(selectedJob.outreachMessages.emailReachout, 'email')}
                                >
                                  {copiedTextType === 'email' ? <CheckCircle2 size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                                  {copiedTextType === 'email' ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <textarea 
                                readOnly 
                                className="outreach-textarea" 
                                value={selectedJob.outreachMessages.emailReachout}
                                style={{ height: '180px' }}
                              />
                            </div>

                            {/* LinkedIn pitch */}
                            <div className="glass-panel" style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h5 style={{ fontWeight: 600, fontSize: '0.9rem' }}>LinkedIn Pitch note (&lt;300 chars)</h5>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => copyToClipboard(selectedJob.outreachMessages.linkedinReachout, 'li')}
                                >
                                  {copiedTextType === 'li' ? <CheckCircle2 size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                                  {copiedTextType === 'li' ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <textarea 
                                readOnly 
                                className="outreach-textarea" 
                                value={selectedJob.outreachMessages.linkedinReachout}
                                style={{ height: '90px' }}
                              />
                            </div>

                            {/* Cover Letter */}
                            <div className="glass-panel" style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h5 style={{ fontWeight: 600, fontSize: '0.9rem' }}>Tailored Cover Letter</h5>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => copyToClipboard(selectedJob.outreachMessages.coverLetter, 'letter')}
                                >
                                  {copiedTextType === 'letter' ? <CheckCircle2 size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                                  {copiedTextType === 'letter' ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <textarea 
                                readOnly 
                                className="outreach-textarea" 
                                value={selectedJob.outreachMessages.coverLetter}
                                style={{ height: '250px' }}
                              />
                            </div>

                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '40px', border: '1px dashed var(--card-border)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                            <FileText size={24} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--text-muted)' }} />
                            Click "Generate Outreach" to create cover letters and outreach templates tailored to your writing style.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="drawer-footer">
                    {selectedJob.status !== 'applied' ? (
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleMoveStatus(selectedJob.id, 'applied')}
                      >
                        Mark as Applied
                      </button>
                    ) : (
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleMoveStatus(selectedJob.id, 'to-apply')}
                      >
                        Reset to "To Apply"
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary"
                      style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      onClick={() => handleDeleteJob(selectedJob.id)}
                    >
                      Delete Listing
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* VIEW 3: SCRAPER HUB */}
        {activeTab === 'scraper' && (
          <div className="animate-fade-in">
            <header className="header">
              <div>
                <h1 className="header-title">Job Sourcing & Scraper Hub</h1>
                <p className="header-subtitle">AI Smart Search scans your CV to extract matching roles and country, then fetches jobs posted in the last 24 hours.</p>
              </div>
            </header>

            <div className="dashboard-grid">
              
              {/* Form Controls */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div className="tabs-header">
                  <button 
                    className={`tab-btn ${scrapeType === 'smart' ? 'active' : ''}`}
                    onClick={() => {
                      setScrapeType('smart');
                      setScrapeMessage(null);
                    }}
                  >
                    🤖 AI Smart Search (24h)
                  </button>
                  <button 
                    className={`tab-btn ${scrapeType === 'url' ? 'active' : ''}`}
                    onClick={() => {
                      setScrapeType('url');
                      setScrapeMessage(null);
                    }}
                  >
                    Scrape Job Page URL
                  </button>
                  <button 
                    className={`tab-btn ${scrapeType === 'search' ? 'active' : ''}`}
                    onClick={() => {
                      setScrapeType('search');
                      setScrapeMessage(null);
                    }}
                  >
                    Custom Search
                  </button>
                </div>

                <form onSubmit={scrapeType === 'smart' ? handleSmartSearchSubmit : handleScraperSubmit} className="form-grid">
                  {scrapeType === 'smart' ? (
                    <>
                      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                            CV Profile: {profile?.cvFileName ? profile.cvFileName : 'No CV Uploaded'}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            onClick={handleFetchSmartParams}
                            disabled={smartLoadingParams || !profile?.cvText}
                          >
                            {smartLoadingParams ? 'Analyzing...' : '⚡ Extract Parameters from CV'}
                          </button>
                        </div>

                        {!profile?.cvText ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '8px' }}>
                            ⚠️ Please upload your CV in the Profile section first so AI can analyze your roles and country.
                          </div>
                        ) : (
                          <div className="form-grid" style={{ gap: '12px' }}>
                            <div>
                              <label className="form-label">Target Job Roles (auto-extracted from CV)</label>
                              <input 
                                type="text"
                                className="form-control-full"
                                placeholder='Click "Extract Parameters" or type e.g. "Data Analyst, BI Analyst"'
                                value={smartJobTitlesText}
                                onChange={(e) => setSmartJobTitlesText(e.target.value)}
                              />
                            </div>
                            <div className="form-row-2">
                              <div>
                                <label className="form-label">Target Country (from CV location)</label>
                                <input 
                                  type="text"
                                  className="form-control-full"
                                  placeholder="e.g. Germany, United States, Remote"
                                  value={smartCountry}
                                  onChange={(e) => setSmartCountry(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="form-label">Max listings per role</label>
                                <select 
                                  className="form-control-full"
                                  value={scrapeLimit}
                                  onChange={(e) => setScrapeLimit(Number(e.target.value))}
                                >
                                  <option value={3}>3 listings / role</option>
                                  <option value={5}>5 listings / role</option>
                                  <option value={10}>10 listings / role</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        🔒 <strong>24-Hour Filter Active:</strong> Only jobs posted in the last 24 hours will be fetched and auto-matched against your CV score.
                      </p>
                    </>
                  ) : scrapeType === 'url' ? (
                    <div>
                      <label className="form-label">Job Description Webpage URL</label>
                      <input 
                        type="url" 
                        required
                        className="form-control-full"
                        placeholder="https://careers.google.com/jobs/results/..."
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                      />
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        Firecrawl will convert the career site to clean Markdown, and Gemini will parse it into structural details automatically.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="form-row-2">
                        <div>
                          <label className="form-label">Job Title / Search query</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Senior Frontend Engineer"
                            className="form-control-full"
                            value={scrapeQuery}
                            onChange={(e) => setScrapeQuery(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="form-label">Location / Country</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Germany, Remote"
                            className="form-control-full"
                            value={scrapeLocation}
                            onChange={(e) => setScrapeLocation(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Scan limit</label>
                        <select 
                          className="form-control-full"
                          value={scrapeLimit}
                          onChange={(e) => setScrapeLimit(Number(e.target.value))}
                        >
                          <option value={3}>3 job listings</option>
                          <option value={5}>5 job listings</option>
                          <option value={10}>10 job listings</option>
                        </select>
                      </div>
                    </>
                  )}

                  {scrapeMessage && (
                    <div className="glass-panel animate-fade-in" style={{
                      padding: '12px 16px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderLeft: '4px solid',
                      borderLeftColor: scrapeMessage.type === 'success' ? 'var(--success)' : scrapeMessage.type === 'error' ? 'var(--danger)' : 'var(--primary)'
                    }}>
                      <Info size={14} style={{ color: scrapeMessage.type === 'success' ? 'var(--success)' : scrapeMessage.type === 'error' ? 'var(--danger)' : 'var(--primary)' }} />
                      <span>{scrapeMessage.text}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    disabled={scrapeLoading || (scrapeType === 'smart' && !profile?.cvText)}
                  >
                    {scrapeLoading ? <RefreshCw size={16} className="glow-active" style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={16} />}
                    {scrapeLoading ? 'Executing Smart Search...' : scrapeType === 'smart' ? '🚀 Launch AI Smart Job Search (Last 24h)' : scrapeType === 'url' ? 'Import Job Listing' : 'Execute Job Search'}
                  </button>
                </form>
              </div>

              {/* Scraped Jobs overview */}
              <div className="glass-panel recent-jobs-panel">
                <h2 className="panel-title" style={{ marginBottom: '16px' }}>Tracker Sourcing Statistics</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Apify Bulk Sourced:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{jobs.filter(j => j.source === 'apify').length} jobs</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Firecrawl URL Sourced:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{jobs.filter(j => j.source === 'firecrawl').length} jobs</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manual Sourced:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{jobs.filter(j => j.source === 'manual').length} jobs</span>
                  </div>

                  <div className="glass-panel" style={{ padding: '16px', marginTop: '10px', background: 'rgba(6,182,212,0.03)', borderColor: 'rgba(6,182,212,0.1)' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={14} style={{ color: 'var(--secondary)' }} /> Sourcing Advice
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                      Jobs applied to in the first 24-48 hours have up to 8x higher response rates. Use search parameters daily to capture newly indexed listings.
                    </p>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 4: MY PROFILE */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in">
            <header className="header">
              <div>
                <h1 className="header-title">Candidate Profile & Tone Trainer</h1>
                <p className="header-subtitle">Upload your resume to scan against job requirements, and configure writing style samples.</p>
              </div>
            </header>

            <div className="dashboard-grid">
              
              {/* Profile Config Fields */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h2 className="panel-title" style={{ marginBottom: '20px' }}>Application Targets & Preferences</h2>
                
                <form onSubmit={handleSaveProfile} className="form-grid">
                  <div>
                    <label className="form-label">CV / Resume upload (PDF)</label>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      accept=".pdf"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />

                    <div 
                      className="upload-zone"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={32} className="upload-icon" style={{ margin: '0 auto 12px', display: 'block' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {uploading ? 'Processing resume text...' : 'Drag & drop CV or click to browse'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Supported format: PDF only. We extract text content locally.
                      </p>
                    </div>

                    {profile?.cvFileName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '0.8rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '8px 12px', borderRadius: '6px' }}>
                        <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                        <span>Active CV: <strong>{profile.cvFileName}</strong> ({profile.cvText.length} characters parsed)</span>
                      </div>
                    )}
                  </div>

                  <div className="form-row-2">
                    <div>
                      <label className="form-label">Target Job Titles (comma list)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Senior React Developer, Frontend Engineer"
                        className="form-control-full"
                        value={prefJobTitles}
                        onChange={(e) => setPrefJobTitles(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Target Locations (comma list)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Remote, Austin TX"
                        className="form-control-full"
                        value={prefLocations}
                        onChange={(e) => setPrefLocations(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div>
                      <label className="form-label">Target Salary Target Range</label>
                      <input 
                        type="text" 
                        placeholder="e.g. $120,000 - $140,000"
                        className="form-control-full"
                        value={prefSalaryRange}
                        onChange={(e) => setPrefSalaryRange(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Target Core Skills (comma list)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. React, TypeScript, GraphQL, Next.js"
                        className="form-control-full"
                        value={targetKeywordsText}
                        onChange={(e) => setTargetKeywordsText(e.target.value)}
                      />
                    </div>
                  </div>

                  <h2 className="panel-title" style={{ marginTop: '20px', borderTop: '1px solid var(--card-border)', paddingTop: '20px' }}>
                    Candidate Writing Style Trainer
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Paste outreach pitches, cold cover letters, or personal emails you have written in the past. Gemini will mimic this style, tone, and level of formality when drafting letters for you.
                  </p>

                  <div>
                    <label className="form-label">Writing Sample #1 (Professional pitch / Cover Letter)</label>
                    <textarea 
                      rows={5}
                      className="form-control-full"
                      placeholder="Hi, I noticed you are hiring for the... My background aligns because..."
                      value={toneSample1}
                      onChange={(e) => setToneSample1(e.target.value)}
                      style={{ fontSize: '0.8rem', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label className="form-label">Writing Sample #2 (Informal email / recruiter message)</label>
                    <textarea 
                      rows={4}
                      className="form-control-full"
                      placeholder="Hey, saw your posting for the React Engineer... Would love to hop on a quick call..."
                      value={toneSample2}
                      onChange={(e) => setToneSample2(e.target.value)}
                      style={{ fontSize: '0.8rem', resize: 'vertical' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={uploading}
                  >
                    {uploading ? 'Saving Profile...' : 'Save Settings & Train AI'}
                  </button>
                </form>
              </div>

              {/* Tips Section */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 className="panel-title">Training Advice</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  The AI uses standard parameters if no writing samples are provided. To ensure customized, non-generic outreach, paste templates that reflect:
                </p>
                <ul style={{ listStyleType: 'circle', paddingLeft: '16px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Your preferred greeting style (e.g., "Hi [Name]" vs "Dear hiring team").</li>
                  <li>How formal or casual your professional vocabulary is.</li>
                  <li>Your average sentence length and structure.</li>
                  <li>Preferred pitch signatures (e.g., "Best regards" vs "Thanks!").</li>
                </ul>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* MODAL: ADD MANUAL JOB */}
      {showAddJobModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Import Job Listing Manually</h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setShowAddJobModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="form-grid">
              <div className="form-row-2">
                <div>
                  <label className="form-label">Job Title *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control-full"
                    placeholder="e.g. Lead Engineer"
                    value={manualForm.title}
                    onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Company Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control-full"
                    placeholder="e.g. Acme Corp"
                    value={manualForm.company}
                    onChange={(e) => setManualForm({ ...manualForm, company: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="form-label">Location</label>
                  <input 
                    type="text" 
                    className="form-control-full"
                    placeholder="e.g. Austin TX"
                    value={manualForm.location}
                    onChange={(e) => setManualForm({ ...manualForm, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Salary Range</label>
                  <input 
                    type="text" 
                    className="form-control-full"
                    placeholder="e.g. $130,000"
                    value={manualForm.salary}
                    onChange={(e) => setManualForm({ ...manualForm, salary: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Job Description text *</label>
                <textarea 
                  required 
                  rows={6}
                  className="form-control-full"
                  placeholder="Paste the full job description here..."
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  style={{ fontSize: '0.8rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="form-label">Post URL</label>
                <input 
                  type="url" 
                  className="form-control-full"
                  placeholder="https://..."
                  value={manualForm.url}
                  onChange={(e) => setManualForm({ ...manualForm, url: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary">Import to Board</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddJobModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
