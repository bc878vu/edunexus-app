import { useEffect } from "react";

const SITE = "https://edunexus-app.vercel.app";

const pages = {
  "/": { title: "EduNexus | VU Notes, Handouts, Past Papers & AI Study Tools", description: "EduNexus is a free student study hub for Virtual University and online students. Find notes, handouts, past papers, quizzes, CGPA tools and AI-powered study help.", keywords: "VU notes, VU handouts, VU past papers, Virtual University notes, VULMS, online study portal, CGPA calculator, GPA calculator, AI study tools, university exam preparation Pakistan", type: "WebSite" },
  "/vu-notes": { title: "VU Notes & Study Material | EduNexus", description: "Find organized Virtual University notes, subject resources and study material for faster exam preparation.", keywords: "VU notes, Virtual University notes, VU study material, VULMS notes, university notes Pakistan", type: "CollectionPage" },
  "/handouts": { title: "VU Handouts & Course Material | EduNexus", description: "Access Virtual University handouts and course resources in one searchable student-friendly study hub.", keywords: "VU handouts, Virtual University handouts, VU course handouts, VULMS handouts, VU study resources", type: "CollectionPage" },
  "/past-papers": { title: "VU Past Papers & Exam Preparation | EduNexus", description: "Prepare for university exams with past papers, revision resources, quizzes and focused study tools.", keywords: "VU past papers, Virtual University past papers, VU exam preparation, VU papers, university past papers Pakistan", type: "CollectionPage" },
  "/quizzes": { title: "AI Quizzes & Practice Tests for Students | EduNexus", description: "Generate quick AI-powered quizzes and practice questions for university revision and exam preparation.", keywords: "AI quiz, university quiz, VU quiz, practice test, mock test, exam preparation, MCQs", type: "CollectionPage" },
  "/cgpa-calculator": { title: "CGPA Calculator | GPA Calculator for University Students | EduNexus", description: "Calculate your approximate CGPA and GPA on a 4.0 scale with a simple responsive university calculator.", keywords: "CGPA calculator, GPA calculator, university CGPA calculator, 4.0 GPA calculator, Pakistan university GPA", type: "WebApplication" },
  "/ai-tools": { title: "AI Study Tools for Students | EduBot, Flashcards & Quiz | EduNexus", description: "Use EduNexus AI study tools for explanations, revision, flashcards, quizzes and smarter academic preparation.", keywords: "AI study tools, AI tutor, AI student assistant, AI flashcards, AI quiz generator, study AI, EduBot", type: "WebApplication" },
  "/articles": { title: "Student Articles, Guides & Study Tips | EduNexus", description: "Read useful student guides, study tips, academic explainers and exam preparation articles from EduNexus.", keywords: "student articles, study tips, exam tips, university guides, study guides Pakistan, academic articles", type: "CollectionPage" },
  "/about": { title: "About EduNexus | Student Learning Platform", description: "Learn about EduNexus, an independent student learning platform built to make academic resources and study tools easier to access.", keywords: "about EduNexus, student learning platform, study portal", type: "AboutPage" },
  "/contact": { title: "Contact EduNexus | Student Support", description: "Contact EduNexus for feedback, resource suggestions, corrections and student support.", keywords: "contact EduNexus, student support, study portal contact", type: "ContactPage" }
};

function setMeta(name, content) {
  let node = document.head.querySelector(`meta[name="${name}"]`);
  if (!node) { node = document.createElement("meta"); node.name = name; document.head.appendChild(node); }
  node.content = content;
}
function setProperty(property, content) {
  let node = document.head.querySelector(`meta[property="${property}"]`);
  if (!node) { node = document.createElement("meta"); node.setAttribute("property", property); document.head.appendChild(node); }
  node.content = content;
}
function setLink(rel, href) {
  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!node) { node = document.createElement("link"); node.rel = rel; document.head.appendChild(node); }
  node.href = href;
}

export function SEOManager() {
  useEffect(() => {
    const normalize = value => value.split("?")[0].replace(/\/+$/, "") || "/";
    const update = () => {
      const path = normalize(window.location.pathname);
      const page = pages[path] || pages["/"];
      const canonical = `${SITE}${path === "/" ? "/" : path}`;
      document.title = page.title;
      setMeta("description", page.description);
      setMeta("keywords", page.keywords);
      setMeta("robots", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
      setProperty("og:title", page.title); setProperty("og:description", page.description); setProperty("og:url", canonical);
      setProperty("og:type", path === "/articles" ? "article" : "website"); setProperty("og:site_name", "EduNexus"); setProperty("og:locale", "en_PK");
      setProperty("twitter:title", page.title); setProperty("twitter:description", page.description);
      setLink("canonical", canonical);
      const json = { "@context": "https://schema.org", "@type": page.type, name: page.title.replace(/\s*\|.*$/, ""), url: canonical, description: page.description, isPartOf: { "@type": "WebSite", name: "EduNexus", url: SITE } };
      if (page.type === "WebApplication") { json.applicationCategory = "EducationalApplication"; json.operatingSystem = "Web"; json.offers = { "@type": "Offer", price: "0", priceCurrency: "USD" }; }
      let ld = document.head.querySelector("script[data-edunexus-seo]");
      if (!ld) { ld = document.createElement("script"); ld.type = "application/ld+json"; ld.dataset.edunexusSeo = "true"; document.head.appendChild(ld); }
      ld.textContent = JSON.stringify(json);
    };
    update(); window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return null;
}

export function SeoRouteBridge() {
  useEffect(() => {
    const routeMap = { "Academic": "/vu-notes", "Ai": "/ai-tools", "Quiz": "/quizzes", "Flashcards": "/ai-tools", "Cgpa": "/cgpa-calculator", "Forum": "/articles", "Articles": "/articles", "Home": "/" };
    const handler = event => {
      const button = event.target.closest?.("button"); if (!button) return;
      const label = button.textContent.trim().replace(/\s+/g, " "); const path = routeMap[label]; if (!path) return;
      if (window.location.pathname !== path) window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    };
    document.addEventListener("click", handler); return () => document.removeEventListener("click", handler);
  }, []);
  return null;
}

export function routeForPath(pathname) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const map = { "/vu-notes": "academic", "/handouts": "academic", "/past-papers": "academic", "/quizzes": "quiz", "/cgpa-calculator": "cgpa", "/ai-tools": "ai", "/articles": "articles", "/about": "home", "/contact": "home" };
  return map[clean] || "home";
}
