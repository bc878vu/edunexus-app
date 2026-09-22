import { cleanEduBotText, renderableLinks, plainSpeechText } from './edubotPresentation';
import { EDUNEXUS_GROUP, resourceSuggestions, verifiedResourceUrls, makeEduBotPrompt, assemblePublicKnowledge } from './edubotKnowledge';

test('turns markdown links and starred answers into a natural paragraph with no duplicated long Drive link', () => {
  const link = 'https://drive.google.com/drive/folders/1ddLFjVxwpJUa8S8QBcGNQIm4Jv1oHpYc';
  const message = '**CS101 files:**\n[CS101 handouts](' + link + ')\n' + link + '\n> **Academic Hub:** /?page=academic';
  const cleaned = cleanEduBotText(message);
  expect(cleaned).not.toContain('**');
  expect(cleaned).not.toContain('](');
  expect(cleaned.match(/https:\/\/drive\.google\.com/g)).toHaveLength(1);
  expect(cleaned).toContain('CS101 handouts');
  expect(cleaned).toContain('Academic Hub');
});
test('renders only source-approved HTTPS URLs as clickable, not invented links or javascript injection', () => {
  const known='https://drive.google.com/drive/folders/VERIFIED1';
  const fake='https://drive.google.com/drive/folders/MADE_UP_ID';
  const result=renderableLinks('Verified: '+known+'. Fake: '+fake+' <img src=x onerror=alert(1)>', [known]);
  expect(result.filter(x=>x.url).map(x=>x.url)).toEqual([known]);
  expect(result.some(x=>x.text.includes('Link could not be verified'))).toBe(true);
  expect(result.some(x=>x.url?.startsWith('javascript:'))).toBe(false);
  expect(plainSpeechText('Click '+known)).toContain('Link available in chat.');
});
test('public file recommendations use stored titles and stored URLs, never guessed Google Drive URLs', () => {
  const known='https://drive.google.com/drive/folders/KNOWN_FOLDER';
  const items=[
    { section:'files', data:{name:'CS101 Handouts',subject:'CS101',url:known} },
    { section:'files', data:{name:'CS201 Past Papers',subject:'CS201',url:'https://drive.google.com/drive/folders/ANOTHER_FOLDER'} },
    { section:'files', data:{name:'Unknown uploaded PDF',subject:'CS101'} }
  ];
  expect(resourceSuggestions(items,'cs101 file link')).toEqual([{title:'CS101 Handouts',url:known,subject:'CS101',folder:''}]);
  expect(verifiedResourceUrls(items)).toContain(known);
  expect(verifiedResourceUrls(items)).toContain(EDUNEXUS_GROUP);
  expect(resourceSuggestions(items,'CS301 file link')).toEqual([]);
  const prompt=makeEduBotPrompt('CS301 link?',[],assemblePublicKnowledge(items,'CS301 link?','Academic Hub'));
  expect(prompt).toContain('NEVER create or guess Google Drive IDs');
});
