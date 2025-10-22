const DAYS = [
  {
    id: '18',
    labels: {
      fr: '18 novembre',
      en: '18 November',
    },
  },
  {
    id: '19',
    labels: {
      fr: '19 novembre',
      en: '19 November',
    },
  },
  {
    id: '20',
    labels: {
      fr: '20 novembre',
      en: '20 November',
    },
  },
];

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

document.addEventListener('DOMContentLoaded', () => {
  const chatWindow = document.getElementById('chatWindow');
  const dayFilter = document.getElementById('dayFilter');
  const quickActions = document.getElementById('quickActions');
  const chatInput = document.getElementById('chatInput');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const backButton = document.getElementById('backButton');
  const langButtons = Array.from(document.querySelectorAll('.lang-toggle button'));

  if (!chatWindow || !dayFilter || !quickActions || !chatInput || !sendMessageBtn) {
    return;
  }

  const state = {
    lang: 'fr',
    day: null,
    data: null,
    availableDays: [],
  };

  initialiseLanguage();
  attachEvents();
  loadData();

  function initialiseLanguage() {
    const storedLang = (localStorage.getItem('hubbyLang') || 'fr').toLowerCase();
    state.lang = storedLang === 'en' ? 'en' : 'fr';
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
      button.classList.toggle('active', lang === state.lang);
    });
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

  function loadData() {
    fetch('assets/js/data.json', { cache: 'no-cache' })
      .then((response) => response.json())
      .then((data) => {
        state.data = data;
        state.availableDays = DAYS.filter((day) => data?.days?.[day.id]);
        if (!state.availableDays.length) {
          appendSystemMessage(getFallbackMessage());
          return;
        }
        if (!state.day || !data.days[state.day]) {
          state.day = state.availableDays[0].id;
        }
        renderDayButtons();
        renderQuickActions();
        appendSystemMessage(UI_TEXT[state.lang].welcome);
      })
      .catch(() => {
        appendSystemMessage(getFallbackMessage());
      });
  }

  function renderDayButtons() {
    dayFilter.innerHTML = '';
    state.availableDays.forEach((day) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.day = day.id;
      button.textContent = day.labels[state.lang] || day.labels.fr || day.labels.en;
      button.classList.toggle('active', day.id === state.day);
      dayFilter.appendChild(button);
    });
  }

  function updateDaySelection() {
    Array.from(dayFilter.children).forEach((child) => {
      child.classList.toggle('active', child.dataset.day === state.day);
    });
  }

  function renderQuickActions() {
    quickActions.innerHTML = '';
    QUICK_ACTIONS.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = action.id;
      button.textContent = action.labels[state.lang] || action.labels.fr || action.labels.en;
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
    const dayEntry = state.data?.days?.[state.day];
    const category = dayEntry?.[actionId];
    if (!category) {
      respondWithFallback();
      return;
    }

    const message = category[state.lang] || category.en || category.fr || '';
    const details = getLocalizedArray(category.details);
    const link = resolveLink(category);

    showTypingIndicator(() => {
      appendBotMessage({ message, details, link });
    });
  }

  function getLocalizedArray(entry) {
    if (!entry) {
      return null;
    }
    if (Array.isArray(entry)) {
      return entry;
    }
    if (typeof entry === 'object') {
      const localized = entry[state.lang] || entry.en || entry.fr;
      return Array.isArray(localized) ? localized : null;
    }
    return null;
  }

  function resolveLink(category) {
    const linkEntry = category.link;
    if (!linkEntry) {
      return null;
    }

    if (typeof linkEntry === 'string') {
      return {
        url: linkEntry,
        label: getLocalizedText(category.linkLabel) || UI_TEXT[state.lang].defaultLink,
      };
    }

    if (typeof linkEntry === 'object' && linkEntry.url) {
      return {
        url: linkEntry.url,
        label: getLocalizedText(linkEntry.label) || UI_TEXT[state.lang].defaultLink,
      };
    }

    return null;
  }

  function getLocalizedText(entry) {
    if (!entry) {
      return '';
    }
    if (typeof entry === 'string') {
      return entry;
    }
    if (typeof entry === 'object') {
      return entry[state.lang] || entry.en || entry.fr || '';
    }
    return '';
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
      (state.lang === 'fr'
        ? "Je n’ai pas encore la réponse à cette question 😅"
        : "I don’t have the answer to that yet 😅")
    );
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
        const listItem = document.createElement('li');
        listItem.textContent = item;
        list.appendChild(listItem);
      });
      bubble.appendChild(list);
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
    }, 400);
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
    });
  }
});
