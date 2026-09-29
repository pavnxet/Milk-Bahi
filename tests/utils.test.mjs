import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEntry,
  parseLocalDate,
  sanitizeFilename,
  sanitizeData,
  todayKey,
  isFutureKey,
  shouldPromptStar,
  compareVersions,
  shouldNotifyRelease,
  groupEntriesByMonth,
  monthLabel,
  formatDDMMYYYY,
  formatTime12h,
} from '../src/utils.js';
import { generateCSVContent } from '../src/csvHelper.js';

describe('calculateEntry', () => {
  it('uses historical (stored) prices when present', () => {
    const r = calculateEntry({ cow: 2, buffalo: 1, cowPrice: 40, buffaloPrice: 55 }, 99, 99);
    assert.equal(r.cow, 2);
    assert.equal(r.buffalo, 1);
    assert.equal(r.cowPrice, 40);
    assert.equal(r.buffaloPrice, 55);
    assert.equal(r.cost, 2 * 40 + 1 * 55);
  });

  it('falls back to default prices when entry has none stored', () => {
    const r = calculateEntry({ cow: 2, buffalo: 1 }, 42, 60);
    assert.equal(r.cowPrice, 42);
    assert.equal(r.buffaloPrice, 60);
    assert.equal(r.cost, 2 * 42 + 1 * 60);
  });

  it('tolerates null/undefined entry objects', () => {
    const r = calculateEntry(null, 40, 55);
    assert.deepEqual(r, { cow: 0, buffalo: 0, cowPrice: 40, buffaloPrice: 55, cost: 0 });
  });
});

describe('generateCSVContent', () => {
  it('starts with a UTF-8 BOM plus header row', () => {
    const csv = generateCSVContent([['2026-09-29', { cow: 1, buffalo: 0 }]], 40, 55);
    assert.ok(csv.startsWith('﻿Date,Cow (L),Buffalo (L),Cow Price,Buffalo Price,Cost (INR),Note\n'));
  });

  it('quotes notes containing commas, double-quotes, newlines and CR', () => {
    const csv = generateCSVContent(
      [['2026-09-29', { cow: 1, buffalo: 0, note: 'a,b"c\nd\re' }]],
      40,
      55,
    );
    // " doubled, whole field wrapped in quotes (covers comma, \n and \r).
    assert.ok(csv.includes('"a,b""c\nd\re"'));
  });

  it("prefixes formula-leading notes (=,+,-,@) with a single quote", () => {
    for (const ch of ['=', '+', '-', '@']) {
      const csv = generateCSVContent(
        [['2026-09-29', { cow: 1, buffalo: 0, note: `${ch}SUM(A1:A2)` }]],
        40,
        55,
      );
      assert.ok(csv.includes(`'${ch}SUM(A1:A2)`), `missing guard for ${ch}`);
    }
  });

  it('leaves plain notes unquoted', () => {
    const csv = generateCSVContent(
      [['2026-09-29', { cow: 1, buffalo: 0, note: 'morning delivery' }]],
      40,
      55,
    );
    assert.ok(csv.includes(',morning delivery\n'));
  });
});

describe('sanitizeData', () => {
  it('drops null and non-object entries', () => {
    const out = sanitizeData({
      '2026-09-29': null,
      '2026-09-28': 'junk',
      '2026-09-27': [1, 2],
      '2026-09-26': { cow: 1, buffalo: 2 },
    });
    assert.deepEqual(Object.keys(out), ['2026-09-26']);
  });

  it('rejects NaN and Infinity amounts', () => {
    const out = sanitizeData({
      '2026-09-29': { cow: NaN, buffalo: 0 },
      '2026-09-28': { cow: 1, buffalo: Infinity },
      '2026-09-27': { cow: 1, buffalo: 1 },
    });
    assert.deepEqual(Object.keys(out), ['2026-09-27']);
  });

  it('caps notes at 200 chars', () => {
    const out = sanitizeData({ '2026-09-29': { cow: 1, buffalo: 0, note: 'x'.repeat(250) } });
    assert.equal(out['2026-09-29'].note.length, 200);
  });

  it('rejects __proto__/constructor keys', () => {
    const out = sanitizeData({
      __proto__: { cow: 1, buffalo: 1 },
      constructor: { cow: 1, buffalo: 1 },
      '2026-09-29': { cow: 1, buffalo: 0 },
    });
    assert.equal(Object.prototype.hasOwnProperty.call(out, '__proto__'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out, 'constructor'), false);
    assert.deepEqual(Object.keys(out), ['2026-09-29']);
  });

  it('converts legacy number-format entries to cow litres', () => {
    const out = sanitizeData({ '2026-09-28': 2.5 });
    assert.deepEqual(out['2026-09-28'], { cow: 2.5, buffalo: 0 });
  });

  it('drops invalid-date and non-date keys', () => {
    const out = sanitizeData({
      garbage: { cow: 1, buffalo: 0 },
      '2026-13-01': { cow: 1, buffalo: 0 },
      '2026-02-30': { cow: 1, buffalo: 0 },
      '2026-09-29': { cow: 1, buffalo: 0 },
    });
    assert.deepEqual(Object.keys(out), ['2026-09-29']);
  });
});

describe('parseLocalDate', () => {
  it('parses 2026-09-29 into local Y/M/D components', () => {
    const d = parseLocalDate('2026-09-29');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 8);
    assert.equal(d.getDate(), 29);
  });

  it('returns Invalid Date for garbage input', () => {
    for (const bad of ['garbage', '', null, undefined, '2026-09']) {
      assert.ok(Number.isNaN(parseLocalDate(bad).getTime()), `expected Invalid Date for ${bad}`);
    }
  });
});

describe('sanitizeFilename', () => {
  it('replaces slashes, colons, backslashes and spaces with _', () => {
    assert.equal(sanitizeFilename('Milk/Report: 9/29 2026'), 'Milk_Report_9_29_2026');
    assert.equal(sanitizeFilename('a\\b:c d'), 'a_b_c_d');
  });
});

describe('todayKey', () => {
  it('emits a zero-padded local YYYY-MM-DD key', () => {
    assert.equal(todayKey(new Date(2026, 0, 5)), '2026-01-05');
    assert.match(todayKey(), /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isFutureKey', () => {
  it('flags tomorrow and next-month keys, accepts today and past', () => {
    assert.equal(isFutureKey('2999-01-01', '2026-09-29'), true);
    assert.equal(isFutureKey('2026-09-30', '2026-09-29'), true);
    assert.equal(isFutureKey('2026-09-29', '2026-09-29'), false);
    assert.equal(isFutureKey('2026-09-28', '2026-09-29'), false);
    assert.equal(isFutureKey(null, '2026-09-29'), false);
  });
});

describe('shouldPromptStar', () => {
  it('prompts every 3rd share only', () => {
    assert.equal(shouldPromptStar(1), false);
    assert.equal(shouldPromptStar(3), true);
    assert.equal(shouldPromptStar(6), true);
    assert.equal(shouldPromptStar(0), false);
    assert.equal(shouldPromptStar(NaN), false);
  });
});

describe('compareVersions', () => {
  it('orders dotted versions with run-number segments', () => {
    assert.equal(compareVersions('v3.2.0.41', '3.2.0'), 1);
    assert.equal(compareVersions('3.3.0', 'v3.2.0.41'), 1);
    assert.equal(compareVersions('3.2.0', '3.2.0.0'), 0);
    assert.equal(compareVersions('3.1.9', '3.2.0'), -1);
  });
});

describe('shouldNotifyRelease', () => {
  const marked = (tag) => ({ tag, body: 'Notes here.\n\n[notify]' });
  it('notifies for a newer marked release', () => {
    assert.deepEqual(
      shouldNotifyRelease(marked('v3.3.0.42'), '3.2.0', ''),
      { notify: true, version: 'v3.3.0.42' }
    );
  });
  it('stays silent without the marker, for older tags, or repeat tags', () => {
    assert.deepEqual(
      shouldNotifyRelease({ tag: 'v3.3.0.42', body: 'no marker' }, '3.2.0', ''),
      { notify: false }
    );
    assert.deepEqual(
      shouldNotifyRelease(marked('v3.2.0.41'), '3.3.0', ''),
      { notify: false }
    );
    assert.deepEqual(
      shouldNotifyRelease(marked('v3.3.0.42'), '3.2.0', 'v3.3.0.42'),
      { notify: false }
    );
    assert.deepEqual(
      shouldNotifyRelease(marked('not-a-version'), '3.2.0', ''),
      { notify: false }
    );
  });
});

describe('groupEntriesByMonth', () => {
  it('groups rows across months in ascending order with labels', () => {
    const groups = groupEntriesByMonth([
      ['2026-09-29', { cow: 1, buffalo: 0 }],
      ['2026-08-31', { cow: 2, buffalo: 1 }],
      ['2026-09-01', { cow: 0, buffalo: 3 }],
    ]);
    assert.deepEqual(groups.map((g) => g.key), ['2026-08', '2026-09']);
    assert.equal(groups[0].label, 'August 2026');
    assert.equal(groups[1].label, 'September 2026');
    assert.deepEqual(groups[0].rows, [[
      '2026-08-31',
      { cow: 2, buffalo: 1 },
    ]]);
    assert.deepEqual(
      groups[1].rows.map(([d]) => d),
      ['2026-09-29', '2026-09-01'],
    );
  });

  it('returns an empty array for empty input', () => {
    assert.deepEqual(groupEntriesByMonth([]), []);
  });
});

describe('monthLabel', () => {
  it('renders "September 2026" style labels', () => {
    assert.equal(monthLabel('2026-09'), 'September 2026');
    assert.equal(monthLabel('2026-01'), 'January 2026');
  });
});

describe('formatDDMMYYYY', () => {
  it('converts YYYY-MM-DD to DD-MM-YYYY', () => {
    assert.equal(formatDDMMYYYY('2026-09-29'), '29-09-2026');
    assert.equal(formatDDMMYYYY('2026-01-05'), '05-01-2026');
  });
});

describe('formatTime12h', () => {
  it('formats epoch-ms timestamps as HH:MM AM/PM', () => {
    assert.equal(formatTime12h(new Date(2026, 8, 29, 8, 5).getTime()), '08:05 AM');
    assert.equal(formatTime12h(new Date(2026, 8, 29, 0, 15).getTime()), '12:15 AM');
    assert.equal(formatTime12h(new Date(2026, 8, 29, 13, 45).getTime()), '01:45 PM');
    assert.equal(formatTime12h(new Date(2026, 8, 29, 12, 0).getTime()), '12:00 PM');
  });

  it("returns '--' for missing or invalid timestamps", () => {
    for (const bad of [null, undefined, NaN, Infinity, 'junk', {}]) {
      assert.equal(formatTime12h(bad), '--', `expected -- for ${String(bad)}`);
    }
  });
});

describe('sanitizeData savedAt', () => {
  it('preserves a numeric save timestamp, drops garbage', () => {
    const out = sanitizeData({
      '2026-09-29': { cow: 1, buffalo: 0, savedAt: 1759144800000 },
      '2026-09-28': { cow: 1, buffalo: 0, savedAt: NaN },
      '2026-09-27': { cow: 1, buffalo: 0, savedAt: 'yesterday' },
    });
    assert.equal(out['2026-09-29'].savedAt, 1759144800000);
    assert.ok(!('savedAt' in out['2026-09-28']));
    assert.ok(!('savedAt' in out['2026-09-27']));
  });
});
