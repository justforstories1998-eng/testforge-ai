/**
 * Playwright TypeScript spec generator for Test-CaseAI.
 *
 * Converts the flat row format used by the app:
 *   - header rows: { workItemType: 'Test Case', title, scenarioType, ... }
 *   - step rows:   { testStep, stepAction, stepExpected, scenarioType, ... }
 * into grouped scenarios, then into a runnable `*.spec.ts` file.
 *
 * Every step emits REAL executable Playwright code (no TODO-only stubs).
 * Shared helpers (fillField / clickButton / expectTextVisible) try several
 * locator strategies, so the spec runs against most apps as-is — the user
 * only adjusts the /pattern/ and value marked with ADJUST.
 * Each code line is preceded by a `WHY` comment explaining what it does.
 */

/**
 * @typedef {Object} Scenario
 * @property {string} title
 * @property {string} scenarioType
 * @property {string} areaPath
 * @property {string} assignedTo
 * @property {string} priority
 * @property {string} state
 * @property {Array<{action: string, expected: string}>} steps
 */

/**
 * Group flat export rows into scenarios.
 * Handles: normal header+steps shape, header-only rows,
 * orphan step rows (no preceding header), and empty input.
 */
export function groupScenarios(rows) {
  const safe = Array.isArray(rows) ? rows : [];
  const scenarios = [];
  let current = null;

  const pushCurrent = () => {
    if (current) scenarios.push(current);
    current = null;
  };

  safe.forEach((row) => {
    const isHeader =
      (row.workItemType || '').toLowerCase() === 'test case' ||
      Boolean(row.title && !row.testStep && !row.stepAction && !row.stepExpected);

    if (isHeader) {
      pushCurrent();
      current = {
        title: (row.title || 'Untitled scenario').trim() || 'Untitled scenario',
        scenarioType: row.scenarioType || 'Positive',
        areaPath: row.areaPath || '',
        assignedTo: row.assignedTo || '',
        priority: row.priority || '',
        state: row.state || '',
        steps: [],
      };
    } else if (row.stepAction || row.stepExpected || row.testStep) {
      // Step row. If there is no open header, create a fallback scenario
      // so orphan steps are never dropped silently.
      if (!current) {
        current = {
          title: 'Verify untitled scenario',
          scenarioType: row.scenarioType || 'Positive',
          areaPath: row.areaPath || '',
          assignedTo: row.assignedTo || '',
          priority: row.priority || '',
          state: row.state || '',
          steps: [],
        };
      }
      current.steps.push({
        action: (row.stepAction || `Step ${row.testStep || current.steps.length + 1}`).trim(),
        expected: (row.stepExpected || 'Verify the expected outcome.').trim(),
      });
    }
  });
  pushCurrent();

  // Guarantee at least one scenario so the spec file is never empty.
  if (scenarios.length === 0 && safe.length > 0) {
    scenarios.push({
      title: 'Verify generated scenario',
      scenarioType: 'Positive',
      areaPath: '',
      assignedTo: '',
      priority: '',
      state: '',
      steps: [{ action: 'Open the application', expected: 'Application loads successfully.' }],
    });
  }

  return scenarios;
}

/** Escape a string for use inside a single-quoted TS string literal. */
function esc(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ');
}

/** Escape a string for use inside a RegExp literal. */
function escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * Turn a human phrase into a tolerant regex source: case-insensitive
 * matching is done via the /i flag, whitespace runs match any spacing.
 * e.g. "Sign in" -> "sign\s+in"
 */
function toPattern(phrase) {
  const words = String(phrase || '')
    .split(/\s+/)
    .map((w) => escapeRegExp(w))
    .filter(Boolean);
  return words.join('\\s+') || '.+';
}

/** Make a filesystem-safe kebab-case file name. */
export function toSpecFileName(title, fallback = 'test-caseai-generated') {
  const slug = String(title || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const base = slug || fallback;
  return base.endsWith('.spec.ts') ? base : `${base}.spec.ts`;
}

// ─── Natural-language understanding ──────────────────────────────────

function extractQuoted(text) {
  const m = String(text || '').match(/["“”'‘’]([^"“”'‘’]{1,60})["“”'‘’]/);
  return m ? m[1].trim() : '';
}

const STOPWORDS = new Set(
  'the,a,an,and,or,for,with,that,this,from,into,upon,after,before,when,then,than,are,is,was,were,be,been,being,will,would,should,could,can,does,doing,done,have,has,had,user,users,system,page,field,button,form,message,properly,correctly,successfully,valid,invalid,expected,verify,displays,displayed,shows,shown,appears,appropriate,without,within,click,enter,visible,still,back'.split(
    ','
  )
);

/** Pick up to `max` significant keywords from free text for a text assertion. */
function keywords(text, max = 3) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, max);
}

const RE_NAVIGATE = /navigat|open|goto|go to|visit|launch|load|landing/i;
const RE_FILL = /typ|enter|fill|input|provide|supply/i;
const RE_CLICK = /click|press|tap|hit|submit|choose|select button/i;
const RE_SELECT = /dropdown|drop-down|combo|select.+option|choose.+from/i;
const RE_CHECK = /checkbox|radio|toggle|switch|tick|untick|check the|uncheck/i;
const RE_UPLOAD = /upload|attach|browse.+file|choose.+file/i;
const RE_ASSERT = /verify|assert|check|expect|validate|confirm|ensure|visible|display|shows|appears|redirect|should/i;
const RE_NEGATIVE = /error|invalid|reject|denied|block|fail|required|wrong|incorrect|unauthoriz|forbidden|not allowed|remain/i;

/**
 * True when the text describes a rejection. Guards against false hits like
 * "accepted without errors" or "no validation errors", which are POSITIVE.
 */
function isNegativeOutcome(text) {
  const t = String(text || '');
  if (/without.+error|no.+error|error.?free|not.+error/i.test(t)) return false;
  return RE_NEGATIVE.test(t);
}

const PATH_HINTS = [
  { keys: [/log ?in|sign ?in|auth/i], path: '/login', keyword: 'login' },
  { keys: [/sign ?up|register|create account/i], path: '/register', keyword: 'register' },
  { keys: [/dashboard/i], path: '/dashboard', keyword: 'dashboard' },
  { keys: [/checkout/i], path: '/checkout', keyword: 'checkout' },
  { keys: [/cart|basket/i], path: '/cart', keyword: 'cart' },
  { keys: [/search/i], path: '/search', keyword: 'search' },
  { keys: [/profile|account settings/i], path: '/profile', keyword: 'profile' },
  { keys: [/settings/i], path: '/settings', keyword: 'settings' },
  { keys: [/admin/i], path: '/admin', keyword: 'admin' },
  { keys: [/forgot|reset password/i], path: '/forgot-password', keyword: 'password' },
];

// Longest keys first so "confirm password" wins over "password".
const KNOWN_FIELDS = [
  { keys: ['confirm password'], label: 'confirm password', value: 'SecurePass123!', invalid: 'Mismatch456?' },
  { keys: ['new password'], label: 'new password', value: 'NewSecurePass123!', invalid: '123' },
  { keys: ['password', 'passcode'], label: 'password', value: 'SecurePass123!', invalid: '123' },
  { keys: ['email', 'e-mail'], label: 'email', value: 'test.user@example.com', invalid: 'not-an-email' },
  { keys: ['user name', 'username'], label: 'user name', value: 'testuser', invalid: 'a' },
  { keys: ['first name'], label: 'first name', value: 'Test', invalid: '' },
  { keys: ['last name'], label: 'last name', value: 'User', invalid: '' },
  { keys: ['full name', 'your name'], label: 'full name', value: 'Test User', invalid: '' },
  { keys: ['phone', 'mobile', 'contact number'], label: 'phone', value: '5550101234', invalid: 'abc' },
  { keys: ['otp', 'verification code', 'one-time'], label: 'verification code', value: '123456', invalid: '000' },
  { keys: ['search'], label: 'search', value: 'test query', invalid: '' },
  { keys: ['address'], label: 'address', value: '123 Test Street', invalid: '' },
  { keys: ['city'], label: 'city', value: 'Springfield', invalid: '' },
  { keys: ['zip', 'postal', 'postcode'], label: 'ZIP code', value: '12345', invalid: 'abc' },
  { keys: ['country'], label: 'country', value: 'United States', invalid: '' },
  { keys: ['card number', 'credit card', 'card'], label: 'card number', value: '4111111111111111', invalid: '1234' },
  { keys: ['expiry', 'expiration'], label: 'expiry date', value: '12/30', invalid: '13/99' },
  { keys: ['cvv', 'cvc', 'security code'], label: 'CVC', value: '123', invalid: '1' },
  { keys: ['date of birth', 'dob'], label: 'date of birth', value: '1990-01-15', invalid: '' },
  { keys: ['date'], label: 'date', value: '2026-09-18', invalid: '' },
  { keys: ['quantity', 'amount', 'price', 'number of'], label: 'quantity', value: '2', invalid: '-1' },
  { keys: ['company', 'organisation', 'organization'], label: 'company', value: 'Acme Inc', invalid: '' },
  { keys: ['title', 'subject'], label: 'title', value: 'Test title', invalid: '' },
  { keys: ['comment', 'message', 'description', 'notes', 'feedback', 'review'], label: 'message', value: 'This is an automated test message.', invalid: '' },
];

const KNOWN_BUTTONS = [
  'sign in', 'log in', 'login', 'sign up', 'register', 'submit', 'save', 'continue',
  'search', 'add', 'create', 'delete', 'remove', 'confirm', 'cancel', 'close',
  'pay', 'checkout', 'apply', 'filter', 'download', 'upload', 'send', 'update',
  'edit', 'next', 'back', 'ok',
];

function detectField(action) {
  const text = String(action || '').toLowerCase();
  const sorted = [...KNOWN_FIELDS].sort((a, b) => b.keys[0].length - a.keys[0].length);
  for (const field of sorted) {
    if (field.keys.some((k) => text.includes(k))) return field;
  }
  return null;
}

function detectButton(action) {
  const quoted = extractQuoted(action);
  if (quoted && quoted.length <= 30) return quoted;
  const text = String(action || '').toLowerCase();
  for (const b of KNOWN_BUTTONS) {
    if (text.includes(b)) return b;
  }
  const m = String(action || '').match(
    /(?:click|press|tap|hit|submit|clicks|presses)\s+(?:the\s+|on\s+|a\s+|an\s+)?([a-z0-9][a-z0-9\s&+/-]{1,28}?)(?:\s+(button|link|icon|tab|menu|option|tile|card))?\s*(?:\.|$| to| and| with)/i
  );
  if (m) return m[1].trim();
  return 'Submit';
}

function guessPath(action) {
  const text = String(action || '');
  for (const hint of PATH_HINTS) {
    if (hint.keys.some((re) => re.test(text))) return hint;
  }
  return null;
}

// ─── Code emitters (each returns real, runnable lines) ───────────────

const IND = '      '; // inside test.step body

function whyComment(text) {
  return `${IND}// WHY: ${text}`;
}

function assertionForExpected(expected, action) {
  const lines = [];
  const quoted = extractQuoted(expected) || extractQuoted(action);
  if (isNegativeOutcome(`${expected} ${action}`)) {
    lines.push(
      whyComment(
        "expect().toBeVisible() auto-retries until the element appears — this is how Playwright waits without sleep()."
      ),
      whyComment('We look for an error message because the expected outcome describes a rejection.'),
      `${IND}await expect(page.getByText(/error|invalid|required|denied|incorrect|failed/i).first()).toBeVisible();`
    );
    return lines;
  }
  if (/url|redirect/i.test(expected)) {
    const hint = guessPath(`${expected} ${action}`);
    const pattern = hint ? toPattern(hint.keyword) : '.+';
    lines.push(
      whyComment('toHaveURL asserts the browser actually navigated — stronger than checking text alone.'),
      `${IND}await expect(page).toHaveURL(/${pattern}/i);`
    );
    return lines;
  }
  if (/title/i.test(expected)) {
    const kws = keywords(expected, 2);
    const pattern = kws.length ? toPattern(kws.join(' ')) : '.+';
    lines.push(
      whyComment("toHaveTitle reads document.title — the tab text set by the app's router."),
      `${IND}await expect(page).toHaveTitle(/${pattern}/i);`
    );
    return lines;
  }
  const countMatch = String(expected).match(/(\d+)\s*(results?|items?|rows?|records?|entries|list)/i);
  if (countMatch) {
    lines.push(
      whyComment('toHaveCount polls the list until exactly N rows render (handles async loading).'),
      whyComment('ADJUST: if your list is not <li> elements, point the locator at your row selector.'),
      `${IND}await expect(page.getByRole('listitem')).toHaveCount(${countMatch[1]});`
    );
    return lines;
  }
  if (quoted) {
    lines.push(
      whyComment('getByText + toBeVisible asserts the user-facing message actually rendered on screen.'),
      `${IND}await expectTextVisible(page, /${toPattern(quoted)}/i);`
    );
    return lines;
  }
  const kws = keywords(expected, 3);
  if (kws.length) {
    lines.push(
      whyComment('We match ANY of the most distinctive words (alternation) — exact copy changes often, and all-words-in-order would be too brittle.'),
      `${IND}await expectTextVisible(page, /${kws.map(toPattern).join('|')}/i);`
    );
    return lines;
  }
  return lines;
}

function codeForStep(step, ctx) {
  const { action, expected } = step;
  const lines = [];
  const combined = `${action} ${expected}`;

  // 1. File upload — needs the real setInputFiles call.
  if (RE_UPLOAD.test(action)) {
    const field = detectField(action);
    const label = field ? field.label : extractQuoted(action) || 'file';
    lines.push(
      whyComment('setInputFiles simulates a real file-picker selection on the <input type="file">.'),
      whyComment('We pass the file inline (name + buffer) so no fixture file needs to exist on disk.'),
      whyComment('ADJUST: change the /pattern/ to your upload field label.'),
      `${IND}await page.getByLabel(/${toPattern(label)}/i).setInputFiles({`,
      `${IND}  name: 'sample.png',`,
      `${IND}  mimeType: 'image/png',`,
      `${IND}  // 1x1 transparent PNG — replace the base64 with real bytes if the app validates content.`,
      `${IND}  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),`,
      `${IND}});`
    );
    const extra = assertionForExpected(expected, '');
    if (extra.length) lines.push(...extra);
    return lines;
  }

  // 2. Navigation.
  if (RE_NAVIGATE.test(action)) {
    let path;
    let pathNote;
    if (ctx.isFirst) {
      path = ctx.baseURL;
      pathNote = 'First step: we start from the Base URL you set in the export dialog.';
    } else {
      const hint = guessPath(action);
      if (hint) {
        path = hint.path;
        pathNote = `We guessed '${hint.path}' from the word '${hint.keyword}' in the step.`;
      } else {
        path = ctx.baseURL;
        pathNote = 'No destination page was named, so we reuse the Base URL.';
      }
    }
    lines.push(
      whyComment(`${pathNote} page.goto loads the page and waits for the load event automatically.`),
      whyComment('ADJUST: change the path below if your route differs.'),
      `${IND}await page.goto('${esc(path)}');`,
      whyComment("waitForLoadState('domcontentloaded') pauses until the DOM is ready, so fills/clicks don't race the render."),
      `${IND}await page.waitForLoadState('domcontentloaded');`
    );
    const extra = assertionForExpected(expected, '');
    if (extra.length) lines.push(...extra);
    return lines;
  }

  // 3. Checkbox / radio / toggle.
  if (RE_CHECK.test(action)) {
    const quoted = extractQuoted(action);
    const field = detectField(action);
    const name = quoted || (field ? field.label : 'option');
    const uncheck = /uncheck|untick|turn off|disable/i.test(action);
    lines.push(
      whyComment(
        "getByRole targets the accessibility tree (like a screen reader) — it survives CSS/class refactors that break CSS selectors."
      ),
      whyComment('ADJUST: change the /pattern/ to the checkbox accessible name.'),
      `${IND}await page.getByRole('checkbox', { name: /${toPattern(name)}/i }).first().${uncheck ? 'uncheck' : 'check'}();`
    );
    const extra = assertionForExpected(expected, '');
    if (extra.length) lines.push(...extra);
    return lines;
  }

  // 4. Dropdown select.
  if (RE_SELECT.test(action)) {
    const field = detectField(action);
    const label = field ? field.label : extractQuoted(action) || 'option';
    const option = extractQuoted(expected) || extractQuoted(action) || 'Option 1';
    lines.push(
      whyComment('selectOption drives a native <select> by visible label — the same value a real user picks.'),
      whyComment('ADJUST: change the label /pattern/ and option text to your field.'),
      `${IND}await page.getByLabel(/${toPattern(label)}/i).selectOption({ label: '${esc(option)}' });`
    );
    const extra = assertionForExpected(expected, '');
    if (extra.length) lines.push(...extra);
    return lines;
  }

  // 5. Typing into a field.
  if (RE_FILL.test(action)) {
    const field = detectField(action);
    const negative = isNegativeOutcome(combined);
    const emptyTest = /empty|blank|clear|no input|without (entering|typing|filling)/i.test(combined);
    let label;
    let value;
    if (field) {
      label = field.label;
      const quoted = extractQuoted(action);
      if (emptyTest) {
        value = '';
      } else if (quoted) {
        const looksLikeFieldName = new RegExp(field.label, 'i').test(quoted) && !/[@.]/.test(quoted);
        if (looksLikeFieldName) {
          value = negative && field.invalid !== '' ? field.invalid : field.value;
        } else {
          value = quoted;
        }
      } else if (negative && field.invalid !== '') {
        value = field.invalid;
      } else {
        value = field.value;
      }
    } else {
      const quoted = extractQuoted(action);
      label = 'field';
      value = emptyTest ? '' : quoted || 'Test value';
    }
    lines.push(
      whyComment('fillField tries label → placeholder → textbox role, because apps associate labels differently.'),
      whyComment('fill() clears the field first, then types — equivalent to select-all + type.'),
      whyComment(`ADJUST: change /${toPattern(label)}/i and the value to your app's field and data.`),
      `${IND}await fillField(page, /${toPattern(label)}/i, '${esc(value)}');`
    );
    // A successful input shows NO validation error — asserting their absence
    // is the meaningful check (the literal words of "accepted" never render).
    const hasStrongSignal =
      extractQuoted(expected) ||
      isNegativeOutcome(combined) ||
      /url|redirect|title/i.test(expected) ||
      /\d+\s*(results?|items?|rows?|records?|entries|list)/i.test(expected);
    if (hasStrongSignal) {
      const extra = assertionForExpected(expected, '');
      if (extra.length) lines.push(...extra);
    } else {
      lines.push(
        whyComment('A valid input shows NO validation error — asserting zero error messages is the real check here.'),
        `${IND}await expect(page.getByText(/error|invalid|required/i)).toHaveCount(0);`
      );
    }
    return lines;
  }

  // 6. Clicking a button / link.
  if (RE_CLICK.test(action)) {
    const name = detectButton(action);
    lines.push(
      whyComment("clickButton tries button role → link role → text, so <button>, <a> and clickable divs all work."),
      whyComment('Playwright auto-waits for the element to be visible, stable and enabled before clicking.'),
      whyComment(`ADJUST: change /${toPattern(name)}/i to your control's accessible name.`),
      `${IND}await clickButton(page, /${toPattern(name)}/i);`
    );
    const extra = assertionForExpected(expected, '');
    if (extra.length) lines.push(...extra);
    else
      lines.push(
        whyComment('Outcome check lives in the next step — this step only performs the click.')
      );
    return lines;
  }

  // 7. Pure assertion / verification step.
  if (RE_ASSERT.test(combined)) {
    const assertion = assertionForExpected(expected, action);
    if (assertion.length) {
      lines.push(...assertion);
      return lines;
    }
  }

  // 8. Fallback: assert on the expected outcome's keywords; always runnable.
  const fallbackAssertion = assertionForExpected(expected, action);
  if (fallbackAssertion.length) {
    lines.push(
      whyComment(`Generic step ('${esc(action.slice(0, 60))}...') — we verify its expected outcome text directly.`),
      ...fallbackAssertion
    );
  } else {
    lines.push(
      whyComment('No assertable text was found in this step, so we sync on page load and let the next step assert.'),
      `${IND}await page.waitForLoadState('domcontentloaded');`
    );
  }
  return lines;
}

// ─── Spec assembly ───────────────────────────────────────────────────

const HELPERS = `// ─── Resilient helpers: try several locator strategies so the spec ───
// ─── runs against most apps without editing selectors. ───────────────

// WHY helper: real apps label the same field differently (<label>, 
// placeholder, or aria-label). Trying all three beats a brittle CSS selector.
async function fillField(page: Page, name: RegExp, value: string) {
  const field = page
    .getByLabel(name)
    .or(page.getByPlaceholder(name))
    .or(page.getByRole('textbox', { name }));
  // WHY .first(): several matches can exist (e.g. mobile + desktop markup) —
  // the first visible one is the one a user would use.
  await field.first().fill(value);
}

// WHY helper: clickable controls may be <button>, <a>, or styled <div>s.
// getByRole queries the accessibility tree, so renames in CSS won't break us.
async function clickButton(page: Page, name: RegExp) {
  const control = page
    .getByRole('button', { name })
    .or(page.getByRole('link', { name }))
    .or(page.getByText(name));
  await control.first().click();
}

// WHY helper: asserting a case-insensitive substring avoids failures from
// trivial copy changes (punctuation, extra words, capitalisation).
async function expectTextVisible(page: Page, pattern: RegExp) {
  // WHY .first(): the same copy can appear twice (toast + inline message).
  // WHY toBeVisible: auto-retries until timeout — no manual sleep() needed.
  await expect(page.getByText(pattern).first()).toBeVisible();
}`;

/**
 * Generate a complete, runnable Playwright TypeScript spec file.
 *
 * @param {Array} testCases flat rows from the app
 * @param {Object} [options]
 * @param {string} [options.describeTitle] top-level describe block name
 * @param {string} [options.baseURL] start page for the first navigation step
 */
export function generatePlaywrightSpec(testCases, options = {}) {
  const scenarios = groupScenarios(testCases);
  const timestamp = new Date().toISOString();
  const describeTitle = (options.describeTitle || 'Test-CaseAI — Generated Suite').trim();
  const baseURL = (options.baseURL || '/').trim() || '/';
  const totalSteps = scenarios.reduce((n, s) => n + s.steps.length, 0);

  const scenarioBlocks = scenarios
    .map((scenario, index) => {
      const tag = String(scenario.scenarioType || 'Positive')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      const testName = `${scenario.title} @${tag || 'positive'}`;

      const stepBlocks =
        scenario.steps.length > 0
          ? scenario.steps
              .map((step, i) => {
                const codeLines = codeForStep(step, {
                  isFirst: i === 0,
                  baseURL,
                  scenarioType: scenario.scenarioType,
                });
                return [
                  `    // Step ${i + 1}: ${esc(step.action)}`,
                  `    // Expected: ${esc(step.expected)}`,
                  `    await test.step('Step ${i + 1}: ${esc(step.action)}', async () => {`,
                  ...codeLines,
                  `    });`,
                ].join('\n');
              })
              .join('\n\n')
          : [
              `    await test.step('Placeholder step', async () => {`,
              `${IND}// WHY: this scenario had no steps — keep the suite green while you add your own.`,
              `${IND}await page.waitForLoadState('domcontentloaded');`,
              `    });`,
            ].join('\n');

      return [
        `  // ${esc(`Scenario ${index + 1}/${scenarios.length} | Type: ${scenario.scenarioType || 'Positive'}`)}${
          scenario.priority ? esc(` | Priority: ${scenario.priority}`) : ''
        }${scenario.areaPath ? esc(` | Area: ${scenario.areaPath}`) : ''}${
          scenario.assignedTo ? esc(` | Owner: ${scenario.assignedTo}`) : ''
        }`,
        `  test('${esc(testName)}', async ({ page }) => {`,
        stepBlocks,
        `  });`,
      ].join('\n');
    })
    .join('\n\n');

  return `/**
 * Auto-generated by Test-CaseAI on ${timestamp}.
 * ${scenarios.length} scenario(s), ${totalSteps} step(s).
 *
 * RUN IT
 *   1. npm init playwright@latest   (once per project)
 *      ...or: npm i -D @playwright/test && npx playwright install
 *   2. Save this file as tests/<name>.spec.ts
 *   3. npx playwright test
 *
 * CUSTOMISE
 *   - Only touch lines marked ADJUST (the /pattern/ and 'value').
 *   - Locators use accessible roles, so most apps run with zero edits.
 *
 * Docs: https://playwright.dev/docs/writing-tests
 */
import { test, expect, type Page } from '@playwright/test';

// WHY: generous per-action timeout for slow CI / staging environments.
test.use({ actionTimeout: 10_000 });

${HELPERS}

test.describe('${esc(describeTitle)}', () => {
${scenarioBlocks}
});
`;
}

export default generatePlaywrightSpec;
