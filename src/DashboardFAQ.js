import React from 'react';
import './dashboard-faq.css';

const QUESTIONS = [
  {
    question: 'Where can I find notes, handouts and past papers?',
    answer: 'Open Academic Hub and choose your subject. You can browse the available files, check their details and download the ones you need.',
    href: '/?page=academic',
    link: 'Browse Academic Hub'
  },
  {
    question: 'A file is not opening or downloading. What should I do?',
    answer: 'Try the Download button instead of Preview. If the file is hosted on Google Drive, check whether the owner has enabled access. If it still does not work, send us the subject code and file name through the query form above.'
  },
  {
    question: 'How do I practise MCQs for my subject?',
    answer: 'Go to Exam Prep, select your subject and choose Quiz, Midterm or Finalterm. You can set the number of questions and choose their original or random order.',
    href: '/?page=exam-prep',
    link: 'Open Exam Prep'
  },
  {
    question: 'Can I return to an unfinished MCQ practice session?',
    answer: 'Your practice progress is saved in this browser. If you use a personal account, saved progress may also be available when you sign in with the same account on another device. Avoid clearing browser data if you are practising as a guest.'
  },
  {
    question: 'What should I do if an MCQ answer looks incorrect?',
    answer: 'Send us the subject code, question number and the answer you believe is correct. A lecture, handout or other reliable reference will help us check it. Please do not rely on an answer key without verifying it.'
  },
  {
    question: 'Can I share my completed exam experience?',
    answer: 'Yes. Open Exam Prep and find Paper Reviews. Share the subject, exam type and your own experience after completing the paper. Please leave out personal information and confidential exam content.',
    href: '/?page=exam-prep',
    link: 'Go to Paper Reviews'
  },
  {
    question: 'Do I have to pay to use the study resources?',
    answer: 'The study resources and practice tools currently available on EduNexus can be accessed without a paid subscription. A file hosted on another website may have its own access requirements.'
  },
  {
    question: 'Is EduNexus an official Virtual University website?',
    answer: 'No. EduNexus is an independent study platform. For official dates, announcements, grades and university policies, always check your VU LMS or the university website.'
  }
];

export default function DashboardFAQ() {
  return (
    <section id="home-faq" className="edx-dashboard-faq" aria-labelledby="edx-dashboard-faq-title">
      <header className="edx-dashboard-faq-head">
        <div>
          <span className="edx-dashboard-faq-eyebrow">HELP & SUPPORT</span>
          <h2 id="edx-dashboard-faq-title">Frequently asked questions</h2>
          <p>Answers to a few common questions about study files, practice quizzes and sharing your exam experience.</p>
        </div>
        <span className="edx-dashboard-faq-count">{QUESTIONS.length} quick answers</span>
      </header>
      <div className="edx-dashboard-faq-items">
        {QUESTIONS.map(({ question, answer, href, link }, index) => (
          <details className="edx-dashboard-faq-item" key={question} open={index === 0}>
            <summary>
              <span>{question}</span>
              <span className="edx-dashboard-faq-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="edx-dashboard-faq-answer">
              <p>{answer}</p>
              {href && <a href={href}>{link}<span aria-hidden="true"> ↗</span></a>}
            </div>
          </details>
        ))}
      </div>
      <p className="edx-dashboard-faq-help">Still need help? Use the Submit Your Query form just above this section and tell us which page or file you are having trouble with.</p>
    </section>
  );
}
