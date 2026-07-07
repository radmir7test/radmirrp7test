const questions = [
  {
    type: "textarea",
    title: '2. Расшифровка аббревиатуры "МЗ"?',
    placeholder: "Введите ответ..."
  },
  {
    type: "radio",
    title: "3. Где разрешено стоять в афк?",
    options: [
      "Раздевалка/Гардероб",
      "Крыша",
      "Кабинет",
      "На задней парковке"
    ]
  },
  {
    type: "radio",
    title: "4. Какой максимальный срок разрешено провести во сне в неположенном месте, чтобы это не считалось нарушением?",
    options: ["3 минуты", "5 минут", "афк можно только в специально отведенной зоне", "2 минуты"]
  },
  {
    type: "textarea",
    title: "5. Что запрещено делать в строю? Как минимум 5 примеров.",
    placeholder: "Перечислите 5 и более запретов..."
  },
  {
    type: "textarea",
    title: "6. Можно ли в рабочее время кататься в форме по городу на ЛТС? Если нет, то какое следует наказание?",
    placeholder: "Опишите ситуацию и наказание..."
  },
  {
    type: "radio",
    title: '7. Кто старше по иерархии "Губернатор Области" или "Глав. врач"?',
    options: ["Губернатор", "Глав Врач"]
  },
  {
    type: "textarea",
    title: "8. Какие категории аксессуаров разрешено носить сотруднику во время работы согласно исключениям в пункте 3.9? Перечислите три категории.",
    placeholder: "Например: часы, цепочки..."
  },
  {
    type: "radio",
    title: "9. Какое из следующих действий сотрудника МЗ является прямым нарушением правил?",
    options: [
      "а) Отказ выдать медицинскую карту без опроса пациента.",
      "б) Проведение смены пола в палате, а не на операционном столе.",
      "в) Лечение пациента на улице возле больницы.",
      "г) Все перечисленные варианты."
    ]
  },
  {
    type: "textarea",
    title: "10. Какое наказание грозит сотруднику за отказ в оказании медицинских услуг из-за личной неприязни к пациенту?",
    placeholder: "Введите ответ..."
  },
  {
    type: "textarea",
    title: "11. В каких двух случаях сотруднику МЗ разрешено выехать за пределы больницы в одиночку?",
    placeholder: "Укажите две ситуации..."
  },
  {
    type: "textarea",
    title: "12. Распишите ценовую политику.",
    placeholder: "Напишите подробно..."
  },
  {
    type: "textarea",
    title: "13. Что запрещено делать сотрудникам в форме? (Написать 5 пунктов):",
    placeholder: "Перечислите 5 пунктов..."
  },
  {
    type: "textarea",
    title: "14. Что сотрудник обязан сделать, если не может явиться на всеобщее построение?",
    placeholder: "Введите ответ..."
  }
];

const STORAGE_KEY = "quizState";
const ATTEMPT_COUNTER_KEY = "quizAttemptCount";
const LOCK_DURATION_MS = 20 * 60 * 1000;

const stepContent = document.getElementById("stepContent");
const nextButton = document.getElementById("nextButton");
const progressBar = document.getElementById("progressBar");

let currentStep = 0;
let nickname = "";
let currentAttemptNumber = 0;
const answers = [];
const totalSteps = questions.length + 1;
let violationCount = 0;
let warningModal = null;
let violationCooldown = false;
let testActive = true;
let lockTimerInterval = null;
let lastViolationAt = 0;
let warningAcknowledged = false;
let hasTabSwitch = false;

function getCurrentQuestion() {
  return questions[currentStep - 1];
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveState(nextState) {
  const state = loadState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, ...nextState }));
}

function updateProgress() {
  const percent = (currentStep / totalSteps) * 100;
  progressBar.style.width = `${percent}%`;
}

function toggleRegisterLink() {
  const link = document.getElementById("registerLink");
  if (!link) {
    return;
  }

  const state = loadState();
  const isBlocked = Boolean(state.blockUntil && Number(state.blockUntil) > Date.now());
  link.style.display = currentStep === 0 && !isBlocked ? "inline-block" : "none";
}

function setHeaderTitle(title) {
  const titleElement = document.querySelector('.quiz-card__header h3');
  if (titleElement) {
    titleElement.textContent = title;
  }
}

function updateButtonState() {
  let canProceed = false;

  if (currentStep === 0) {
    canProceed = nickname.trim().length > 0;
  } else {
    const currentAnswer = answers[currentStep - 1];
    if (typeof currentAnswer === "string") {
      canProceed = currentAnswer.trim().length > 0;
    } else {
      canProceed = Boolean(currentAnswer);
    }
  }

  nextButton.disabled = !canProceed;
  nextButton.textContent = currentStep === totalSteps - 1 ? "Отправить" : "Далее";
}

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function startAttempt() {
  const nextAttemptNumber = Number(localStorage.getItem(ATTEMPT_COUNTER_KEY) || "0") + 1;
  currentAttemptNumber = nextAttemptNumber;
  localStorage.setItem(ATTEMPT_COUNTER_KEY, String(nextAttemptNumber));
  return nextAttemptNumber;
}

function generateTestNumber() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sendResultsToGoogle(testNumber) {
  const url = "https://script.google.com/macros/s/AKfycbzbGRJdN7yuhETR67zh7VonkV6dI9XrJ5T6ZXSpAHWCO3Gulq2gbE2xuYD0V_8lBrek/exec";
  const attemptNumber = currentAttemptNumber || Number(localStorage.getItem(ATTEMPT_COUNTER_KEY) || "1");
  const attemptLabel = attemptNumber === 1 ? "тест пройден с первого раза" : `Пересдано ${attemptNumber} раз`;
  const dataToSend = {
    "1": nickname || "",
    "2": answers[0] || "",
    "3": answers[1] || "",
    "4": answers[2] || "",
    "5": answers[3] || "",
    "6": answers[4] || "",
    "7": answers[5] || "",
    "8": answers[6] || "",
    "9": answers[7] || "",
    "10": answers[8] || "",
    "11": answers[9] || "",
    "12": answers[10] || "",
    "13": answers[11] || "",
    "14": answers[12] || "",
    "15": hasTabSwitch ? 1 : '0',
    "16": attemptLabel,
    "17": formatDateTime(new Date()),
    "18": testNumber
  };

  fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain"
    },
    body: JSON.stringify(dataToSend)
  }).catch((err) => console.error("Ошибка отправки:", err));
}

function clearLockTimer() {
  if (lockTimerInterval) {
    clearInterval(lockTimerInterval);
    lockTimerInterval = null;
  }
}

function formatCountdown(remainingMs) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function renderBlockedScreen(state) {
  const blockUntil = Number(state.blockUntil || 0);
  const isCompleted = state.reason === "completed";
  const headerTitle = "Повышение с Интерна[1] до Фельдшера[2]";
  setHeaderTitle(headerTitle);

  if (isCompleted) {
    const completedAt = Number(state.completedAt || Date.now());
    stepContent.innerHTML = `
      <div class="result-card">
        <h2 style="color: #41a85f; text-align: center;">Тест пройден!</h2>
        <p>Вы прошли тест, сделайте скриншот этого окна с результатами. Затем прикрепите этот скриншот к вашему отчету и ожидайте решения.</p>
        <p><strong>Пересдать тест можно через:</strong> ${formatCountdown(Math.max(0, blockUntil - Date.now()))}</p>
        <p><strong>Дата:</strong> ${formatDateTime(new Date(completedAt))}</p>
        <p><strong>Номер теста:</strong> ${state.testNumber || ""}</p>
      </div>
    `;
    nextButton.style.display = "none";
    return;
  }

  const title = "Тест провален!";
  const description = "Следующий тест вы сможете сдать через 20 минут.";

  stepContent.innerHTML = `
    <div class="result-card">
      <h2 style="color: #e83728; text-align: center;">${title}</h2>
      <p>${description}</p>
      <div class="result-meta">Осталось: ${formatCountdown(Math.max(0, blockUntil - Date.now()))}</div>
      <p><strong>Дата:</strong> ${formatDateTime(new Date(blockUntil))}</p>
      ${state.testNumber ? `<p><strong>Номер теста:</strong> ${state.testNumber}</p>` : ""}
    </div>
  `;
  nextButton.style.display = "none";
}

function startLockedView(state) {
  clearLockTimer();
  renderBlockedScreen(state);

  lockTimerInterval = setInterval(() => {
    const currentState = loadState();
    if (!currentState.blockUntil || Number(currentState.blockUntil) <= Date.now()) {
      clearLockTimer();
      localStorage.removeItem(STORAGE_KEY);
      testActive = true;
      currentStep = 0;
      nickname = "";
      answers.length = 0;
      nextButton.style.display = "inline-flex";
      renderStep();
      return;
    }

    renderBlockedScreen(currentState);
  }, 1000);
}

function protectInput(field) {
  if (!field) {
    return;
  }
  field.addEventListener("paste", (event) => event.preventDefault());
  field.addEventListener("copy", (event) => event.preventDefault());
  field.addEventListener("cut", (event) => event.preventDefault());
}

function setupAutoGrow(textarea) {
  if (!textarea) {
    return;
  }

  const resize = () => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(110, textarea.scrollHeight)}px`;
  };

  textarea.addEventListener("input", resize);
  requestAnimationFrame(resize);
}

function applyCopyProtection() {
  document.addEventListener("copy", (event) => event.preventDefault());
  document.addEventListener("cut", (event) => event.preventDefault());
  document.addEventListener("paste", (event) => event.preventDefault());
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("dragstart", (event) => event.preventDefault());
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const isModifier = event.ctrlKey || event.metaKey;
    if (isModifier && ["c", "v", "x", "a", "p"].includes(key)) {
      event.preventDefault();
    }
  });
}

function showWarningModal() {
  if (warningModal) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card">
      <h2 style='text-align: center;'>Внимание!</h2>
      <p>Во время прохождения теста запрещено открывать другие приложения!</p>
      <p style='font-weight: bold;'>При следующей попытке вы автоматически провалите тест!</p>
      <div class="actions">
        <button class="btn btn--primary modal-close">Ок</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector(".modal-close").addEventListener("click", () => {
    warningAcknowledged = true;
    saveState({ warningAcknowledged: 1 });
    overlay.remove();
    warningModal = null;
  });
  warningModal = overlay;
}

function failTest() {
  testActive = false;
  const blockUntil = Date.now() + LOCK_DURATION_MS;
  localStorage.removeItem(ATTEMPT_COUNTER_KEY);
  saveState({ status: "blocked", blockUntil, reason: "failed", violationCount: 1 });
  startLockedView({ status: "blocked", blockUntil, reason: "failed", violationCount: 1 });
}

function finishTest() {
  testActive = false;
  progressBar.style.width = "100%";
  const blockUntil = Date.now() + LOCK_DURATION_MS;
  const testNumber = generateTestNumber();
  saveState({ status: "blocked", blockUntil, reason: "completed", testNumber, completedAt: Date.now() });
  renderBlockedScreen({ status: "blocked", blockUntil, reason: "completed", testNumber, completedAt: Date.now() });
  nextButton.style.display = "none";
  sendResultsToGoogle(testNumber);
}

function handleTabViolation() {
  if (!testActive || violationCooldown || currentStep === 0) {
    return;
  }

  violationCooldown = true;
  setTimeout(() => {
    violationCooldown = false;
  }, 400);

  const now = Date.now();
  const state = loadState();
  const currentViolationCount = Number(state.violationCount || 0);
  const warningAccepted = Boolean(state.warningAcknowledged || warningAcknowledged);

  hasTabSwitch = true;

  if (currentViolationCount >= 1 && warningAccepted && now - lastViolationAt >= 1000) {
    failTest();
    return;
  }

  if (currentViolationCount >= 1) {
    return;
  }

  saveState({ violationCount: 1, warningAcknowledged: warningAccepted ? 1 : 0 });
  violationCount = 1;
  lastViolationAt = now;
  showWarningModal();
}

function renderStep() {
  updateProgress();
  updateButtonState();
  toggleRegisterLink();

  setHeaderTitle(currentStep === 0 ? 'Повышение с Интерна[1] до Фельдшера[2]' : getCurrentQuestion()?.title || 'Повышение с Интерна[1] до Фельдшера[2]');

  if (currentStep === 0) {
    stepContent.innerHTML = `
      <div class="rules-card">
        <h2>Правила теста: (обязательно к прочтению)</h2>
        <ol class="rules-list">
          <li>Время теста — неограниченное.</li>
          <li>Допускается 3 ошибки — не сдача теста.</li>
          <li>Скриншот с прохождением теста действует 3 дня.</li>
          <li>Вводить свой игровой ник в формате Имя_Фамилия на английском языке.</li>
          <li>На скриншоте должно быть видно время и дату прохождения теста.</li>
          <li>После прохождения нужно обязательно заскринить итог и прикрепить его на форум.</li>
          <li>Если будет несколько попыток, будет рассмотрена последняя заявка.</li>
        </ol>
      </div>
      <div class="question-card">
        <h2>1. Введите свой NickName</h2>
        <div class="form-group">
          <textarea id="nickname" placeholder="Введите свой ник...">${nickname}</textarea>
        </div>
      </div>
    `;

    const nicknameInput = document.getElementById("nickname");
    protectInput(nicknameInput);
    setupAutoGrow(nicknameInput);
    nicknameInput.addEventListener("input", (event) => {
      nickname = event.target.value;
      updateButtonState();
    });
    return;
  }

  const question = getCurrentQuestion();
  if (!question) {
    finishTest();
    return;
  }

  let content = `
    <div class="question-card">
  `;

  if (question.type === "textarea") {
    content += `
      <div class="form-group">
        <textarea id="answerField" placeholder="${question.placeholder}">${answers[currentStep - 1] || ""}</textarea>
      </div>
    `;
  } else {
    content += `
      <div class="option-list">
        ${question.options
          .map((option) => {
            const selected = answers[currentStep - 1] === option;
            return `
              <label class="option">
                <input type="radio" name="answer" value="${option}" ${selected ? "checked" : ""} />
                <span>${option}</span>
              </label>
            `;
          })
          .join("")}
      </div>
    `;
  }

  content += `</div>`;
  stepContent.innerHTML = content;

  const answerField = document.getElementById("answerField");
  protectInput(answerField);
  setupAutoGrow(answerField);
  if (answerField) {
    answerField.addEventListener("input", (event) => {
      answers[currentStep - 1] = event.target.value;
      updateButtonState();
    });
  }

  document.querySelectorAll('input[name="answer"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      answers[currentStep - 1] = event.target.value;
      updateButtonState();
    });
  });
}

function nextStep() {
  if (currentStep === 0) {
    if (!nickname.trim()) {
      return;
    }
    startAttempt();
  } else {
    const currentAnswer = answers[currentStep - 1];
    if (!currentAnswer || !String(currentAnswer).trim()) {
      return;
    }
  }

  if (currentStep < totalSteps - 1) {
    currentStep += 1;
    renderStep();
  } else {
    finishTest();
  }
}

function init() {
  if (localStorage.getItem("administrator") === "true") {
    window.location.href = "admin.html";
    return;
  }

  const state = loadState();
  warningAcknowledged = Boolean(state.warningAcknowledged);
  if (state.blockUntil && Number(state.blockUntil) > Date.now()) {
    if (state.reason === "completed") {
      progressBar.style.width = "100%";
    }
    setHeaderTitle("Повышение с Интерна[1] до Фельдшера[2]");
    toggleRegisterLink();
    startLockedView(state);
    return;
  }

  if (state.blockUntil) {
    localStorage.removeItem(STORAGE_KEY);
  }

  applyCopyProtection();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      handleTabViolation();
    }
  });
  window.addEventListener("blur", () => {
    handleTabViolation();
  });

  nextButton.addEventListener("click", nextStep);
  renderStep();
}

init();