// =====================================================
// v2/script.js — Versión limpia, documentada y sin logs
// =====================================================


// ======================
// Carga de archivos JSON
// ======================
async function getFileContent(filename) {
  const lang = localStorage.getItem("lang") || "es";
  const data = await loadJson(lang, "content");

  if (!data || !data[lang]) return "Contenido no disponible";

  const contentMap = {
    "bio.txt": data[lang].bio,
    "skills.txt": data[lang].skills,
    "contact.txt": data[lang].contact
  };

  return contentMap[filename] || "Archivo no encontrado";
}


async function getProjectData(projectName) {
  const lang = localStorage.getItem("lang") || "es";
  const data = await loadJson(lang, "projects");

  if (!data || !data[lang] || !data[lang][projectName]) {
    return null;
  }

  return data[lang][projectName];
}


// ======================
// Sistema de archivos simulado
// ======================
const fileSystem = {
  "/": {
    type: "directory",
    files: {
      "bio.txt": { type: "file" },
      "projects": {
        type: "directory",
        files: {
          "vise": { type: "project" },
          "juego": { type: "project" },
          "formSena": { type: "project" },
          "lisa": { type: "project" }
        }
      },
      "skills.txt": { type: "file" },
      "contact.txt": { type: "file" }
    }
  }
};


// ======================
// Estado del terminal
// ======================
const terminal = {
  history: [],
  historyIndex: -1,
  commandInput: document.getElementById("commandInput"),
  terminalBody: document.getElementById("terminalBody"),
  promptText: document.getElementById("promptText"),
  lineCount: 2,
  currentPath: "/",
  currentGallery: null
};


// =====================================
// Listado de archivos dentro de un path
// =====================================
function listFilesInDirectory(path) {
  const dir = navigatePath(path);
  if (!dir || dir.type !== "directory") return [];
  return Object.keys(dir.files);
}


// ======================
// Manejo del tema claro/oscuro
// ======================
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const savedTheme = localStorage.getItem("theme");

function setTheme(isDark) {
  if (isDark) {
    document.body.classList.remove("light-mode");
  } else {
    document.body.classList.add("light-mode");
  }
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

if (savedTheme) {
  setTheme(savedTheme === "dark");
} else {
  setTheme(prefersDark.matches);
}


// ======================
// Manejo del output del terminal
// ======================
function addOutput(lines, outputClass = "success-output") {
  if (typeof lines === "string") lines = [lines];

  lines.forEach((line) => {
    const outputLine = document.createElement("div");
    outputLine.className = `output-line ${outputClass}`;

    const lineNum = document.createElement("span");
    lineNum.className = "line-number";
    lineNum.textContent = terminal.lineCount++;

    const lineContent = document.createElement("span");
    lineContent.className = "line-content";
    lineContent.textContent = line;

    outputLine.appendChild(lineNum);
    outputLine.appendChild(lineContent);
    terminal.terminalBody.appendChild(outputLine);
  });

  terminal.terminalBody.scrollTop = terminal.terminalBody.scrollHeight;
}


// ======================
// Ejecución de comandos
// ======================
async function executeCommand(cmd) {
  cmd = cmd.trim();
  if (!cmd) return;

  terminal.commandInput.value = "";

  // Mostrar en pantalla el comando escrito
  const commandLine = document.createElement("div");
  commandLine.className = "output-line command-line";

  const prompt = document.createElement("span");
  prompt.className = "prompt";
  prompt.textContent = terminal.promptText.textContent + "";

  const input = document.createElement("span");
  input.className = "user-input";
  input.textContent = " " + cmd;

  commandLine.appendChild(prompt);
  commandLine.appendChild(input);
  terminal.terminalBody.appendChild(commandLine);

  terminal.history.push(cmd);
  terminal.historyIndex = -1;

  const parts = cmd.split(" ");
  const baseCmd = parts[0];
  const args = parts.slice(1).join(" ");
  const fullCmd = cmd;

  // Búsqueda y ejecución del comando
  if (commands[fullCmd]) {
    await commands[fullCmd].execute();
  } else if (baseCmd === "cd" && commands.cd) {
    await commands.cd.execute(args);
  } else if (baseCmd === "cat" && commands.cat) {
    await commands.cat.execute(args);
  } else if (commands[baseCmd]) {
    await commands[baseCmd].execute(args);
  } else {
    const lang = localStorage.getItem("lang") || "es";
    const errorsData = await loadJson(lang, "errors");
    const template = errorsData?.[lang]?.errors?.commandNotFound;
    const message = template
      ? template.replace("{cmd}", cmd)
      : `Comando no encontrado: '${cmd}'`;
    addOutput(message, "error-output");
  }

  terminal.terminalBody.scrollTop = terminal.terminalBody.scrollHeight;
}


// ======================
// Manejo del input del usuario
// ======================
terminal.commandInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    executeCommand(terminal.commandInput.value);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (terminal.historyIndex < terminal.history.length - 1) {
      terminal.historyIndex++;
      terminal.commandInput.value =
        terminal.history[terminal.history.length - 1 - terminal.historyIndex];
    }
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (terminal.historyIndex > 0) {
      terminal.historyIndex--;
      terminal.commandInput.value =
        terminal.history[terminal.history.length - 1 - terminal.historyIndex];
    } else if (terminal.historyIndex === 0) {
      terminal.historyIndex--;
      terminal.commandInput.value = "";
    }
  }
});


// ======================
// Auto focus del terminal
// ======================
document.addEventListener("click", () => {
  terminal.commandInput.focus();
});

terminal.commandInput.focus();
updatePrompt();


// ======================
// Navegación del sistema de archivos
// ======================
function navigatePath(path) {
  if (path === "/") return fileSystem["/"];

  const parts = path.split("/").filter((p) => p);
  let current = fileSystem["/"];

  for (const part of parts) {
    if (!current.files[part]) return null;
    current = current.files[part];
  }

  return current;
}

function getFile(path) {
  const parts = path.split("/").filter((p) => p);
  const filename = parts.pop();
  const dir = navigatePath("/" + parts.join("/"));

  if (!dir || !dir.files[filename]) return null;
  return dir.files[filename];
}


// ======================
// Galería de proyectos
// ======================
function displayProjectGallery(projectName, projectData) {
  const processedProjectData = {
    ...projectData,
    images: projectData.images.map(img => getImagePath(img))
  };

  const output = document.createElement("div");
  output.className = "output-line project-output";

  const lineNum = document.createElement("span");
  lineNum.className = "line-number";
  lineNum.textContent = terminal.lineCount++;

  const projectContainer = document.createElement("div");
  projectContainer.className = "project-container";
  projectContainer.innerHTML = `
    <div class="project-header">
      <div class="project-title">${processedProjectData.title}</div>
      <div class="project-description">${processedProjectData.description}</div>
    </div>
    
    <div class="project-gallery">
      <img id="gallery-img-${projectName}" src="${processedProjectData.images[0]}" class="gallery-image">
      <div class="gallery-nav">
        <button class="gallery-btn" onclick="prevImage('${projectName}')">Prev</button>
        <div class="gallery-dots" id="dots-${projectName}"></div>
        <button class="gallery-btn" onclick="nextImage('${projectName}')">Next</button>
      </div>
    </div>

    <div class="project-tech">
      <div class="tech-label">Technologies:</div>
      <div class="tech-grid">
        ${processedProjectData.technologies.map(tech => `<span class="tech-badge">${tech}</span>`).join("")}
      </div>
    </div>

    <div class="project-footer">
      <a href="${processedProjectData.link}" target="_blank" class="project-link">Ver en GitHub</a>
    </div>
  `;

  output.appendChild(lineNum);
  output.appendChild(projectContainer);
  terminal.terminalBody.appendChild(output);

  terminal.currentGallery = {
    name: projectName,
    index: 0,
    images: processedProjectData.images,
    total: processedProjectData.images.length
  };

  const dotsContainer = document.getElementById(`dots-${projectName}`);
  for (let i = 0; i < processedProjectData.images.length; i++) {
    const dot = document.createElement("div");
    dot.className = "dot" + (i === 0 ? " active" : "");
    dot.onclick = () => goToImage(projectName, i);
    dotsContainer.appendChild(dot);
  }

  updateGalleryImage(projectName);
  terminal.terminalBody.scrollTop = terminal.terminalBody.scrollHeight;
}

function updateGalleryImage(projectName) {
  const img = document.getElementById(`gallery-img-${projectName}`);
  if (img && terminal.currentGallery && terminal.currentGallery.name === projectName) {
    img.src = terminal.currentGallery.images[terminal.currentGallery.index];

    const dots = document.querySelectorAll(`#dots-${projectName} .dot`);
    dots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx === terminal.currentGallery.index);
    });
  }
}

function nextImage(projectName) {
  if (terminal.currentGallery && terminal.currentGallery.name === projectName) {
    terminal.currentGallery.index =
      (terminal.currentGallery.index + 1) % terminal.currentGallery.total;
    updateGalleryImage(projectName);
  }
}

function prevImage(projectName) {
  if (terminal.currentGallery && terminal.currentGallery.name === projectName) {
    terminal.currentGallery.index =
      (terminal.currentGallery.index - 1 + terminal.currentGallery.total) %
      terminal.currentGallery.total;
    updateGalleryImage(projectName);
  }
}

function goToImage(projectName, index) {
  if (terminal.currentGallery && terminal.currentGallery.name === projectName) {
    terminal.currentGallery.index = index;
    updateGalleryImage(projectName);
  }
}


// ======================
// Actualización del prompt
// ======================
function updatePrompt() {
  const path = terminal.currentPath === "/" ? "~" : "~" + terminal.currentPath;
  terminal.promptText.textContent = `developer@portfolio ${path} $`;
}

