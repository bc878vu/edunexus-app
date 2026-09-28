import { reviewQualityMessage } from './reviewQuality';
describe('public review hygiene',()=>{
  test('keeps genuine long detailed feedback unchanged',()=>{
    expect(reviewQualityMessage('I used the CS620 document to compare event scheduling with queue models. The worked examples helped me find my mistakes.')).toBe('');
  });
  test('rejects spam links, contact details and meaningless repetition',()=>{
    expect(reviewQualityMessage('Visit https://spam.example.test for the final answers now')).toMatch(/URLs/);
    expect(reviewQualityMessage('Contact abc@example.com to purchase the original answer key')).toMatch(/email/);
    expect(reviewQualityMessage('This file is aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toMatch(/filler/);
  });
  test('requires a meaningful review within the 50-word cap',()=>{
    expect(reviewQualityMessage('')).toMatch(/write your review/);
    expect(reviewQualityMessage('word '.repeat(51).trim())).toMatch(/50 words/);
    expect(reviewQualityMessage('a'.repeat(50001))).toMatch(/repeated filler/);
    expect(reviewQualityMessage('word '.repeat(50).trim())).toBe('');
  });
});
