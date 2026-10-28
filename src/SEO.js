import { useEffect } from "react";
import { SITE, canonicalUrl, displaySubjectName, seoPageFromLocation } from "./site-seo.mjs";
import { routeParamsFromPath } from "./app-routes.mjs";

const DATA = {
  home: ["EduNexus | VU Notes, Handouts, Past Papers & AI Study Tools", "EduNexus is Pakistan's free study hub for Virtual University (VU) students: VU notes, handouts, past papers, solved MCQs, quizzes, paper reviews, CGPA calculator, study planner, flashcards and AI study tools for midterm and final term exam preparation 2026.", "EduNexus, VU notes, VU handouts, VU past papers, Virtual University notes, VULMS, VU study material, VU solved MCQs, VU quizzes, CGPA calculator, GPA calculator, AI study tools, exam preparation Pakistan, VU midterm preparation, VU final term preparation", "WebSite"],
  academic: ["VU Notes, Handouts & Past Papers | EduNexus Academic Hub", "Explore organized Virtual University notes, handouts, course files, solved MCQs and past papers in the EduNexus Academic Hub — subject-wise VU study material with fast search, free downloads and midterm plus final term preparation for every VU subject.", "VU notes, VU handouts, VU past papers, Virtual University study material, VULMS notes, VU course files, CS101 notes, MTH101 notes, ENG101 notes, PHY101 notes, VU solved MCQs, VU midterm notes, VU final term notes", "CollectionPage"],
  articles: ["VU Study Tips, Guides & Student Articles | EduNexus", "Read VU study tips, exam preparation guides, CGPA improvement tips, LMS guides, scholarship updates and student articles on EduNexus — practical, original guides written for Virtual University students in Pakistan.", "VU study tips, exam preparation tips, university study guides, student articles Pakistan, Virtual University guides, study techniques, VU LMS guide, VU scholarships, CGPA tips", "CollectionPage"],
  "exam-prep": ["VU Exam MCQ Bank & Paper Reviews | EduNexus", "Practice subject-wise VU MCQs from the EduNexus exam MCQ bank — quiz, midterm and final term solved MCQs with answers — plus real paper reviews by VU students sharing paper pattern, important topics and difficulty level.", "VU exam preparation, VU MCQ bank, Virtual University midterm, finalterm, paper reviews, subject-wise practice, VU solved MCQs, VU quiz MCQs, VU past paper pattern", "WebApplication"],
  aiquiz: ["AI Quiz Generator & VU MCQ Practice | EduNexus", "Create AI-powered multiple-choice quizzes from your own study material on EduNexus, practise VU MCQs and test your midterm and final term preparation with instant answers and explanations.", "AI quiz generator, VU MCQs, Virtual University quiz, university MCQs, mock test, practice test, exam preparation, AI MCQ generator Pakistan", "WebApplication"],
  flashcards: ["AI Flashcards for University Students | EduNexus", "Generate interactive AI flashcards for VU subjects and university topics on EduNexus and revise important concepts through active recall before midterm and final term exams.", "AI flashcards, study flashcards, VU flashcards, university revision, AI study tool, exam revision, spaced repetition, VU revision cards", "WebApplication"],
  planner: ["AI Study Planner for University Students | EduNexus", "Build a focused AI study plan on EduNexus around your VU subjects, available study time, quiz dates and midterm and final term exam goals — a realistic daily timetable for Virtual University students.", "AI study planner, university study plan, VU study planner, exam timetable, study schedule, student planner, VU exam schedule", "WebApplication"],
  cgpa: ["CGPA & GPA Calculator for VU Students | EduNexus", "Calculate your approximate GPA and CGPA with the free EduNexus CGPA calculator for VU students — add credit hours and grades to see how each semester affects your CGPA on the 4.0 scale.", "CGPA calculator, GPA calculator, VU CGPA calculator, Virtual University GPA, 4.0 GPA calculator, university calculator Pakistan, semester GPA calculator", "WebApplication"],
  forum: ["VU Student Discussion Forum | EduNexus", "Ask study questions, discuss VU subjects, share notes and get learning help from the EduNexus student community — a free discussion forum for Virtual University students across Pakistan.", "VU discussion forum, Virtual University students, student questions, university discussion, VU community, VU study help", "CollectionPage"],
  portfolio: ["Asad Amanat Ali — Software Engineer & Web Developer | Creator of EduNexus", "Asad Amanat Ali — Software Engineer & Web Developer from Pakistan and creator of EduNexus. Explore my projects, skills, and experience.", "Asad Amanat Ali, software engineer Pakistan, web developer portfolio, EduNexus creator, Virtual University developer", "ProfilePage"],
  about: ["About EduNexus | Independent Student Learning Platform", "EduNexus is an independent, free student learning platform for Virtual University students — VU notes, handouts, past papers, solved MCQs, quizzes, CGPA tools and AI study assistance, built by students for students in Pakistan.", "about EduNexus, student learning platform, education portal, study hub, free VU resources, Virtual University help", "AboutPage"],
  contact: ["Contact EduNexus | Student Support & Feedback", "Contact EduNexus for VU study-resource suggestions, file corrections, missing notes requests, feedback and technical support — we reply to student messages and fix reported issues.", "contact EduNexus, student support, study portal support, feedback, report missing notes, VU help", "ContactPage"],
  guides: ["Study Guides for University Students | EduNexus", "Practical study guides for VU and university students on EduNexus — revision methods, note taking, past paper practice, exam preparation routines and academic planning for better grades.", "study guides, university study tips, exam preparation, revision techniques, student guide Pakistan, VU study guide", "CollectionPage"],
  "vu-notes-guide": ["How to Use VU Notes and Handouts Effectively | EduNexus", "A practical guide to organising Virtual University notes, handouts and course material into a useful revision system for VU midterm and final term exams.", "VU notes guide, VU handouts guide, Virtual University study material, course notes, VULMS study tips, VU revision", "Article"],
  "past-papers": ["Past Papers Exam Preparation Guide | EduNexus", "Learn how to use VU past papers for timed practice, mistake tracking, paper pattern analysis and stronger midterm and final term exam preparation.", "VU past papers guide, past paper preparation, exam practice, university exams Pakistan, VU paper pattern", "Article"],
  "exam-preparation": ["Exam Preparation Guide for University Students | EduNexus", "A calm, practical VU exam preparation routine from the final week through exam day — revision plan, past papers, MCQs practice and stress-free exam attempt tips.", "exam preparation, university exam tips, VU exam preparation, study routine, VU midterm tips, VU final term tips", "Article"],
  "cgpa-guide": ["CGPA and GPA Planning Guide | EduNexus", "Understand CGPA, GPA, credit hours and semester performance for Virtual University students, so you can plan your grades, improve a low CGPA and predict your final CGPA.", "CGPA guide, GPA guide, credit hours, semester GPA, VU grading, improve CGPA, VU CGPA calculation", "Article"],
  "ai-study-tools": ["Responsible AI Study Tools Guide | EduNexus", "Use EduNexus AI study tools — AI quiz generator, flashcards and study planner — for explanations, practice and revision while protecting learning quality and academic integrity.", "AI study tools, responsible AI for students, AI quiz, AI flashcards, academic integrity, VU AI tools", "Article"],
  resources: ["Student Resources and Study Tools | EduNexus", "Explore all EduNexus student resources in one place — VU notes, handouts, past papers, solved MCQs, AI tools, study planner, articles, tutorials and student guides for Virtual University.", "student resources, study tools, VU resources, university resources Pakistan, free VU study material", "CollectionPage"],
  projects: ["Live Projects and Web Apps | EduNexus", "Explore live web projects published online by the EduNexus creator, including EduNexus itself and the Online Academy e-learning platform for students in Pakistan.", "live web projects, education projects, online academy, EduNexus project, student web apps Pakistan", "CollectionPage"],
  tutorials: ["Tutorial Videos for VU Students | EduNexus", "Watch VU LMS walkthroughs, study-skills tutorials and practical learning videos on EduNexus — VULMS guidance, active recall, spaced repetition and exam preparation tutorials for VU students.", "VU tutorial videos, VULMS tutorial, study skills videos, active recall, spaced repetition, university tutorials, VU LMS guide video", "CollectionPage"],
  privacy: ["Privacy Policy | EduNexus", "Read the EduNexus privacy policy: what student data we collect, how cookies and advertising work, and how your privacy is protected on this free study platform.", "EduNexus privacy policy, student data privacy, cookies, advertising privacy", "WebPage"],
  terms: ["Terms of Service | EduNexus", "Read the terms that apply when using EduNexus study resources, quizzes, tools and articles — free student learning platform terms for Virtual University students.", "EduNexus terms, terms of service, study platform terms", "WebPage"],
  admin: ["Admin Panel | EduNexus", "Protected EduNexus administration area.", "EduNexus admin", "WebPage"]
};

// Exported for the build-time prerender script (scripts/prerender.mjs), which
// reuses the same per-page titles/descriptions without touching the DOM.
export const SEO_PAGE_DATA = DATA;


// Homepage FAQ structured data (mirrors src/DashboardFAQ.js QUESTIONS)
const HOME_FAQ = [
  ["Where can I find notes, handouts and past papers?", "Open Academic Hub and choose your subject. You can browse the available files, check their details and download the ones you need."],
  ["A file is not opening or downloading. What should I do?", "Try the Download button instead of Preview. If the file is hosted on Google Drive, check whether the owner has enabled access. If it still does not work, send us the subject code and file name through the query form."],
  ["How do I practise MCQs for my subject?", "Go to Exam Prep, select your subject and choose Quiz, Midterm or Finalterm. You can set the number of questions and choose their original or random order."],
  ["Can I return to an unfinished MCQ practice session?", "Your practice progress is saved in this browser. Avoid clearing browser data if you are practising as a guest."],
  ["What should I do if an MCQ answer looks incorrect?", "Send us the subject code, question number and the answer you believe is correct. A lecture, handout or other reliable reference will help us check it."],
  ["Can I share my completed exam experience?", "Yes. Open Exam Prep and find Paper Reviews. Share the subject, exam type and your own experience after completing the paper."],
  ["Do I have to pay to use the study resources?", "The study resources and practice tools currently available on EduNexus can be accessed without a paid subscription."],
  ["Is EduNexus an official Virtual University website?", "No. EduNexus is an independent study platform. For official dates, announcements, grades and university policies, always check your VU LMS or the university website."]
];

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
  const pathname = window.location.pathname || '';
  const articleReadMatch = pathname.match(/^\/articles\/read\/([^/]+)\/([^/]+)/);
  if (articleReadMatch) {
    const slugTitle = decodeURIComponent(articleReadMatch[2] || '')
      .replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    if (slugTitle) {
      title = slugTitle + ' | EduNexus';
      description = 'Read "' + slugTitle + '" — a student article on EduNexus with study guides, exam tips and Virtual University resources.';
    }
  }
  if (pathname === '/mcq-bank') {
    title = 'MCQ Bank — Practice Solved MCQs | EduNexus';
    description = 'Practice the most important and repeated solved MCQs for VU subjects on EduNexus — Quiz, Midterm and Finalterm banks, free for students.';
  } else if (pathname === '/paper-reviews') {
    title = 'Paper Reviews — Real Student Experiences | EduNexus';
    description = 'Read real paper reviews by VU students on EduNexus — paper pattern, important topics, difficulty level and preparation tips.';
  }
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
  const ogImage = page === 'portfolio' ? SITE + '/portfolio-og.jpg?v=2'
    : pathname === '/mcq-bank' ? SITE + '/mcq-bank-og.jpg'
    : pathname === '/paper-reviews' ? SITE + '/paper-reviews-og.jpg'
    : SITE + '/logo512.png';
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
  const isArticleDetail = !!articleReadMatch;
  const schemaType = isArticleDetail ? 'Article' : data[3];
  const schemaObj = {
    '@context': 'https://schema.org', '@type': schemaType,
    name: title.split('|')[0].trim(), url: canonical, description: description,
    // Brand variants help Google match spaced queries like "edu nexus".
    ...(data[3] === 'WebSite' ? { alternateName: 'Edu Nexus' } : {}),
    isPartOf: { '@type': 'WebSite', name: 'EduNexus', url: SITE },
    // Rich Article metadata for individual article pages.
    ...(isArticleDetail ? {
      headline: title.split('|')[0].trim(),
      author: { '@type': 'Organization', name: 'EduNexus', url: SITE },
      publisher: { '@type': 'Organization', name: 'EduNexus', url: SITE }
    } : {})
  };
  schema.textContent = JSON.stringify(schemaObj).replace(/</g, '\\u003c');

  // --- FAQPage schema on the homepage (rich results for common questions) ---
  let faqSchema = document.head.querySelector('script[data-edunexus-faq]');
  if (page === 'home') {
    if (!faqSchema) {
      faqSchema = document.createElement('script');
      faqSchema.type = 'application/ld+json';
      faqSchema.dataset.edunexusFaq = 'true';
      document.head.appendChild(faqSchema);
    }
    faqSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: HOME_FAQ.map(([q, a]) => ({
        '@type': 'Question', name: q,
        acceptedAnswer: { '@type': 'Answer', text: a }
      }))
    }).replace(/</g, '\\u003c');
  } else if (faqSchema) {
    faqSchema.remove();
  }

  // --- BreadcrumbList for subject/term library pages ---
  let crumbSchema = document.head.querySelector('script[data-edunexus-crumbs]');
  const crumbs = [];
  if (page === 'academic') {
    crumbs.push(['Home', SITE + '/'], ['VU Notes & Handouts', SITE + '/vu-notes']);
    const subj = displaySubjectName(params.get('subject'));
    if (subj) crumbs.push([subj + ' Notes', canonical]);
  } else if (page === 'exam-prep') {
    crumbs.push(['Home', SITE + '/'], ['Exam Prep', SITE + '/exam-prep']);
    const subject = (params.get('subject') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (subject) crumbs.push([subject + ' MCQs', canonical]);
  } else if (page === 'articles') {
    crumbs.push(['Home', SITE + '/'], ['Articles', SITE + '/articles']);
  }
  if (crumbs.length >= 2) {
    if (!crumbSchema) {
      crumbSchema = document.createElement('script');
      crumbSchema.type = 'application/ld+json';
      crumbSchema.dataset.edunexusCrumbs = 'true';
      document.head.appendChild(crumbSchema);
    }
    crumbSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: crumbs.map(([name, url], i) => ({
        '@type': 'ListItem', position: i + 1, name: name, item: url
      }))
    }).replace(/</g, '\\u003c');
  } else if (crumbSchema) {
    crumbSchema.remove();
  }

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
