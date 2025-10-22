const UI_TEXT = {
  fr: {
    placeholder: 'Écrivez votre message...',
    send: 'Envoyer',
    typing: 'Hubby prépare une réponse…',
    dayDefault: 'Tous les jours',
    backTooltip: 'Retour à l’accueil',
  },
  en: {
    placeholder: 'Type your message…',
    send: 'Send',
    typing: 'Hubby is typing…',
    dayDefault: 'All days',
    backTooltip: 'Back to home',
  },
};

const SHARED_KEYWORDS = {
  fr: {
    programme: ['programme', 'planning', 'agenda', 'horaires'],
    activities: ['activités', 'activite', 'atelier', 'ateliers'],
    group: ['groupe', 'team', 'équipes'],
    live: ['club med live', 'live'],
    viva: ['viva engage', 'viva'],
  },
  en: {
    programme: ['program', 'programme', 'schedule', 'agenda', 'plan'],
    activities: ['activities', 'activity', 'workshop', 'workshops'],
    group: ['group', 'team'],
    live: ['club med live', 'live'],
    viva: ['viva engage', 'viva'],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const chatWindow = document.getElementById('chatWindow');
  const dayFilter = document.getElementById('dayFilter');
  const quickActions = document.getElementById('quickActions');
  const chatInput = document.getElementById('chatInput');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const backButton = document.getElementById('backButton');
  const langFrBtn = document.getElementById('langFrChat');
  const langEnBtn = document.getElementById('langEnChat');
  const body = document.body;
  const populationKey = body.dataset.population;

  if (!chatWindow || !chatInput || !populationKey) {
    return;
  }

  let knowledgeBase = null;
  let populationData = null;
  let language = (localStorage.getItem('hubbyLang') || 'fr').toLowerCase();
  if (!['fr', 'en'].includes(language)) language = 'fr';

  const storedPopulation = localStorage.getItem('hubbyPopulation');
  if (storedPopulation && populationKey === 'cdv_lc_lkt') {
    const allowed = ['CDV', 'CDG', 'LC', 'LKT'];
    if (!allowed.includes(storedPopulation)) {
      localStorage.setItem('hubbyPopulation', 'CDV');
    }
  } else if (storedPopulation && storedPopulation.toLowerCase() !== populationKey) {
    localStorage.setItem('hubbyPopulation', populationKey.toUpperCase());
  } else if (!storedPopulation) {
    localStorage.setItem('hubbyPopulation', populationKey.toUpperCase());
  }

  setupLanguage(language);
  attachEvents();
  fetchData();

  function attachEvents() {
    sendMessageBtn.addEventListener('click', handleUserMessage);
    chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleUserMessage();
      }
    });

    backButton.addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    langFrBtn.addEventListener('click', () => switchLanguage('fr'));
    langEnBtn.addEventListener('click', () => switchLanguage('en'));
  }

  function fetchData() {
    fetch('assets/js/data.json', { cache: 'no-cache' })
      .then((response) => response.json())
      .then((data) => {
        knowledgeBase = data;
        populationData = data?.[populationKey] || null;
        if (!populationData) {
          displayBotMessage(getFallbackMessage());
          return;
        }
        renderInterface();
      })
      .catch(() => {
        displayBotMessage(getFallbackMessage());
      });
  }

  function setupLanguage(selected) {
    language = selected;
    localStorage.setItem('hubbyLang', language);
    chatInput.placeholder = UI_TEXT[language].placeholder;
    sendMessageBtn.textContent = UI_TEXT[language].send;
    backButton.title = UI_TEXT[language].backTooltip;

    if (language === 'fr') {
      langFrBtn.classList.add('active');
      langEnBtn.classList.remove('active');
    } else {
      langEnBtn.classList.add('active');
      langFrBtn.classList.remove('active');
    }
  }

  function switchLanguage(nextLanguage) {
    if (language === nextLanguage) return;
    setupLanguage(nextLanguage);
    renderInterface();
  }

  function renderInterface() {
    renderDayFilters();
    renderQuickActions();
  }

  function renderDayFilters() {
    dayFilter.innerHTML = '';
    const days = populationData?.days;
    if (!Array.isArray(days) || days.length === 0) {
      dayFilter.style.display = 'none';
      return;
    }

    dayFilter.style.display = '';

    days.forEach((day, index) => {
      const button = document.createElement('button');
      button.textContent = day.labels?.[language] || day.labels?.fr || day.labels?.en || '';
      if (index === 0) {
        button.classList.add('active');
      }
      button.addEventListener('click', () => {
        Array.from(dayFilter.children).forEach((child) => child.classList.remove('active'));
        button.classList.add('active');
        triggerResponse(day.messages?.[language] || day.messages?.fr || '');
      });
      dayFilter.appendChild(button);
    });
  }

  function renderQuickActions() {
    quickActions.innerHTML = '';
    const actions = populationData?.actions;
    if (!Array.isArray(actions) || actions.length === 0) {
      quickActions.style.display = 'none';
      return;
    }

    quickActions.style.display = '';

    actions.forEach((action) => {
      const button = document.createElement('button');
      button.textContent = action.labels?.[language] || action.labels?.fr || action.labels?.en || '';
      button.addEventListener('click', () => {
        const userText = button.textContent;
        displayUserMessage(userText);
        respondWithAction(action);
      });
      quickActions.appendChild(button);
    });
  }

  function handleUserMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    displayUserMessage(message);
    chatInput.value = '';
    processUserInput(message);
  }

  function displayUserMessage(message) {
    addMessageToChat(escapeHtml(message), 'user');
  }

  function respondWithAction(action) {
    showTypingIndicator();
    const response = buildActionResponse(action);
    setTimeout(() => {
      removeTypingIndicator();
      displayBotMessage(response);
    }, 600);
  }

  function processUserInput(message) {
    showTypingIndicator();
    const action = matchAction(message);
    setTimeout(() => {
      removeTypingIndicator();
      if (action) {
        const response = buildActionResponse(action);
        displayBotMessage(response);
      } else {
        displayBotMessage(getFallbackMessage());
      }
    }, 650);
  }

  function buildActionResponse(action) {
    const responseText = action.messages?.[language] || action.messages?.fr || action.messages?.en || '';
    const link = action.link;
    const linkLabel = action.linkLabels?.[language] || action.linkLabels?.fr || action.linkLabels?.en;
    const extras = action.extras?.[language] || action.extras?.fr || action.extras?.en;

    let html = escapeHtml(responseText);

    if (link) {
      const safeLabel = escapeHtml(linkLabel || link);
      html += `<br><a href="${link}" target="_blank" rel="noopener">${safeLabel}</a>`;
    }

    if (extras) {
      html += `<br>${escapeHtml(extras)}`;
    }

    return html;
  }

  function matchAction(message) {
    if (!populationData?.actions) return null;
    const normalized = message.toLowerCase();

    return (
      populationData.actions.find((action) => {
        const keywords = new Set();
        if (Array.isArray(action.keywords)) {
          action.keywords.forEach((kw) => keywords.add(kw.toLowerCase()));
        }
        const labelFr = action.labels?.fr;
        const labelEn = action.labels?.en;
        if (labelFr) keywords.add(labelFr.toLowerCase());
        if (labelEn) keywords.add(labelEn.toLowerCase());

        const shared = SHARED_KEYWORDS[language];
        if (shared && action.sharedKey && shared[action.sharedKey]) {
          shared[action.sharedKey].forEach((kw) => keywords.add(kw.toLowerCase()));
        }

        for (const keyword of keywords) {
          if (keyword && normalized.includes(keyword)) {
            return true;
          }
        }
        return false;
      }) || null
    );
  }

  let typingBubble = null;
  function showTypingIndicator() {
    removeTypingIndicator();
    typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble typing-indicator';
    typingBubble.innerHTML = `${escapeHtml(UI_TEXT[language].typing)} <span></span><span></span><span></span>`;
    chatWindow.appendChild(typingBubble);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    if (typingBubble && typingBubble.parentNode) {
      typingBubble.parentNode.removeChild(typingBubble);
      typingBubble = null;
    }
  }

  function displayBotMessage(message) {
    addMessageToChat(message, 'bot');
  }

  function addMessageToChat(message, sender) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = message;
    chatWindow.appendChild(bubble);
    scrollToBottom();
  }

  function triggerResponse(message) {
    if (!message) return;
    showTypingIndicator();
    setTimeout(() => {
      removeTypingIndicator();
      displayBotMessage(escapeHtml(message));
    }, 600);
  }

  function getFallbackMessage() {
    const fallback = knowledgeBase?.global?.fallback;
    if (!fallback) {
      return language === 'fr'
        ? "Je n’ai pas encore la réponse à cette question 😅 Tu peux utiliser les boutons ci-dessous."
        : "I don’t have the answer to that yet 😅 Try the quick buttons below.";
    }
    return fallback[language] || fallback.fr || fallback.en || '';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    });
  }
});
