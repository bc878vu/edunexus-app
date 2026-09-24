import React, { useEffect, useMemo, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { splitRichContent } from './rich-content.mjs';
import './rich-content.css';

// KaTeX receives only the math expression, never arbitrary uploaded HTML.
// trust:false disables HTML commands and unsafe links/URLs in user formulas.
function SafeMath({ tex, display }) {
  const element = useRef(null);
  useEffect(() => {
    if (!element.current) return;
    try {
      katex.render(tex, element.current, {
        displayMode: display, throwOnError: true, trust: false,
        strict: 'ignore', maxExpand: 1000, maxSize: 10,
        output: 'htmlAndMathml'
      });
    } catch (_) {
      // An invalid formula must never blank the question or break the page.
      element.current.textContent = tex;
    }
  }, [tex, display]);
  return <span className={'edx-rich-math' + (display ? ' is-display' : '')} ref={element}>{tex}</span>;
}

export default function RichContent({ value, className = '' }) {
  const blocks = useMemo(() => splitRichContent(value), [value]);
  return <span className={'edx-rich-content ' + className}>
    {blocks.map((block, index) => block.type === 'codeBlock'
      ? <span key={index} className="edx-rich-code-block" dir="ltr">
          {block.language && <span className="edx-rich-code-language">{block.language}</span>}
          <code>{block.value}</code>
        </span>
      : <span key={index} className="edx-rich-prose">{block.parts.map((part, partIndex) =>
          part.type === 'math'
            ? <SafeMath key={partIndex} tex={part.value} display={part.display}/>
            : part.type === 'code'
              ? <code key={partIndex} className="edx-rich-inline-code" dir="ltr">{part.value}</code>
              : <React.Fragment key={partIndex}>{part.value}</React.Fragment>
        )}</span>
    )}
  </span>;
}
