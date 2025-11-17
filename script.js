// ============================================================
//   PROTECCIÓN: evitar doble inicialización del sistema i18n
// ============================================================
if (!window.__I18N_INITIALIZED) {
  window.__I18N_INITIALIZED = true;

  // ============================================================
  //   RUTA BASE DE ARCHIVOS I18N
  // ============================================================
  function getI18nBasePath() {
    return "/i18n";
  }
  const I18N_PATH = getI18nBasePath();

  // ============================================================
  //   CARGAR ARCHIVO JSON DE TRADUCCIÓN
  // ============================================================
  async function loadJson(lang, file) {
    try {
      const resp = await fetch(`${I18N_PATH}/${file}.json`);
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }
  window.loadJson = loadJson;

  // ============================================================
  //   GENERAR RECUADRO ASCII (para textos estilo terminal)
  // ============================================================
  function createBoxedText(texts, padding = 2) {
    if (!Array.isArray(texts)) texts = [texts];
    const maxLength = Math.max(...texts.map(t => t.length));
    const w = maxLength + padding * 2;
    return [
      "╔" + "═".repeat(w) + "╗",
      texts.map(t => "║" + " ".repeat(padding) + t + " ".repeat(padding) + "║").join("\n"),
      "╚" + "═".repeat(w) + "╝"
    ];
  }

  // ============================================================
  //   APLICAR TRADUCCIONES A TODO EL DOM
  // ============================================================
  async function applyTranslations() {
    const lang = localStorage.getItem("lang") || "es";

    const files = [
      "common", "version", "welcome", "availableCommands",
      "other", "whoami", "bio", "content", "projects",
      "wget", "errors"
    ];

    for (const file of files) {
      const data = await loadJson(lang, file);
      const section = data?.[lang];
      if (!section) continue;
      applyNestedTranslations(section);
    }
  }

  function applyNestedTranslations(obj, prefix = "") {
    for (const key in obj) {
      const value = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "object" && value !== null) {
        applyNestedTranslations(value, fullKey);
        continue;
      }

      const el = document.querySelector(`[data-i18n="${fullKey}"]`);
      if (!el) continue;

      // Si requiere recuadro ASCII
      if (el.classList.contains("line-content-box")) {
        el.innerHTML = "";
        createBoxedText(value).forEach(line => {
          const span = document.createElement("span");
          span.textContent = line;
          span.className = "line-content";
          el.appendChild(span);
          el.appendChild(document.createElement("br"));
        });
      } else {
        el.textContent = value;
      }
    }
  }

  // ============================================================
  //   ACTUALIZAR SWITCH DE IDIOMA
  // ============================================================
  function updateLangSwitch() {
    const switchEl = document.querySelector(".lang-switch");
    if (!switchEl) return;

    const lang = localStorage.getItem("lang") || "es";
    switchEl.setAttribute("data-lang", lang);

    const slider = switchEl.querySelector(".lang-slider");
    slider.style.left = lang === "es" ? "0%" : "50%";

    loadJson(lang, "other").then(data => {
      const input = document.getElementById("commandInput");
      if (input) input.placeholder = data?.[lang]?.textEnter || "Enter command...";
    });
  }

  // Click para cambiar idioma
  document.querySelectorAll(".lang-switch .lang-option").forEach(opt => {
    opt.addEventListener("click", async () => {
      const selectedLang = opt.dataset.lang;
      localStorage.setItem("lang", selectedLang);
      updateLangSwitch();
      await applyTranslations();
    });
  });

  // Cambio rápido (para teclado o accesibilidad)
  window.toggleLang = () => {
    const cur = localStorage.getItem("lang") || "es";
    const next = cur === "es" ? "en" : "es";
    localStorage.setItem("lang", next);
    updateLangSwitch();
    applyTranslations();
  };

  // ============================================================
  //   TOGGLE ENTRE v1 Y v2
  // ============================================================
  function toggleVersion() {
    const current = localStorage.getItem("version") || "v1";
    const next = current === "v1" ? "v2" : "v1";
    localStorage.setItem("version", next);
    window.location.href = `/${next}/index.html`;
  }
  window.toggleVersion = toggleVersion;

  // ============================================================
  //   LINKS (actualiza urls según idioma)
  // ============================================================
  async function loadLinksJson() {
    try {
      const res = await fetch("/links.json");
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function applyLinks(lang = null) {
    const data = await loadLinksJson();
    if (!data) return;

    const language = lang || localStorage.getItem("lang") || "es";
    const links = data[language] || data["es"];

    Object.keys(links).forEach(key => {
      const el = document.getElementById(key);
      if (!el) return;

      const url = links[key];
      const tag = el.tagName.toUpperCase();

      if (["IMG", "PICTURE", "SOURCE"].includes(tag)) el.src = url;
      else if (["A", "AREA", "LINK"].includes(tag)) el.href = url;
      else el.setAttribute("data-link", url);
    });
  }

  // ============================================================
  //   INICIALIZACIÓN
  // ============================================================
  document.addEventListener("DOMContentLoaded", async () => {
    await applyTranslations();
    await applyLinks();
    updateLangSwitch();
  });

  // Exponer para depuración manual si el dev lo requiere:
  window.__applyTranslations = applyTranslations;
  window.__applyLinks = applyLinks;

  // ============================================================
  //   MANEJADOR GLOBAL DE RUTAS DE IMÁGENES
  // ============================================================
  function getImagePath(imageName) {
    const isV2 = window.location.pathname.includes("/v2/");
    const version = isV2 ? "v2" : "v1";

    if (imageName.startsWith("/") || imageName.startsWith("http"))
      return imageName;

    if (imageName.includes("public/"))
      return `/${imageName}`;

    return `/${version}/images/${imageName}`;
  }
  window.getImagePath = getImagePath;

  // ============================================================
  //   TOGGLE DE TEMA (light / dark)
  // ============================================================
  const themeToggle = document.getElementById("themeToggle");

  themeToggle?.addEventListener("click", () => {
    const current = themeToggle.getAttribute("data-theme") || "light";
    const next = current === "light" ? "dark" : "light";

    themeToggle.setAttribute("data-theme", next);
    document.body.classList.toggle("dark-mode", next === "dark");
    document.body.classList.toggle("light-mode", next === "light");
    localStorage.setItem("theme", next);
  });

  document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("theme") || "light";
    themeToggle?.setAttribute("data-theme", saved);
    document.body.classList.toggle("dark-mode", saved === "dark");
    document.body.classList.toggle("light-mode", saved === "light");
  });

}
