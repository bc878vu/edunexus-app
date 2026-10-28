import React from 'react';
import { MessageCircle } from 'lucide-react';
import { EDUNEXUS_WHATSAPP_GROUP } from './examReviewFormat';

// Shared "nothing found" helper for public search empty states (Academic Hub
// search, Paper Reviews filters, Study Files search, MCQ practice). Instead
// of a bare "not found", visitors see that the data was not found here plus
// the admin WhatsApp button (the same direct-chat link as the footer and the
// reviews banner), so they can ask the admin for the missing item.
// `compact` renders only the button, for use inside alert bars that already
// carry their own "could not be found" text.
export default function NotFoundHelp({ compact = false }) {
  return (
    <div className="edx-notfound-help">
      {!compact && <p className="edx-notfound-text">Idhar se ye data nahi mila.</p>}
      <a className="edx-notfound-whatsapp" href={EDUNEXUS_WHATSAPP_GROUP} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={16} /> Admin se WhatsApp par contact karein
      </a>
    </div>
  );
}
