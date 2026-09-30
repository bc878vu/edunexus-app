import { useEffect } from "react";
import { SITE, canonicalUrl, displaySubjectName, seoPageFromLocation } from "./site-seo.mjs";
import { routeParamsFromPath } from "./app-routes.mjs";

const DATA = {
  home: ["EduNexus | VU Notes, Handouts, Past Papers & AI Study Tools", "EduNexus is a student study hub for Virtual University learners with notes, handouts, past papers, quizzes, CGPA calculator, study planner, flashcards and practical AI study tools.", "EduNexus, VU notes, VU handouts, VU past papers, Virtual University notes, VULMS, VU study material, CGPA calculator, GPA calculator, AI study tools, exam preparation Pakistan", "WebSite"],
  academic: ["VU Notes, Handouts & Past Papers | EduNexus Academic Hub", "Explore organized Virtual University notes, handouts, course files and past-paper resources with subject-focused search and quick access.", "VU notes, VU handouts, VU past papers, Virtual University study material, VULMS notes, VU course files, CS101 notes, MTH101 notes, ENG101 notes, PHY101 notes", "CollectionPage"],
  articles: ["VU Study Tips, Guides & Student Articles | EduNexus", "Read useful study guides, exam preparation tips, academic explainers and student-focused articles published for everyday university study.", "VU study tips, exam preparation tips, university study guides, student articles Pakistan, Virtual University guides, study techniques", "CollectionPage"],
  "exam-prep": ["VU Exam MCQ Bank & Paper Reviews | EduNexus", "Practice subject-wise VU MCQs, explore completed-exam paper reviews and find exam preparation resources.", "VU exam preparation, VU MCQ bank, Virtual University midterm, finalterm, paper reviews, subject-wise practice", "WebApplication"],
  aiquiz: ["AI Quiz Generator & VU MCQ Practice | EduNexus", "Create AI-powered multiple-choice quizzes for revision, practise university concepts and test your preparation.", "AI quiz generator, VU MCQs, Virtual University quiz, university MCQs, mock test, practice test, exam preparation", "WebApplication"],
  flashcards: ["AI Flashcards for University Students | EduNexus", "Generate interactive AI flashcards for university topics and revise important concepts through active recall.", "AI flashcards, study flashcards, VU flashcards, university revision, AI study tool, exam revision", "WebApplication"],
  planner: ["AI Study Planner for University Students | EduNexus", "Build a focused study plan around your subjects, available study time and exam preparation goals.", "AI study planner, university study plan, VU study planner, exam timetable, study schedule, student planner", "WebApplication"],
  cgpa: ["CGPA & GPA Calculator for VU Students | EduNexus", "Calculate an approximate GPA or CGPA with a responsive university calculator and review how credit hours affect performance.", "CGPA calculator, GPA calculator, VU CGPA calculator, Virtual University GPA, 4.0 GPA calculator, university calculator Pakistan", "WebApplication"],
  forum: ["VU Student Discussion Forum | EduNexus", "Ask study questions, discuss university topics and share learning help with the EduNexus student community.", "VU discussion forum, Virtual University students, student questions, university discussion, VU community", "CollectionPage"],
  portfolio: ["Asad Amanat Ali — Software Engineer & Web Developer | Creator of EduNexus", "Asad Amanat Ali — Software Engineer & Web Developer from Pakistan and creator of EduNexus. Explore my projects, skills, and experience.", "Asad Amanat Ali, software engineer Pakistan, web developer portfolio, EduNexus creator, Virtual University developer", "ProfilePage"],
  about: ["About EduNexus | Independent Student Learning Platform", "Learn about EduNexus and its mission to make academic resources and study tools easier for students to access.", "about EduNexus, student learning platform, education portal, study hub", "AboutPage"],
  contact: ["Contact EduNexus | Student Support & Feedback", "Contact EduNexus for study-resource suggestions, corrections, feedback and technical support.", "contact EduNexus, student support, study portal support, feedback", "ContactPage"],
  guides: ["Study Guides for University Students | EduNexus", "Practical study guides covering revision, note taking, past papers, exam preparation and academic planning.", "study guides, university study tips, exam preparation, revision techniques, student guide Pakistan", "CollectionPage"],
  "vu-notes-guide": ["How to Use VU Notes and Handouts Effectively | EduNexus", "A practical guide to organising Virtual University notes, handouts and course material into a useful revision system.", "VU notes guide, VU handouts guide, Virtual University study material, course notes, VULMS study tips", "Article"],
  "past-papers": ["Past Papers Exam Preparation Guide | EduNexus", "Learn how to use past papers for timed practice, mistake tracking and stronger university exam preparation.", "VU past papers guide, past paper preparation, exam practice, university exams Pakistan", "Article"],
  "exam-preparation": ["Exam Preparation Guide for University Students | EduNexus", "A calm, practical exam preparation routine from the final week through exam day.", "exam preparation, university exam tips, VU exam preparation, study routine", "Article"],
  "cgpa-guide": ["CGPA and GPA Planning Guide | EduNexus", "Understand CGPA, GPA, credit hours and semester performance so you can make better academic plans.", "CGPA guide, GPA guide, credit hours, semester GPA, VU grading", "Article"],
  "ai-study-tools": ["Responsible AI Study Tools Guide | EduNexus", "Use AI for explanations, practice and revision while protecting learning quality and academic integrity.", "AI study tools, responsible AI for students, AI quiz, AI flashcards, academic integrity", "Article"],
  resources: ["Student Resources and Study Tools | EduNexus", "Explore EduNexus academic resources, AI tools, study planner, articles, tutorials and student guides.", "student resources, study tools, VU resources, university resources Pakistan", "CollectionPage"],
  projects: ["Live Projects and Web Apps | EduNexus", "Explore live web projects published online, including EduNexus and the Online Academy project.", "live web projects, education projects, online academy, EduNexus project", "CollectionPage"],
  tutorials: ["Tutorial Videos for VU Students | EduNexus", "Watch VU LMS walkthroughs, study-skills tutorials and practical learning videos. EduNexus also supports administrator-uploaded video tutorials.", "VU tutorial videos, VULMS tutorial, study skills videos, active recall, spaced repetition, university tutorials", "CollectionPage"],
  privacy: ["Privacy Policy | EduNexus", "Read the EduNexus privacy policy, data practices, cookies and advertising information.", "EduNexus privacy policy, student data privacy, cookies, advertising privacy", "WebPage"],
  terms: ["Terms of Service | EduNexus", "Read the terms that apply when using EduNexus study resources and tools.", "EduNexus terms, terms of service, study platform terms", "WebPage"],
  admin: ["Admin Panel | EduNexus", "Protected EduNexus administration area.", "EduNexus admin", "WebPage"]
};

// Exported for the build-time prerender script (scripts/prerender.mjs), which
// reuses the same per-page titles/descriptions without touching the DOM.
export const SEO_PAGE_DATA = DATA;

// All SEO head changes are owned here; App handles rendering/navigation only.
const setMeta = (name, value) => {
  let element = document.head.querySelector('meta[name="' + name + '"]');
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = value;
};

const setProp = (name, value) => {
  let element = document.head.querySelector('meta[property="' + name + '"]');
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', name);
    document.head.appendChild(element);
  }
  element.content = value;
};

function updateSeo() {
  const page = seoPageFromLocation(window.location);
  const data = DATA[page] || DATA.home;
  // Subject/term can arrive as query params (?page=exam-prep&subject=CS609)
  // or as pretty path params (/exam-prep/CS609/Finalterm); query wins.
  const pathParams = routeParamsFromPath(window.location.pathname);
  const params = new URLSearchParams(window.location.search || '');
  if (!params.get('subject') && pathParams.subject) params.set('subject', pathParams.subject);
  if (!params.get('term') && pathParams.term) params.set('term', pathParams.term);
  const canonical = canonicalUrl(page, params.toString() ? '?' + params.toString() : '');
  // Subject/term-specific titles + descriptions so each MCQ bank and subject
  // library view gets its own indexable identity instead of one generic page.
  let title = data[0];
  let description = data[1];
  if (page === 'exam-prep') {
    const subject = (params.get('subject') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const term = (params.get('term') || '').toLowerCase();
    const termLabel = term === 'midterm' ? 'Midterm' : term === 'finalterm' ? 'Final Term' : '';
    if (subject && termLabel) {
      title = subject + ' ' + termLabel + ' Solved MCQs | EduNexus';
      description = 'Practice ' + subject + ' ' + termLabel + ' solved MCQs with answers, explore paper reviews and prepare for your Virtual University ' + subject + ' exam on EduNexus.';
    }
  } else if (page === 'academic') {
    const subject = displaySubjectName(params.get('subject'));
    if (subject) {
      title = subject + ' Notes, Handouts & Past Papers | EduNexus';
      description = 'Download ' + subject + ' notes, handouts and past papers for Virtual University students on EduNexus.';
    }
  }
  document.title = title;
  setMeta('description', description);
  setMeta('keywords', data[2]);
  setMeta('robots', page === 'admin'
    ? 'noindex, nofollow'
    : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
  setMeta('theme-color', '#0f172a');
  setMeta('twitter:card', 'summary_large_image');
  setProp('og:type', data[3] === 'WebSite' || data[3] === 'CollectionPage'
    ? 'website' : data[3] === 'ProfilePage' ? 'profile' : 'article');
  setProp('og:site_name', 'EduNexus');
  setProp('og:title', title);
  setProp('og:description', description);
  setProp('og:url', canonical);
  setProp('og:locale', 'en_PK');
  const ogImage = page === 'portfolio' ? SITE + '/portfolio-og.jpg?v=2' : SITE + '/logo512.png';
  setProp('og:image', ogImage);
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', ogImage);

  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = canonical;

  // Drop a duplicate static JSON-LD block of the same @type (e.g. the
  // hard-coded WebSite block in index.html) before writing ours, so Google
  // never sees two competing blocks for the same entity.
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    try {
      if (JSON.parse(el.textContent || '{}')['@type'] === data[3] && !el.dataset.edunexusSeo && el.id !== 'edx-portfolio-schema') el.remove();
    } catch (_) { /* ignore non-JSON blocks */ }
  });

  let schema = document.head.querySelector('script[data-edunexus-seo]');
  if (!schema) {
    schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.dataset.edunexusSeo = 'true';
    document.head.appendChild(schema);
  }
  schema.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': data[3],
    name: title.split('|')[0].trim(), url: canonical, description: description,
    isPartOf: { '@type': 'WebSite', name: 'EduNexus', url: SITE }
  }).replace(/</g, '\\u003c');

  // Preserve the original developer ProfilePage schema without a second
  // writer using the Vercel host.
  let profile = document.getElementById('edx-portfolio-schema');
  if (page === 'portfolio') {
    if (!profile) {
      profile = document.createElement('script');
      profile.id = 'edx-portfolio-schema';
      profile.type = 'application/ld+json';
      document.head.appendChild(profile);
    }
    profile.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'ProfilePage', url: canonical,
      mainEntity: {
        '@type': 'Person', name: 'Asad Amanat Ali', url: canonical,
        description: 'Creator of EduNexus, a student study and exam preparation platform.'
      }
    }).replace(/</g, '\\u003c');
  } else if (profile) {
    profile.remove();
  }
}

export function SEOManager() {
  useEffect(() => {
    // Keep the legacy history event contract for modules that navigate via
    // history.pushState without dispatching edunexus:navigation themselves.
    const pushState = window.history.pushState;
    const replaceState = window.history.replaceState;
    window.history.pushState = function (...args) {
      const result = pushState.apply(this, args);
      window.dispatchEvent(new Event('edunexus:navigation'));
      return result;
    };
    window.history.replaceState = function (...args) {
      const result = replaceState.apply(this, args);
      window.dispatchEvent(new Event('edunexus:navigation'));
      return result;
    };
    updateSeo();
    window.addEventListener('popstate', updateSeo);
    window.addEventListener('edunexus:navigation', updateSeo);
    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
      window.removeEventListener('popstate', updateSeo);
      window.removeEventListener('edunexus:navigation', updateSeo);
    };
  }, []);
  return null;
}
