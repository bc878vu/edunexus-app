/**
 * Tests for PinnedAd active-ad selection logic.
 * The selection rule: isActive !== false AND now within [startAt, endAt]
 * (either bound empty = no limit). Most recent createdAt wins on ties.
 */

function selectActiveAd(items, now) {
  return items.find((item) => {
    if (item.isActive === false) return false;
    if (item.startAt) {
      const start = item.startAt?.toMillis ? item.startAt.toMillis() : new Date(item.startAt).getTime();
      if (Number.isFinite(start) && now < start) return false;
    }
    if (item.endAt) {
      const end = item.endAt?.toMillis ? item.endAt.toMillis() : new Date(item.endAt).getTime();
      if (Number.isFinite(end) && now > end) return false;
    }
    return true;
  }) || null;
}

describe('PinnedAd selection logic', () => {
  const NOW = new Date('2026-09-27T12:00:00Z').getTime();

  test('returns null when no ads', () => {
    expect(selectActiveAd([], NOW)).toBeNull();
  });

  test('shows active ad with no schedule bounds', () => {
    const ads = [{ id: '1', isActive: true, videoUrl: 'https://x/y.mp4' }];
    expect(selectActiveAd(ads, NOW).id).toBe('1');
  });

  test('skips disabled ad', () => {
    const ads = [{ id: '1', isActive: false, videoUrl: 'https://x/y.mp4' }];
    expect(selectActiveAd(ads, NOW)).toBeNull();
  });

  test('skips ad scheduled for the future', () => {
    const ads = [{
      id: '1', isActive: true, videoUrl: 'https://x/y.mp4',
      startAt: new Date('2026-10-01T00:00:00Z'),
    }];
    expect(selectActiveAd(ads, NOW)).toBeNull();
  });

  test('skips expired ad', () => {
    const ads = [{
      id: '1', isActive: true, videoUrl: 'https://x/y.mp4',
      endAt: new Date('2026-09-01T00:00:00Z'),
    }];
    expect(selectActiveAd(ads, NOW)).toBeNull();
  });

  test('shows ad within schedule window', () => {
    const ads = [{
      id: '1', isActive: true, videoUrl: 'https://x/y.mp4',
      startAt: new Date('2026-09-01T00:00:00Z'),
      endAt: new Date('2026-10-01T00:00:00Z'),
    }];
    expect(selectActiveAd(ads, NOW).id).toBe('1');
  });

  test('picks most recent when multiple qualify (input pre-sorted desc)', () => {
    const ads = [
      { id: 'new', isActive: true, videoUrl: 'https://x/new.mp4' },
      { id: 'old', isActive: true, videoUrl: 'https://x/old.mp4' },
    ];
    expect(selectActiveAd(ads, NOW).id).toBe('new');
  });

  test('falls through to next when first is disabled', () => {
    const ads = [
      { id: 'new', isActive: false, videoUrl: 'https://x/new.mp4' },
      { id: 'old', isActive: true, videoUrl: 'https://x/old.mp4' },
    ];
    expect(selectActiveAd(ads, NOW).id).toBe('old');
  });
});
