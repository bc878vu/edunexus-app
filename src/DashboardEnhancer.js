import React, { useEffect, useMemo, useState } from "react";

const PAGE_LABELS = {
  home: "Dashboard",
  academic: "Academic Hub",
  articles: "Knowledge Base",
  aiquiz: "AI Quiz",
  flashcards: "AI Flashcards",
  planner: "Study Planner",
  cgpa: "CGPA Calculator",
  forum: "Discussion",
  portfolio: "Portfolio",
  about: "About EduNexus",
  contact: "Contact",
  guides: "Study Guides",
  "vu-notes-guide": "VU Notes Guide",
  "past-papers": "Past Papers Guide",
  "exam-preparation": "Exam Preparation",
  "cgpa-guide": "CGPA Planning Guide",
  "ai-study-tools": "Responsible AI",
  resources: "Resource Centre",
  projects: "Live Projects",
};

function getPage() {
  return new URLSearchParams(window.location.search).get("page") || "home";
}

export default function DashboardEnhancer() {
  const [page, setPage] = useState(getPage);
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const syncRoute = () => setPage(getPage());
    window.addEventListener("popstate", syncRoute);
    const timer = window.setInterval(syncRoute, 350);
    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setProgress(Math.min(100, Math.max(0, (window.scrollY / max) * 100)));
      setShowTop(window.scrollY > 500);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [page]);

  const label = useMemo(() => PAGE_LABELS[page] || "EduNexus", [page]);

  useEffect(() => {
    document.documentElement.dataset.edunexusPage = page;
  }, [page]);

  return (
    <>
      <div className="edx-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <div className="edx-ambient edx-ambient-one" aria-hidden="true" />
      <div className="edx-ambient edx-ambient-two" aria-hidden="true" />
      <div className="edx-grid" aria-hidden="true" />
      <div className="edx-page-pill" aria-hidden="true"><span className="edx-live-dot" /><span>{label}</span></div>
      {showTop && <button type="button" className="edx-top-button" aria-label="Back to top" title="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>}
    </>
  );
}
