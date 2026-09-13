import React, { useEffect, useMemo, useState } from "react";

const PAGE_LABELS = {
  home: "Dashboard", academic: "Academic Hub", articles: "Knowledge Base", aiquiz: "AI Quiz",
  flashcards: "AI Flashcards", planner: "Study Planner", cgpa: "CGPA Calculator", forum: "Discussion",
  portfolio: "Portfolio", about: "About EduNexus", contact: "Contact", guides: "Study Guides",
  "vu-notes-guide": "VU Notes Guide", "past-papers-guide": "Past Papers Guide", "past-papers": "Past Papers Guide",
  "exam-preparation": "Exam Preparation", "cgpa-guide": "CGPA Planning Guide", "ai-study-tools": "Responsible AI",
  resources: "Resource Centre", projects: "Live Projects", tutorials: "Tutorial Videos",
};

function getPage() {
  const queryPage = new URLSearchParams(window.location.search).get("page");
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const pathMap = {
    "/study-guides": "guides", "/tutorials": "tutorials", "/student-resources": "resources",
    "/live-projects": "projects", "/vu-notes-guide": "vu-notes-guide", "/past-papers-guide": "past-papers",
    "/exam-preparation": "exam-preparation", "/cgpa-guide": "cgpa-guide", "/ai-study-tools": "ai-study-tools"
  };
  return queryPage || pathMap[path] || "home";
}

function FloatingStudyGuidesButton({ page }) {
  const [position, setPosition] = useState({ x: 24, y: 120 });

  const moveButton = useMemo(() => () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const size = width <= 768 ? 70 : 82;
    const margin = 18;
    const maxX = Math.max(margin, width - size - margin);
    const maxY = Math.max(margin, height - size - margin);
    setPosition({
      x: Math.round(margin + Math.random() * Math.max(1, maxX - margin)),
      y: Math.round(margin + Math.random() * Math.max(1, maxY - margin)),
    });
  }, []);

  useEffect(() => {
    moveButton();
    const timer = window.setInterval(moveButton, 3200);
    const onResize = () => moveButton();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [moveButton, page]);

  return (
    <a
      className="edx-free-orb edx-study-guides-orb"
      href="/study-guides"
      aria-label="Open Study Guides"
      title="Study Guides"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <span className="edx-free-orb-core">STUDY<br />GUIDES</span>
      <span className="edx-free-spark edx-free-spark-a" aria-hidden="true" />
      <span className="edx-free-spark edx-free-spark-b" aria-hidden="true" />
    </a>
  );
}

export default function DashboardEnhancer() {
  const [page, setPage] = useState(getPage);
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const syncRoute = () => setPage(getPage());
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("edunexus:navigation", syncRoute);
    const timer = window.setInterval(syncRoute, 350);
    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.removeEventListener("edunexus:navigation", syncRoute);
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
  useEffect(() => { document.documentElement.dataset.edunexusPage = page; }, [page]);

  return <>
    <FloatingStudyGuidesButton page={page} />
    <div className="edx-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    <div className="edx-ambient edx-ambient-one" aria-hidden="true" />
    <div className="edx-ambient edx-ambient-two" aria-hidden="true" />
    <div className="edx-grid" aria-hidden="true" />
    <div className="edx-page-pill" aria-hidden="true"><span className="edx-live-dot" /><span>{label}</span></div>
    {showTop && <button type="button" className="edx-top-button" aria-label="Back to top" title="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>}
  </>;
}
