import React, { useMemo, useState } from "react";
import {
  CheckCircle,
  FileText,
  GraduationCap,
  Info,
  Layers,
  Loader,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Shield,
} from "lucide-react";

export const SITE_SUPPORT_EMAIL = "a.m.a63425@gmail.com";
export const SITE_SUPPORT_PHONE = "0309-8851445";
export const SITE_GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SITE_SUPPORT_EMAIL)}&su=${encodeURIComponent("EduNexus Support Request")}`;

const LEGAL_LAST_UPDATED = "14 September 2026";

const LegalSection = ({ theme, title, children }) => (
  <section className={`${theme.card} rounded-2xl border ${theme.border} p-6 sm:p-8`}>
    <h2 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>{title}</h2>
    <div className={`mt-4 space-y-4 leading-7 ${theme.textMuted}`}>{children}</div>
  </section>
);

export const AboutUs = ({ theme }) => {
  const focusAreas = [
    { icon: GraduationCap, title: "Built around student needs", text: "EduNexus brings commonly needed study tools, academic resources, revision material and student-focused utilities into one place so you can spend less time looking for things and more time learning." },
    { icon: Layers, title: "A practical study hub", text: "The platform is organised around everyday study work: finding course resources, preparing for exams, checking grades, making revision material and keeping useful references close at hand." },
    { icon: MessageCircle, title: "For a learning community", text: "Discussion and feedback features give students a simple way to share questions, suggestions and useful experiences while keeping the focus on respectful academic communication." },
    { icon: Shield, title: "Clear and responsible use", text: "EduNexus aims to keep its information useful, its policies understandable and its tools straightforward. It is an independent student resource and is not a replacement for official university notices or support channels." },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <section className={`${theme.card} rounded-3xl border ${theme.border} shadow-lg overflow-hidden`}>
        <div className="p-6 sm:p-8 md:p-10 bg-gradient-to-br from-indigo-600/15 via-transparent to-cyan-500/10">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-500"><Info size={14} /> About EduNexus</span>
            <h1 className={`mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight ${theme.text}`}>A practical study space for university students</h1>
            <p className={`mt-5 max-w-3xl text-base sm:text-lg leading-8 ${theme.textMuted}`}>EduNexus is an independent educational platform created to make everyday student work simpler. It brings study resources, revision tools, academic utilities and community features together in one responsive website.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        {focusAreas.map(({ icon: Icon, title, text }) => (
          <article key={title} className={`${theme.card} rounded-2xl border ${theme.border} p-6 sm:p-7 shadow-sm`}>
            <div className="flex items-start gap-4"><div className="shrink-0 rounded-xl bg-indigo-500/10 p-3 text-indigo-500"><Icon size={22} /></div><div><h2 className={`text-lg sm:text-xl font-bold ${theme.text}`}>{title}</h2><p className={`mt-2 leading-7 ${theme.textMuted}`}>{text}</p></div></div>
          </article>
        ))}
      </section>

      <section className={`${theme.card} rounded-2xl border ${theme.border} p-6 sm:p-8`}>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className={`text-2xl font-bold ${theme.text}`}>What you can find here</h2>
            <ul className={`mt-5 space-y-3 ${theme.textMuted}`}>
              {["Academic notes, guides and organised learning resources", "Exam preparation and revision-focused tools", "CGPA and other practical student calculators", "Study planning, flashcards and quiz-generation tools", "Articles and discussion features for student questions and ideas", "A portfolio and project area for showcasing work"].map(item => <li key={item} className="flex gap-3 leading-7"><CheckCircle className="mt-1 shrink-0 text-emerald-500" size={18} />{item}</li>)}
            </ul>
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${theme.text}`}>What EduNexus is not</h2>
            <p className={`mt-5 leading-7 ${theme.textMuted}`}>EduNexus is not the official website of Virtual University and does not speak on behalf of the university, its departments or its staff. Official deadlines, results, fee information, policies and academic notices should always be confirmed through the university's official channels.</p>
            <p className={`mt-4 leading-7 ${theme.textMuted}`}>The platform is intended to support learning and organisation. Students remain responsible for checking course requirements and using study material in accordance with applicable academic and copyright rules.</p>
          </div>
        </div>
      </section>

      <section className={`${theme.card} rounded-2xl border ${theme.border} p-6 sm:p-8`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className={`text-2xl font-bold ${theme.text}`}>Have an idea or found a problem?</h2><p className={`mt-2 ${theme.textMuted}`}>Tell us what you noticed. Student feedback helps us improve the platform.</p></div>
          <a href={SITE_GMAIL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700"><Mail size={17}/> Email EduNexus</a>
        </div>
      </section>
    </div>
  );
};

export const ContactUs = ({ theme }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const subject = useMemo(() => `EduNexus Support Request${name.trim() ? ` - ${name.trim()}` : ""}`, [name]);

  const openGmail = (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanMessage = message.trim();
    if (!cleanName || !cleanEmail || !cleanMessage) {
      setError("Please complete all fields before opening Gmail.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSending(true);
    const body = `Name: ${cleanName}\nReply email: ${cleanEmail}\n\nMessage:\n${cleanMessage}`;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SITE_SUPPORT_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => setSending(false), 700);
  };

  const contactCards = [
    { icon: Mail, title: "Email support", value: SITE_SUPPORT_EMAIL, description: "For questions, feedback, corrections and general website support.", href: SITE_GMAIL_URL, action: "Open Gmail" },
    { icon: Phone, title: "Phone", value: SITE_SUPPORT_PHONE, description: "For direct contact regarding the EduNexus platform.", href: `tel:${SITE_SUPPORT_PHONE.replace(/[^0-9+]/g, "")}`, action: "Call" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <section className={`${theme.card} rounded-3xl border ${theme.border} p-6 sm:p-8 md:p-10 shadow-lg`}>
        <div className="max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-500"><MessageCircle size={14}/> Contact & Support</span><h1 className={`mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold ${theme.text}`}>We're here to hear from you</h1><p className={`mt-4 text-base sm:text-lg leading-8 ${theme.textMuted}`}>Whether you found an incorrect resource, have a suggestion, need help with a feature or simply want to share feedback, you can contact the EduNexus team directly.</p></div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {contactCards.map(({ icon: Icon, title, value, description, href, action }) => <article key={title} className={`${theme.card} rounded-2xl border ${theme.border} p-6 shadow-sm`}><div className="flex items-start gap-4"><div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-500"><Icon size={22}/></div><div className="min-w-0 flex-1"><h2 className={`font-bold text-lg ${theme.text}`}>{title}</h2><a href={href} target={title === "Email support" ? "_blank" : undefined} rel={title === "Email support" ? "noopener noreferrer" : undefined} className="mt-1 block break-all font-semibold text-indigo-500 hover:underline">{value}</a><p className={`mt-2 leading-6 ${theme.textMuted}`}>{description}</p><a href={href} target={title === "Email support" ? "_blank" : undefined} rel={title === "Email support" ? "noopener noreferrer" : undefined} className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">{action}</a></div></div></article>)}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <div className={`${theme.card} rounded-2xl border ${theme.border} p-6 sm:p-8`}>
          <div className="mb-6"><h2 className={`text-2xl font-bold ${theme.text}`}>Send a message</h2><p className={`mt-2 ${theme.textMuted}`}>Complete the form and Gmail will open with a ready-to-send message. Your message is not stored by this form.</p></div>
          <form onSubmit={openGmail} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className={`mb-2 block text-sm font-semibold ${theme.text}`}>Name</span><input required value={name} onChange={e => { setName(e.target.value); setError(""); }} maxLength={80} autoComplete="name" className={`w-full rounded-xl border ${theme.border} ${theme.input} p-3 outline-none`} placeholder="Your name" /></label><label className="block"><span className={`mb-2 block text-sm font-semibold ${theme.text}`}>Email</span><input required type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} maxLength={120} autoComplete="email" className={`w-full rounded-xl border ${theme.border} ${theme.input} p-3 outline-none`} placeholder="you@example.com" /></label></div>
            <label className="block"><span className={`mb-2 block text-sm font-semibold ${theme.text}`}>Message</span><textarea required value={message} onChange={e => { setMessage(e.target.value); setError(""); }} maxLength={2000} className={`min-h-[160px] w-full resize-y rounded-xl border ${theme.border} ${theme.input} p-3 outline-none`} placeholder="Tell us what you need help with..." /></label>
            {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">{error}</p>}
            <button disabled={sending} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{sending ? <Loader size={18} className="animate-spin"/> : <Send size={18}/>} {sending ? "Opening Gmail..." : "Open Gmail & compose"}</button>
          </form>
        </div>

        <aside className={`${theme.card} rounded-2xl border ${theme.border} p-6 sm:p-8`}><h2 className={`text-2xl font-bold ${theme.text}`}>Before you contact us</h2><div className={`mt-5 space-y-4 leading-7 ${theme.textMuted}`}><p><strong className={theme.text}>For academic decisions:</strong> confirm official schedules, results, policies and announcements through the university's official channels.</p><p><strong className={theme.text}>For a website issue:</strong> include the page name and a short description of what happened. A screenshot can also help when you email us.</p><p><strong className={theme.text}>For content corrections:</strong> tell us the course, topic and the specific part that needs checking.</p><p><strong className={theme.text}>For privacy requests:</strong> use the email above and clearly mention that your request concerns personal data or privacy.</p></div><div className="mt-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4"><p className={`text-sm leading-6 ${theme.textMuted}`}>EduNexus is an independent educational resource and is not an official Virtual University support desk.</p></div></aside>
      </section>
    </div>
  );
};

export const PrivacyPage = ({ theme }) => {
  const sections = [
    ["1. Who this policy applies to", <><p>EduNexus is an independent educational website for students. It provides study resources, academic utilities, articles, discussions, portfolio features and other website tools. This policy applies to information handled through the EduNexus website and its connected services.</p><p>EduNexus is not the official website or support service of Virtual University. Official university systems may have their own privacy notices and terms.</p></>],
    ["2. Information you choose to provide", <><p>Depending on which features you use, you may provide a name, email address, profile information, discussion posts, feedback, uploaded study material or other information that you voluntarily enter into the site.</p><p>Please do not submit passwords, payment-card details, identity documents, private medical information or other sensitive information through public posts, feedback forms or ordinary support messages unless a feature specifically asks for it and you have checked its purpose.</p></>],
    ["3. Information collected during normal use", <><p>Some technical information can be processed automatically when you visit the website, such as browser or device information, approximate usage activity, page interactions and diagnostic information needed to keep the service working.</p><p>EduNexus also uses website analytics to understand which pages and features are useful and to identify technical problems. Analytics may record events such as page views and feature interactions.</p></>],
    ["4. How we use information", <ul className="list-disc space-y-2 pl-5"><li>To provide the study tools and features you request.</li><li>To save account, profile, discussion or feedback information when a feature requires it.</li><li>To respond to support messages and investigate reported problems.</li><li>To protect the website against misuse, spam and unauthorised activity.</li><li>To understand usage patterns and improve performance, layout and content.</li><li>To maintain the reliability of connected services such as authentication, database storage and file storage.</li></ul>],
    ["5. Firebase and service providers", <><p>EduNexus uses Google Firebase services for functions such as authentication, database storage and file storage. Information required by a feature may therefore be processed by Firebase as part of providing that feature.</p><p>The website may also use other third-party services for analytics, advertising, hosting or website functionality. Those services can process information according to their own policies and settings.</p></>],
    ["6. Cookies, analytics and advertising", <><p>The website may use cookies, local browser storage and similar technologies for essential functionality, preferences, analytics and security.</p><p>EduNexus may display advertising. Advertising services can use cookies or similar technologies to measure advertising performance and, where applicable, personalise advertisements according to the settings and policies of the advertising provider. You can review Google's own privacy and advertising controls through your Google Account and browser settings.</p></>],
    ["7. User content and public information", <><p>Information you deliberately publish in discussions, profiles or other public areas may be visible to other visitors. Do not publish anything you expect to remain private.</p><p>If you upload a file or submit content for a feature, we use it to provide that feature. You are responsible for having the right to upload or share the material and for removing anything you no longer want to keep where the feature provides that option.</p></>],
    ["8. Data security", <p>We use access controls, authenticated services and reasonable technical measures to reduce the risk of unauthorised access, alteration or disclosure. No internet service can promise absolute security, so please use care when deciding what information to submit.</p>],
    ["9. Data retention and deletion requests", <><p>Information may be retained for as long as it is needed to provide a feature, maintain records, resolve disputes, protect the service or meet applicable obligations. Retention can vary by the type of information and the service storing it.</p><p>If you want to ask about personal information associated with your use of EduNexus, contact us at <a className="font-semibold text-indigo-500 hover:underline" href={SITE_GMAIL_URL} target="_blank" rel="noopener noreferrer">{SITE_SUPPORT_EMAIL}</a>.</p></>],
    ["10. Third-party links", <p>EduNexus may link to university pages, Google services, social platforms, external resources or other websites. Once you leave EduNexus, the destination website's own privacy policy and terms apply. We do not control the privacy practices of external websites.</p>],
    ["11. Children's privacy", <p>EduNexus is designed as a student learning resource and is not intended to collect unnecessary personal information from children. If you believe a child has submitted personal information in a way that should not have happened, please contact us so the matter can be reviewed.</p>],
    ["12. Changes to this policy", <p>This policy may be updated when the website, its features or applicable requirements change. The updated version will be published on this page with a revised date. Continued use of the website after an update means you have had an opportunity to review the revised policy.</p>],
  ];
  return <div className="max-w-5xl mx-auto space-y-7 animate-fade-in"><header className={`${theme.card} rounded-3xl border ${theme.border} p-6 sm:p-8 md:p-10 shadow-sm`}><span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-500"><Shield size={14}/> Privacy</span><h1 className={`mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold ${theme.text}`}>Privacy Policy</h1><p className={`mt-4 max-w-3xl leading-7 ${theme.textMuted}`}>This policy explains what information EduNexus may receive through normal use of the website, why it is used, and the choices available to you.</p><p className={`mt-3 text-sm ${theme.textMuted}`}>Last updated: {LEGAL_LAST_UPDATED}</p></header>{sections.map(([title, content]) => <LegalSection key={title} theme={theme} title={title}>{content}</LegalSection>)}<LegalSection theme={theme} title="Privacy questions"><p>For privacy questions or requests, email <a href={SITE_GMAIL_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-500 hover:underline">{SITE_SUPPORT_EMAIL}</a>. Clicking the address opens a Gmail compose window.</p></LegalSection></div>;
};

export const TermsPage = ({ theme }) => {
  const sections = [
    ["1. Acceptance of these terms", <p>By accessing or using EduNexus, you agree to use the website responsibly and to follow these terms. If you do not agree with them, please do not use the service.</p>],
    ["2. Educational purpose and independence", <><p>EduNexus provides study resources and tools intended to help students organise learning and revision. It is an independent platform and is not officially affiliated with, operated by or endorsed by Virtual University unless a particular page clearly states otherwise.</p><p>Official academic decisions, deadlines, results, fee information, policies and notices should be confirmed through the relevant official university channels.</p></>],
    ["3. Acceptable use", <><p>You agree not to use EduNexus to break the law, attack or disrupt the service, bypass access controls, impersonate another person, distribute harmful code, spam other users, or interfere with another user's use of the platform.</p><p>You must not use the platform to facilitate cheating, fraud, harassment, threats or other harmful conduct. Study tools should support genuine learning rather than replace your own academic responsibility.</p></>],
    ["4. Accounts and access", <><p>Some features require an account or authenticated session. Keep your login details private and do not knowingly give another person access to an account that is not theirs.</p><p>We may restrict or suspend access when necessary to protect the website, its users, its data or its services from misuse.</p></>],
    ["5. User-submitted content", <><p>You are responsible for content you upload, publish or submit. You should only share material that you have the right to use and that does not violate another person's privacy, copyright, trademark or other rights.</p><p>Do not upload confidential documents, private credentials or personal information belonging to someone else without a lawful reason and appropriate permission.</p></>],
    ["6. Copyright and intellectual property", <><p>EduNexus's original website design, code, branding and original content remain protected by applicable intellectual-property laws unless a different licence or ownership notice is provided.</p><p>Third-party course material, logos, trademarks and external resources remain the property of their respective owners. A reference or link on EduNexus does not transfer ownership to EduNexus.</p></>],
    ["7. Accuracy of information", <><p>We work to keep resources useful and correct, but educational material can contain mistakes, become outdated or differ from a current course requirement. You should verify important academic information against the latest official source.</p><p>Calculators and study tools are provided as practical aids. Check important results yourself before relying on them for an academic or administrative decision.</p></>],
    ["8. Availability and changes", <><p>We may add, remove, update or temporarily disable features as the website develops. Maintenance, hosting problems, network failures or third-party service issues can sometimes affect availability.</p><p>We may also update these terms when the service changes. The latest version published on this page will apply to continued use of the website after the update.</p></>],
    ["9. Third-party services and links", <><p>EduNexus may use or link to third-party services such as Firebase, Google services, advertising platforms, social networks and external educational websites. Those services operate under their own terms and policies.</p><p>We are not responsible for the availability, content, security or privacy practices of a third-party website after you leave EduNexus.</p></>],
    ["10. No guarantee of uninterrupted service", <p>The website and its resources are provided on an availability basis. To the extent permitted by applicable law, EduNexus does not promise that every page, tool, file or external integration will always be available, error-free or suitable for every purpose.</p>],
    ["11. Limitation of responsibility", <><p>You remain responsible for decisions you make using information or tools found on EduNexus. This includes academic submissions, exam preparation, course choices, administrative decisions and use of third-party resources.</p><p>Nothing on EduNexus should be treated as an official university notice unless it is explicitly identified as such and can be verified through the appropriate official source.</p></>],
    ["12. Contact and support", <p>If you have a question about these terms or want to report a problem, contact us at <a href={SITE_GMAIL_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-500 hover:underline">{SITE_SUPPORT_EMAIL}</a>. The email link opens Gmail directly.</p>],
  ];
  return <div className="max-w-5xl mx-auto space-y-7 animate-fade-in"><header className={`${theme.card} rounded-3xl border ${theme.border} p-6 sm:p-8 md:p-10 shadow-sm`}><span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-500"><FileText size={14}/> Terms</span><h1 className={`mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold ${theme.text}`}>Terms of Service</h1><p className={`mt-4 max-w-3xl leading-7 ${theme.textMuted}`}>These terms explain the basic rules for using EduNexus and the limits that apply to an independent educational resource.</p><p className={`mt-3 text-sm ${theme.textMuted}`}>Last updated: {LEGAL_LAST_UPDATED}</p></header>{sections.map(([title, content]) => <LegalSection key={title} theme={theme} title={title}>{content}</LegalSection>)}<section className={`${theme.card} rounded-2xl border ${theme.border} p-6 sm:p-8`}><h2 className={`text-xl font-bold ${theme.text}`}>Using EduNexus responsibly</h2><p className={`mt-3 leading-7 ${theme.textMuted}`}>The simplest rule is this: use the platform to learn, organise your work, communicate respectfully and respect the rights of other people.</p></section></div>;
};
