const EXCEL_DATA_URL =
  'https://github.com/UniversitedesTalents/testcode/raw/refs/heads/main/DATA-HUBBY-AD.xlsx';
const DEFAULT_DAY_IDS = ['17', '18', '19', '20', '21'];
const STATIC_DATA_URL = 'assets/js/data.json';

const QUICK_ACTIONS = [
  {
    id: 'programme',
    labels: {
      fr: 'Programme',
      en: 'Program',
    },
  },
  {
    id: 'groupes',
    labels: {
      fr: 'Groupes',
      en: 'Groups',
    },
  },
  {
    id: 'activities',
    labels: {
      fr: 'Activités',
      en: 'Activities',
    },
  },
  {
    id: 'dresscode',
    labels: {
      fr: 'Dress code',
      en: 'Dress code',
    },
  },
  {
    id: 'clubmedlive',
    labels: {
      fr: 'Club Med Live',
      en: 'Club Med Live',
    },
  },
];

const KEYWORDS = {
  fr: {
    programme: ['programme', 'planning', 'agenda', 'horaires'],
    groupes: ['groupe', 'groupes', 'équipe', 'contacts'],
    activities: ['activité', 'activités', 'atelier', 'ateliers'],
    dresscode: ['dress code', 'tenue', 'code vestimentaire'],
    clubmedlive: ['club med live', 'show', 'concert', 'soirée'],
  },
  en: {
    programme: ['program', 'programme', 'schedule', 'agenda'],
    groupes: ['group', 'groups', 'team', 'teams'],
    activities: ['activities', 'activity', 'workshop', 'workshops'],
    dresscode: ['dress code', 'outfit', 'look'],
    clubmedlive: ['club med live', 'show', 'concert', 'live'],
  },
};

const UI_TEXT = {
  fr: {
    placeholder: 'Écrivez votre message...',
    send: 'Envoyer',
    typing: 'Hubby tape…',
    defaultLink: 'Ouvrir le lien',
    welcome:
      'Bonjour ! Choisis une date puis une action rapide pour découvrir le contenu des Academy Days.',
  },
  en: {
    placeholder: 'Type your message…',
    send: 'Send',
    typing: 'Hubby is typing…',
    defaultLink: 'Open link',
    welcome:
      'Hello! Pick a date and a quick action to explore the Academy Days content.',
  },
};

const FALLBACK_MESSAGES = {
  fr: "Je n’ai pas encore cette information, mais elle arrive très vite ! N’hésite pas à explorer une autre rubrique en attendant.",
  en: "I don’t have the information for this yet, but it’s coming soon! Feel free to explore another section while waiting.",
};

const POPULATION_PROFILES = {
  cdv_lc_lkt: {
    label: {
      fr: 'CDV / CDG / LC / LKT',
      en: 'CDV / CDG / LC / LKT',
    },
    populations: ['ALL', 'CDV', 'CDG', 'LC', 'LKT', 'CDV/CDG/LC/LKT'],
  },
  mkt: {
    label: {
      fr: 'équipe Marketing',
      en: 'Marketing team',
    },
    populations: ['ALL', 'MKT'],
  },
  mktplus: {
    label: {
      fr: 'équipe MKT+',
      en: 'MKT+ team',
    },
    populations: ['ALL', 'MKT+'],
  },
};

let xlsxLibraryPromise = null;

async function loadStaticFallbackData() {
  try {
    const response = await fetch(STATIC_DATA_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch fallback data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Hubby fallback data error', error);
    return null;
  }
}

async function ensureXLSXLoaded() {
  if (typeof window !== 'undefined' && window.XLSX) {
    return window.XLSX;
  }

  if (!xlsxLibraryPromise) {
    xlsxLibraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.async = true;
      script.onload = () => {
        if (window.XLSX) {
          resolve(window.XLSX);
        } else {
          reject(new Error('XLSX library did not load correctly.'));
        }
      };
      script.onerror = () => reject(new Error('Unable to load XLSX library.'));
      document.head.appendChild(script);
    });
  }

  return xlsxLibraryPromise;
}

function excelSerialToDate(serial) {
  if (typeof serial !== 'number' || Number.isNaN(serial)) {
    return null;
  }
  const excelEpoch = Date.UTC(1899, 11, 30);
  const milliseconds = serial * 24 * 60 * 60 * 1000;
  return new Date(excelEpoch + milliseconds);
}

function formatDayLabel(date, lang, fallbackDay) {
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    try {
      return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
        day: 'numeric',
        month: 'long',
      }).format(date);
    } catch (error) {
      // continue to fallback below
    }
  }
  if (lang === 'fr') {
    return `${fallbackDay} novembre`;
  }
  return `${fallbackDay} November`;
}

function normaliseString(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function normaliseLanguage(value) {
  const language = normaliseString(value).toLowerCase();
  if (language.startsWith('fr')) {
    return 'fr';
  }
  if (language.startsWith('en')) {
    return 'en';
  }
  return '';
}

function extractPopulationTokens(value) {
  const raw = normaliseString(value);
  if (!raw) {
    return [];
  }
  return raw
    .replace(/&/g, '/')
    .split(/[\\/;,]|\band\b/i)
    .map((token) => token.replace(/\s+/g, '').toUpperCase())
    .filter(Boolean);
}

function buildPopulationSet(profileKey) {
  const profile = POPULATION_PROFILES[profileKey];
  const base = new Set(['ALL']);
  if (!profile) {
    return base;
  }
  profile.populations.forEach((population) => {
    extractPopulationTokens(population).forEach((token) => base.add(token));
  });
  return base;
}

function isValidUrl(url) {
  const value = normaliseString(url);
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function getTimeSortValue(time) {
  const text = normaliseString(time).toLowerCase();
  if (!text) {
    return Number.MAX_SAFE_INTEGER;
  }

  const keywordOrder = {
    morning: 8 * 60,
    afternoon: 14 * 60,
    evening: 19 * 60,
    night: 22 * 60,
  };

  for (const [keyword, minutes] of Object.entries(keywordOrder)) {
    if (text.includes(keyword)) {
      return minutes;
    }
  }

  const match = text.match(/(\d{1,2})(?:[:h](\d{2}))?/);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  return hours * 60 + minutes;
}

function deduplicateEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = [entry.time, entry.title || entry.activity, entry.location, entry.description]
      .map((part) => normaliseString(part).toLowerCase())
      .join('|');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function formatProgramLine(entry) {
  const parts = [];
  if (entry.time) {
    parts.push(entry.time);
  }
  if (entry.activity || entry.title) {
    const title = entry.activity || entry.title;
    parts.push(parts.length ? `· ${title}` : title);
  }
  let line = parts.join(' ');
  if (entry.location) {
    line += ` (${entry.location})`;
  }
  if (entry.description) {
    line += ` — ${entry.description}`;
  }
  return line;
}

function formatActivityLine(entry) {
  const parts = [];
  if (entry.time) {
    parts.push(entry.time);
  }
  if (entry.category) {
    parts.push(parts.length ? `· ${entry.category}` : entry.category);
  }
  if (entry.title || entry.activity) {
    parts.push(parts.length ? `· ${entry.title || entry.activity}` : entry.title || entry.activity);
  }
  let line = parts.join(' ');
  if (entry.location) {
    line += ` (${entry.location})`;
  }
  if (entry.description) {
    line += ` — ${entry.description}`;
  }
  return line;
}

function formatLiveLine(entry) {
  const parts = [];
  if (entry.time) {
    parts.push(entry.time);
  }
  if (entry.artist) {
    parts.push(parts.length ? `· ${entry.artist}` : entry.artist);
  }
  let line = parts.join(' ');
  if (entry.location) {
    line += ` (${entry.location})`;
  }
  if (entry.description) {
    line += ` — ${entry.description}`;
  }
  return line;
}

function matchesPopulation(entry, populationSet) {
  if (!populationSet || !populationSet.size) {
    return true;
  }
  if (!entry || !entry.populationTokens || !entry.populationTokens.length) {
    return true;
  }
  if (entry.populationTokens.includes('ALL')) {
    return true;
  }
  return entry.populationTokens.some((token) => populationSet.has(token));
}

function preferLanguage(entries, lang) {
  if (!Array.isArray(entries)) {
    return [];
  }
  const primary = entries.filter((entry) => !entry.language || entry.language === lang);
  if (primary.length) {
    return primary;
  }
  const secondaryLang = lang === 'fr' ? 'en' : 'fr';
  return entries.filter((entry) => entry.language === secondaryLang || !entry.language);
}

function collectLink(entries, lang, fallbackLabel) {
  for (const entry of entries) {
    if (entry.link && isValidUrl(entry.link)) {
      let label = fallbackLabel;
      if (entry.linkLabel) {
        if (typeof entry.linkLabel === 'string') {
          label = entry.linkLabel || fallbackLabel;
        } else {
          label = entry.linkLabel?.[lang] || entry.linkLabel?.en || entry.linkLabel?.fr || entry.linkLabel?.default || fallbackLabel;
        }
      }
      return {
        url: entry.link,
        label,
      };
    }
  }
  return null;
}

function transformWorkbook(workbook) {
  const XLSX = window.XLSX;
  const sheetAliases = {
    program: ['Program', 'Programme', 'Agenda'],
    activities: ['Activities', 'Activités'],
    live: ['Club Med Live', 'Club Med Live '],
    groups: ['Groups', 'Groupes'],
    dress: ['Dress code', 'Dress Code', 'Dresscode'],
  };

  const dayInfo = {};
  const dayOrder = [];
  const dayMapping = new Map();
  let fallbackIndex = 0;

  function normaliseRow(row) {
    const normalised = {};
    Object.entries(row).forEach(([key, value]) => {
      if (!key) {
        return;
      }
      normalised[key.toString().trim().toLowerCase()] = value;
    });
    return normalised;
  }

  function getSheet(nameOptions) {
    const names = Array.isArray(nameOptions) ? nameOptions : [nameOptions];
    for (const name of names) {
      if (workbook.Sheets[name]) {
        return workbook.Sheets[name];
      }
    }
    return null;
  }

  function sheetToJson(nameOptions) {
    const sheet = getSheet(nameOptions);
    if (!sheet) {
      return [];
    }
    return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  }

  function registerDay(rawValue) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return null;
    }

    let key;
    if (rawValue instanceof Date) {
      key = rawValue.getTime();
    } else if (typeof rawValue === 'number') {
      key = rawValue;
    } else {
      key = normaliseString(rawValue);
    }

    if (dayMapping.has(key)) {
      return dayMapping.get(key);
    }

    let dateObject = null;
    let usedFallback = false;
    if (rawValue instanceof Date) {
      dateObject = rawValue;
    } else if (typeof rawValue === 'number' && !Number.isNaN(rawValue)) {
      dateObject = excelSerialToDate(rawValue);
    } else {
      const numeric = Number(rawValue);
      if (!Number.isNaN(numeric) && numeric > 0) {
        dateObject = excelSerialToDate(numeric);
      } else {
        const parsed = Date.parse(normaliseString(rawValue));
        if (!Number.isNaN(parsed)) {
          dateObject = new Date(parsed);
        }
      }
    }

    let dayId = null;
    if (dateObject instanceof Date && !Number.isNaN(dateObject.getTime())) {
      const day = dateObject.getUTCDate();
      const candidate = String(day);
      if (DEFAULT_DAY_IDS.includes(candidate)) {
        dayId = candidate;
      }
    }

    if (!dayId) {
      dayId = DEFAULT_DAY_IDS[fallbackIndex] || String(key);
      if (fallbackIndex < DEFAULT_DAY_IDS.length - 1) {
        fallbackIndex += 1;
      }
      usedFallback = true;
    }

    if (!dayInfo[dayId]) {
      dayInfo[dayId] = {
        raw: rawValue,
        date: dateObject,
        labels: {
          fr: formatDayLabel(usedFallback ? null : dateObject, 'fr', dayId),
          en: formatDayLabel(usedFallback ? null : dateObject, 'en', dayId),
        },
      };
      if (!dayOrder.includes(dayId)) {
        dayOrder.push(dayId);
      }
    }

    const record = { id: dayId, date: dateObject, raw: rawValue };
    dayMapping.set(key, record);
    return record;
  }

  const programEntries = {};
  const activityEntries = {};
  const liveEntries = {};
  const dressEntries = {};
  const groupsEntries = [];

  sheetToJson(sheetAliases.program)
    .map(normaliseRow)
    .forEach((row) => {
      const day = registerDay(row['date']);
      if (!day) {
        return;
      }
      const population = normaliseString(row['population']) || 'All';
      const entry = {
        dayId: day.id,
        time: normaliseString(row['time']),
        activity: normaliseString(row['activity']) || normaliseString(row['programme']),
        location: normaliseString(row['location']),
        description: normaliseString(row['description']),
        type: normaliseString(row['type']),
        language: normaliseLanguage(row['language']),
        populationRaw: population,
        populationTokens: extractPopulationTokens(population),
        link: normaliseString(row['link'] || row['external link'] || row['programme link'] || row['lien']),
        linkLabel: {
          fr: normaliseString(row['link label fr']),
          en: normaliseString(row['link label en']),
          default: normaliseString(row['link label']),
        },
      };
      if (!programEntries[day.id]) {
        programEntries[day.id] = [];
      }
      programEntries[day.id].push(entry);
    });

  sheetToJson(sheetAliases.activities)
    .map(normaliseRow)
    .forEach((row) => {
      const day = registerDay(row['date']);
      if (!day) {
        return;
      }
      const population = normaliseString(row['population']);
      const entry = {
        dayId: day.id,
        category: normaliseString(row['category']),
        activity: normaliseString(row['activity']),
        title: normaliseString(row['title']),
        time: normaliseString(row['time']),
        location: normaliseString(row['location']),
        description: normaliseString(row['description']),
        language: normaliseLanguage(row['language']),
        populationRaw: population,
        populationTokens: extractPopulationTokens(population),
        link: normaliseString(row['link'] || row['external link'] || row['lien']),
        linkLabel: {
          fr: normaliseString(row['link label fr']),
          en: normaliseString(row['link label en']),
          default: normaliseString(row['link label']),
        },
      };
      if (!activityEntries[day.id]) {
        activityEntries[day.id] = [];
      }
      activityEntries[day.id].push(entry);
    });

  sheetToJson(sheetAliases.live)
    .map(normaliseRow)
    .forEach((row) => {
      const day = registerDay(row['date']);
      if (!day) {
        return;
      }
      const entry = {
        dayId: day.id,
        artist: normaliseString(row['artist']),
        time: normaliseString(row['time']),
        location: normaliseString(row['location']),
        description: normaliseString(row['description']),
        language: normaliseLanguage(row['language']),
        link: normaliseString(row['link'] || row['external link'] || row['teaser'] || row['lien']),
        linkLabel: {
          fr: normaliseString(row['link label fr']),
          en: normaliseString(row['link label en']),
          default: normaliseString(row['link label']),
        },
      };
      if (!liveEntries[day.id]) {
        liveEntries[day.id] = [];
      }
      liveEntries[day.id].push(entry);
    });

  sheetToJson(sheetAliases.dress)
    .map(normaliseRow)
    .forEach((row) => {
      const day = registerDay(row['date']);
      if (!day) {
        return;
      }
      const language = normaliseLanguage(row['language']);
      if (!dressEntries[day.id]) {
        dressEntries[day.id] = {};
      }
      dressEntries[day.id][language || 'en'] = {
        dayId: day.id,
        theme: normaliseString(row['theme']) || normaliseString(row['dress code']) || normaliseString(row['code']),
        description: normaliseString(row['description']),
        link: normaliseString(row['link'] || row['external link'] || row['lien']),
        linkLabel: {
          fr: normaliseString(row['link label fr']),
          en: normaliseString(row['link label en']),
          default: normaliseString(row['link label']),
        },
      };
    });

  sheetToJson(sheetAliases.groups)
    .map(normaliseRow)
    .forEach((row) => {
      const population = normaliseString(row['population']);
      if (!population) {
        return;
      }
      const entry = {
        populationRaw: population,
        populationTokens: extractPopulationTokens(population),
        groupName: normaliseString(row['group name'] || row['group']),
        workshop: normaliseString(row['workshop/training name'] || row['workshop'] || row['training']),
        location: normaliseString(row['room/location'] || row['location']),
        description: normaliseString(row['description']),
        language: normaliseLanguage(row['language']),
        link: normaliseString(row['external link'] || row['link'] || row['lien']),
        linkLabel: {
          fr: normaliseString(row['link label fr']),
          en: normaliseString(row['link label en']),
          default: normaliseString(row['link label']),
        },
      };
      groupsEntries.push(entry);
    });

  return {
    dayInfo,
    dayOrder,
    program: programEntries,
    activities: activityEntries,
    live: liveEntries,
    dressCode: dressEntries,
    groups: groupsEntries,
    fallback: FALLBACK_MESSAGES,
  };
}

async function updateHubbyData() {
  const XLSX = await ensureXLSXLoaded();
  const response = await fetch(`${EXCEL_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch Excel data: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const data = transformWorkbook(workbook);
  console.log('Hubby data refreshed from Excel at', new Date().toLocaleString());
  return data;
}

if (typeof window !== 'undefined') {
  window.updateHubbyData = updateHubbyData;
}

document.addEventListener('DOMContentLoaded', () => {
  const chatWindow = document.getElementById('chatWindow');
  const dayFilter = document.getElementById('dayFilter');
  const quickActions = document.getElementById('quickActions');
  const chatInput = document.getElementById('chatInput');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const backButton = document.getElementById('backButton');
  const langButtons = Array.from(document.querySelectorAll('.lang-toggle button'));
  const populationKey = (document.body?.dataset?.population || 'cdv_lc_lkt').toLowerCase();

  if (!chatWindow || !dayFilter || !quickActions || !chatInput || !sendMessageBtn) {
    return;
  }

  const state = {
    lang: 'en',
    day: null,
    data: null,
    staticData: null,
    availableDays: [],
    populationKey,
    populationSet: buildPopulationSet(populationKey),
  };

  initialiseLanguage();
  attachEvents();
  loadData();

  function initialiseLanguage() {
    const storedLang = (localStorage.getItem('hubbyLang') || 'en').toLowerCase();
    state.lang = storedLang === 'fr' ? 'fr' : 'en';
    applyLanguage();
  }

  function applyLanguage() {
    chatInput.placeholder = UI_TEXT[state.lang].placeholder;
    sendMessageBtn.textContent = UI_TEXT[state.lang].send;
    langButtons.forEach((button) => {
      const lang = (button.dataset.lang || button.textContent || '').trim().toLowerCase();
      if (!lang) {
        return;
      }
      button.dataset.lang = lang;
      button.classList.toggle('is-active', lang === state.lang);
    });
    document.documentElement.setAttribute('lang', state.lang === 'fr' ? 'fr' : 'en');
  }

  function switchLanguage(nextLang) {
    if (state.lang === nextLang) {
      return;
    }
    state.lang = nextLang === 'en' ? 'en' : 'fr';
    localStorage.setItem('hubbyLang', state.lang);
    applyLanguage();
    renderDayButtons();
    renderQuickActions();
  }

  function attachEvents() {
    sendMessageBtn.addEventListener('click', handleUserMessage);
    chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleUserMessage();
      }
    });

    if (backButton) {
      backButton.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }

    dayFilter.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-day]');
      if (!button) {
        return;
      }
      const selectedDay = button.dataset.day;
      if (!selectedDay || selectedDay === state.day) {
        return;
      }
      state.day = selectedDay;
      updateDaySelection();
      renderQuickActions();
    });

    quickActions.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) {
        return;
      }
      const actionId = button.dataset.action;
      const label = button.textContent.trim();
      if (!actionId) {
        return;
      }
      appendUserMessage(label);
      respondToAction(actionId);
    });

    langButtons.forEach((button) => {
      const lang = (button.dataset.lang || button.textContent || '').trim().toLowerCase();
      if (!lang || !['fr', 'en'].includes(lang)) {
        return;
      }
      button.dataset.lang = lang;
      button.addEventListener('click', () => switchLanguage(lang));
    });
  }

  async function loadData() {
    try {
      state.data = await updateHubbyData();
    } catch (error) {
      console.error('Hubby data error', error);
      state.data = null;
      state.staticData = await loadStaticFallbackData();
    }

    if (state.data) {
      const dayIds = (state.data?.dayOrder?.length ? state.data.dayOrder : DEFAULT_DAY_IDS).filter((dayId) =>
        state.data?.dayInfo?.[dayId]
      );
      state.availableDays = dayIds.length ? dayIds : DEFAULT_DAY_IDS;
    } else if (state.staticData?.days) {
      state.availableDays = Object.keys(state.staticData.days)
        .map((dayId) => dayId.trim())
        .filter(Boolean)
        .sort((a, b) => Number(a) - Number(b));
    } else {
      state.availableDays = DEFAULT_DAY_IDS;
    }

    if (!state.day || !state.availableDays.includes(state.day)) {
      state.day = state.availableDays[0] || null;
    }

    renderDayButtons();
    renderQuickActions();

    if (state.data || state.staticData) {
      appendSystemMessage(UI_TEXT[state.lang].welcome);
    } else {
      appendSystemMessage(getFallbackMessage());
    }
  }

  function renderDayButtons() {
    dayFilter.innerHTML = '';
    if (!Array.isArray(state.availableDays)) {
      return;
    }
    state.availableDays.forEach((dayId) => {
      const info = state.data?.dayInfo?.[dayId];
      let label = info?.labels?.[state.lang] || info?.labels?.en || info?.labels?.fr;
      if (!label) {
        label = formatDayLabel(null, state.lang, dayId);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.day = dayId;
      button.textContent = label;
      button.className = 'day-pill';
      if (dayId === state.day) {
        button.classList.add('is-active');
      }
      dayFilter.appendChild(button);
    });
  }

  function updateDaySelection() {
    Array.from(dayFilter.children).forEach((child) => {
      child.classList.toggle('is-active', child.dataset.day === state.day);
    });
  }

  function renderQuickActions() {
    quickActions.innerHTML = '';
    QUICK_ACTIONS.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = action.id;
      button.textContent = action.labels[state.lang] || action.labels.fr || action.labels.en;
      button.className = 'quick-action-btn';
      quickActions.appendChild(button);
    });
  }

  function handleUserMessage() {
    const message = chatInput.value.trim();
    if (!message) {
      return;
    }
    chatInput.value = '';
    appendUserMessage(message);
    const detectedAction = detectAction(message);
    if (detectedAction) {
      respondToAction(detectedAction);
    } else {
      respondWithFallback();
    }
  }

  function detectAction(message) {
    const normalized = normalizeText(message);
    const languageKeywords = KEYWORDS[state.lang] || {};
    return Object.entries(languageKeywords).find(([action, keywords]) =>
      keywords.some((keyword) => normalized.includes(keyword))
    )?.[0];
  }

  function normalizeText(text) {
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  }

  function respondToAction(actionId) {
    if (state.data && state.day) {
      const handlers = {
        programme: buildProgrammeResponse,
        activities: buildActivitiesResponse,
        groupes: buildGroupsResponse,
        dresscode: buildDressCodeResponse,
        clubmedlive: buildLiveResponse,
      };

      const handler = handlers[actionId];
      if (!handler) {
        respondWithFallback();
        return;
      }

      const response = handler();
      if (!response) {
        respondWithFallback();
        return;
      }

      showTypingIndicator(() => {
        appendBotMessage(response);
      });
      return;
    }

    if (state.staticData && state.day) {
      const response = buildStaticResponse(actionId);
      if (response) {
        showTypingIndicator(() => {
          appendBotMessage(response);
        });
        return;
      }
    }

    respondWithFallback();
  }

  function buildProgrammeResponse() {
    const entries = preferLanguage(
      (state.data.program?.[state.day] || []).filter((entry) => matchesPopulation(entry, state.populationSet)),
      state.lang
    );
    if (!entries.length) {
      return null;
    }

    const sorted = deduplicateEntries(entries).sort((a, b) => getTimeSortValue(a.time) - getTimeSortValue(b.time));
    const dayLabel = state.data.dayInfo?.[state.day]?.labels?.[state.lang] || state.day;
    const populationLabel = POPULATION_PROFILES[state.populationKey]?.label?.[state.lang] || '';
    const message =
      state.lang === 'fr'
        ? `Voici ce que j’ai trouvé pour ${populationLabel || 'toi'} le ${dayLabel} :`
        : `Here’s what I found for ${populationLabel || 'you'} on ${dayLabel}:`;
    const details = sorted.map(formatProgramLine);
    const link = collectLink(sorted, state.lang, UI_TEXT[state.lang].defaultLink);

    return { message, details, link };
  }

  function buildActivitiesResponse() {
    const entries = preferLanguage(
      (state.data.activities?.[state.day] || []).filter((entry) => matchesPopulation(entry, state.populationSet)),
      state.lang
    );
    if (!entries.length) {
      return null;
    }

    const sorted = deduplicateEntries(entries).sort((a, b) => getTimeSortValue(a.time) - getTimeSortValue(b.time));
    const dayLabel = state.data.dayInfo?.[state.day]?.labels?.[state.lang] || state.day;
    const message =
      state.lang === 'fr'
        ? `Envie de bouger ? Voici les activités proposées le ${dayLabel} :`
        : `Ready for more? Here are the activities available on ${dayLabel}:`;
    const details = sorted.map(formatActivityLine);
    const link = collectLink(sorted, state.lang, UI_TEXT[state.lang].defaultLink);

    return { message, details, link };
  }

  function buildGroupsResponse() {
    const entries = preferLanguage(
      (state.data.groups || []).filter((entry) => matchesPopulation(entry, state.populationSet)),
      state.lang
    );
    if (!entries.length) {
      return null;
    }

    const populationLabel = POPULATION_PROFILES[state.populationKey]?.label?.[state.lang] || '';
    const message =
      state.lang === 'fr'
        ? `Voici les groupes et contacts pour ${populationLabel || 'ton équipe'} :`
        : `Here are the groups and key contacts for ${populationLabel || 'your team'}:`;
    const details = entries.map((entry) => {
      const fragments = [];
      if (entry.groupName) {
        fragments.push(entry.groupName);
      }
      if (entry.workshop) {
        fragments.push(entry.workshop);
      }
      if (entry.location) {
        fragments.push(entry.location);
      }
      if (entry.description) {
        fragments.push(entry.description);
      }
      return fragments.join(' · ');
    });
    const link = collectLink(entries, state.lang, UI_TEXT[state.lang].defaultLink);

    return { message, details, link };
  }

  function buildDressCodeResponse() {
    const dressData = state.data.dressCode?.[state.day];
    if (!dressData) {
      return null;
    }
    const entry = dressData[state.lang] || dressData.en || dressData.fr;
    if (!entry) {
      return null;
    }

    const dayLabel = state.data.dayInfo?.[state.day]?.labels?.[state.lang] || state.day;
    const message =
      state.lang === 'fr'
        ? `Dress code du ${dayLabel} : ${entry.theme}`
        : `Dress code for ${dayLabel}: ${entry.theme}`;
    const details = entry.description ? [entry.description] : null;
    const link = collectLink([entry], state.lang, UI_TEXT[state.lang].defaultLink);

    return { message, details, link };
  }

  function buildLiveResponse() {
    const entries = preferLanguage(state.data.live?.[state.day] || [], state.lang);
    if (!entries.length) {
      return null;
    }

    const sorted = deduplicateEntries(entries).sort((a, b) => getTimeSortValue(a.time) - getTimeSortValue(b.time));
    const dayLabel = state.data.dayInfo?.[state.day]?.labels?.[state.lang] || state.day;
    const message =
      state.lang === 'fr'
        ? `Line-up Club Med Live pour le ${dayLabel} :`
        : `Club Med Live line-up for ${dayLabel}:`;
    const details = sorted.map(formatLiveLine);
    const link = collectLink(sorted, state.lang, UI_TEXT[state.lang].defaultLink);

    return { message, details, link };
  }

  function respondWithFallback() {
    showTypingIndicator(() => {
      appendBotMessage({ message: getFallbackMessage() });
    });
  }

  function getFallbackMessage() {
    return (
      state.data?.fallback?.[state.lang] ||
      state.data?.fallback?.en ||
      state.data?.fallback?.fr ||
      state.staticData?.fallback?.[state.lang] ||
      state.staticData?.fallback?.en ||
      state.staticData?.fallback?.fr ||
      FALLBACK_MESSAGES[state.lang]
    );
  }

  function buildStaticResponse(actionId) {
    const dayData = state.staticData?.days?.[state.day];
    if (!dayData) {
      return null;
    }

    const entry = dayData[actionId];
    if (!entry) {
      return null;
    }

    const message = entry[state.lang] || entry.en || entry.fr;
    const detailsSource = entry.details?.[state.lang] || entry.details?.en || entry.details?.fr;
    const details = Array.isArray(detailsSource) ? detailsSource.filter(Boolean) : null;
    const linkUrl = entry.link;
    const linkLabel =
      (entry.linkLabel && (entry.linkLabel[state.lang] || entry.linkLabel.en || entry.linkLabel.fr || entry.linkLabel.default)) ||
      null;

    return {
      message,
      details,
      link: linkUrl ? { url: linkUrl, label: linkLabel } : null,
    };
  }

  function appendUserMessage(message) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.textContent = message;
    chatWindow.appendChild(bubble);
    scrollToBottom();
  }

  function appendBotMessage({ message, details, link }) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';

    if (message) {
      const paragraph = document.createElement('p');
      paragraph.innerHTML = formatMessage(message);
      bubble.appendChild(paragraph);
    }

    if (Array.isArray(details) && details.length) {
      const list = document.createElement('ul');
      list.className = 'message-list';
      details.forEach((item) => {
        if (!item) {
          return;
        }
        const listItem = document.createElement('li');
        listItem.textContent = item;
        list.appendChild(listItem);
      });
      if (list.children.length) {
        bubble.appendChild(list);
      }
    }

    if (link && link.url) {
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'chat-link-button';
      anchor.textContent = link.label || UI_TEXT[state.lang].defaultLink;
      bubble.appendChild(anchor);
    }

    chatWindow.appendChild(bubble);
    scrollToBottom();
  }

  function appendSystemMessage(message) {
    if (!message) {
      return;
    }
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';
    bubble.innerHTML = formatMessage(message);
    chatWindow.appendChild(bubble);
    scrollToBottom();
  }

  function formatMessage(text) {
    return text.replace(/\n/g, '<br>');
  }

  function showTypingIndicator(callback) {
    const indicator = document.createElement('div');
    indicator.className = 'chat-bubble typing-indicator';
    indicator.setAttribute('aria-live', 'polite');
    indicator.innerHTML = `<span></span><span></span><span></span>`;
    chatWindow.appendChild(indicator);
    scrollToBottom();
    setTimeout(() => {
      indicator.remove();
      callback();
    }, 450);
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
    });
  }
});
