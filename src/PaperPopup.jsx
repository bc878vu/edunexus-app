// src/PaperPopup.jsx — "data nahi mila" popup with Contact Admin on WhatsApp.
//
// Shown whenever a paper cannot be built for a subject (or a lecture
// selection): the student is told plainly what is missing and gets one tap
// to message the admin on WhatsApp. The admin number is the same public
// number the site footer already uses.

import React from 'react';

const ADMIN_WHATSAPP = '923098851445';

export default function PaperPopup({ code, note, onClose }) {
  const text = 'Assalam o Alaikum! Main EduNexus website se aya hoon, mujhe ' + code +
    ' ka test paper chahiye. Paper test mein is subject ka data nahi mila.';
  const url = 'https://wa.me/' + ADMIN_WHATSAPP + '?text=' + encodeURIComponent(text);
  return (
    <div className="edx-paper-popup-overlay" onClick={onClose} role="presentation">
      <section className="edx-exam-card edx-paper-popup" role="dialog" aria-modal="true"
        aria-label={'Data nahi mila — ' + code} onClick={(e) => e.stopPropagation()}>
        <h3>Data nahi mila — {code}</h3>
        <p>{note}</p>
        <p>Admin se contact karein, wo is subject ka paper data jald add kar dein ge.</p>
        <div className="edx-exam-actions">
          <a className="edx-paper-wa-btn" href={url} target="_blank" rel="noopener noreferrer">Contact Admin on WhatsApp</a>
          <button type="button" className="edx-exam-secondary" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}
