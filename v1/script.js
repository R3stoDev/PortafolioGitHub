// ======= IMAGE PATH SOLUTION FOR V1 =======
window.getImagePath = function(imageName) {
  if (imageName.startsWith('/') || imageName.startsWith('http')) {
    return imageName;
  }
  if (imageName.includes('public/')) {
    return `/${imageName}`;
  }
  return `/images/${imageName}`;
};

// ================ THEME TOGGLE ================ 
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const savedTheme = localStorage.getItem('theme');

function setTheme(isDark) {
    if (isDark) {
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

if (savedTheme) {
    setTheme(savedTheme === 'dark');
} else {
    setTheme(prefersDark.matches);
}

// ================ PROJECTS FROM JSON ================ 
let projectsData = {};
const currentImageIndex = {};

// Cargar proyectos desde JSON
async function loadProjects() {
  const lang = localStorage.getItem('lang') || 'es';
  console.log("Cargando proyectos para V1, idioma:", lang);
  
  try {
    // Usar fetch directamente ya que loadJson no está disponible
    const response = await fetch(`/i18n/projects.json`);
    if (!response.ok) throw new Error('No se pudo cargar projects.json');
    const data = await response.json();
    
    if (!data || !data[lang]) {
      console.error('No se encontraron proyectos para el idioma:', lang);
      return;
    }
    
    projectsData = data[lang];
    console.log("Proyectos cargados:", Object.keys(projectsData));
    renderProjects();
  } catch (error) {
    console.error('Error cargando proyectos:', error);
  }
}

// Renderizar proyectos en el DOM
// Renderizar proyectos en el DOM
function renderProjects() {
  const container = document.getElementById('projects-container');
  if (!container) {
    console.error('No se encontró projects-container');
    return;
  }
  
  // Guardar qué proyectos estaban abiertos antes de recargar
  const openProjects = [];
  document.querySelectorAll('.project-item.expanded').forEach(item => {
    openProjects.push(item.getAttribute('data-project'));
  });
  
  container.innerHTML = '';
  
  // Proyectos en el orden que quieres: vise, juego, formSena, lisa
  const projectOrder = ['vise', 'juego', 'formSena', 'lisa'];
  
  projectOrder.forEach((projectKey, index) => {
    const project = projectsData[projectKey];
    if (!project) {
      console.warn(`Proyecto ${projectKey} no encontrado en JSON`);
      return;
    }
    
    const projectId = index + 1;
    currentImageIndex[projectId] = 0;
    
    const projectItem = document.createElement('div');
    projectItem.className = 'project-item';
    projectItem.setAttribute('data-project', projectId);
    
    // Verificar si este proyecto estaba abierto antes
    const wasOpen = openProjects.includes(projectId.toString());
    const contentClass = wasOpen ? 'project-content' : 'project-content collapsed';
    
    projectItem.innerHTML = `
      <div class="command-line project-toggle">
        <span class="prompt">~/portfolio/projects $</span>
        <span class="user-command">cat ${projectKey}/</span>
        <span class="toggle-arrow">→</span>
      </div>
      <div class="${contentClass}">
        <div class="command-line">
          <span class="prompt">~/portfolio/projects/${projectKey} $</span>
          <span class="user-command">info</span>
        </div>
        <div class="command-output">
          <div class="output-section">
            <span class="output-label">PROJECT:</span>
            <span class="output-value">${project.title}</span>
          </div>
          <div class="output-section">
            <span class="output-label">DESCRIPTION:</span>
            <span class="output-value">${project.description}</span>
          </div>
          <div class="output-section">
            <span class="output-label">TECH:</span>
            <span class="output-value">${project.technologies.join(' • ')}</span>
          </div>
        </div>

        <div class="gallery-section">
          <div class="command-line">
            <span class="prompt">~/portfolio/projects/${projectKey} $</span>
            <span class="user-command">preview --images</span>
          </div>
          <div class="image-gallery">
            <div class="gallery-container">
              <img src="${getImagePath(project.images[0])}" alt="${project.title}" class="gallery-image" id="project-${projectId}-img" />
              <div class="gallery-nav">
                <button class="gallery-arrow prev" onclick="prevProjectImage(${projectId})">◄</button>
                <button class="gallery-arrow next" onclick="nextProjectImage(${projectId})">►</button>
              </div>
              <div class="gallery-dots" id="project-${projectId}-dots"></div>
            </div>
          </div>
        </div>

        <div class="project-links">
          <a href="${project.link}" target="_blank" class="link-btn">→ GitHub</a>
          <a href="#" class="link-btn">→ Demo</a>
        </div>
      </div>
    `;
    
    container.appendChild(projectItem);
    
    // Si el proyecto estaba abierto, marcarlo como expandido e inicializar galería
    if (wasOpen) {
      projectItem.classList.add('expanded');
      // Inicializar la galería después de un pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        initGallery(projectId);
      }, 50);
    }
  });
  
  // Re-asignar event listeners
  reassignProjectToggles();
}

// Re-asignar event listeners después de renderizar
function reassignProjectToggles() {
  const projectToggles = document.querySelectorAll('.project-toggle');
  
  projectToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const projectItem = this.closest('.project-item');
      const projectContent = projectItem.querySelector('.project-content');
      const isCollapsed = projectContent.classList.contains('collapsed');
      
      if (isCollapsed) {
        projectContent.classList.remove('collapsed');
        projectItem.classList.add('expanded');
        const projectId = projectItem.dataset.project;
        initGallery(projectId);
      } else {
        projectContent.classList.add('collapsed');
        projectItem.classList.remove('expanded');
      }
    });
  });
}

// ================ GALLERY MANAGEMENT ================ 
function initGallery(projectId) {
  const projectOrder = ['vise', 'juego', 'formSena', 'lisa'];
  const projectKey = projectOrder[projectId - 1];
  const project = projectsData[projectKey];
  
  if (!project) return;
  
  const images = project.images.map(img => getImagePath(img));
  const dotsContainer = document.getElementById(`project-${projectId}-dots`);
  
  if (!dotsContainer) return;
  
  dotsContainer.innerHTML = '';
  images.forEach((_, index) => {
    const dot = document.createElement('span');
    dot.onclick = () => goToImage(projectId, index);
    if (index === 0) dot.classList.add('active');
    dotsContainer.appendChild(dot);
  });
  
  updateGallery(projectId);
}

function updateGallery(projectId) {
  const projectOrder = ['vise', 'juego', 'formSena', 'lisa'];
  const projectKey = projectOrder[projectId - 1];
  const project = projectsData[projectKey];
  
  if (!project) return;
  
  const images = project.images.map(img => getImagePath(img));
  const index = currentImageIndex[projectId];
  
  const img = document.getElementById(`project-${projectId}-img`);
  if (!img) return;
  
  img.src = images[index];
  img.alt = project.title;
  
  const dots = document.querySelectorAll(`#project-${projectId}-dots span`);
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

function nextProjectImage(projectId) {
  const projectOrder = ['vise', 'juego', 'formSena', 'lisa'];
  const projectKey = projectOrder[projectId - 1];
  const project = projectsData[projectKey];
  
  if (!project) return;
  
  const images = project.images.map(img => getImagePath(img));
  currentImageIndex[projectId] = (currentImageIndex[projectId] + 1) % images.length;
  updateGallery(projectId);
}

function prevProjectImage(projectId) {
  const projectOrder = ['vise', 'juego', 'formSena', 'lisa'];
  const projectKey = projectOrder[projectId - 1];
  const project = projectsData[projectKey];
  
  if (!project) return;
  
  const images = project.images.map(img => getImagePath(img));
  currentImageIndex[projectId] = (currentImageIndex[projectId] - 1 + images.length) % images.length;
  updateGallery(projectId);
}

function goToImage(projectId, index) {
  currentImageIndex[projectId] = index;
  updateGallery(projectId);
}

// ================ CV FUNCTION ================ 
function viewCVOnline() {
  window.open('ruta/a/tu/cv-online', '_blank');
}

// ================ LANGUAGE SWITCH HANDLER ================
function setupLanguageSwitch() {
  const langSwitch = document.querySelector('.lang-switch');
  if (!langSwitch) return;
  
  // Remover event listeners existentes
  const newLangSwitch = langSwitch.cloneNode(true);
  langSwitch.parentNode.replaceChild(newLangSwitch, langSwitch);
  
  // Agregar nuevos event listeners
  newLangSwitch.querySelectorAll('.lang-option').forEach(option => {
    option.addEventListener('click', function() {
      const selectedLang = this.getAttribute('data-lang');
      localStorage.setItem('lang', selectedLang);
      
      // Actualizar slider visual
      const slider = newLangSwitch.querySelector('.lang-slider');
      if (slider) {
        slider.style.left = selectedLang === 'es' ? '0%' : '50%';
      }
      
      // Recargar proyectos con nuevo idioma
      console.log("Cambiando idioma a:", selectedLang);
      loadProjects();
    });
  });
}

// ================ INITIALIZATION ================ 
document.addEventListener('DOMContentLoaded', () => {
  console.log("V1 Inicializando...");
  
  // Animaciones suaves
  const commands = document.querySelectorAll('.user-command');
  commands.forEach(cmd => {
    cmd.style.opacity = '0';
    setTimeout(() => {
      cmd.style.opacity = '1';
      cmd.style.transition = 'opacity 0.3s ease';
    }, 100);
  });
  
  // Configurar el switch de idioma
  setupLanguageSwitch();
  
  // Cargar proyectos iniciales
  loadProjects();
});

// // Debug functions
// console.log("V1 DEBUG");
// console.log("Idioma actual:", localStorage.getItem('lang'));

// window.debugProjects = function() {
//   console.log("Debug proyectos:");
//   console.log("Projects data:", projectsData);
//   console.log("Current image indexes:", currentImageIndex);
//   loadProjects();
// };

// // Forzar recarga de proyectos (para testing)
// window.reloadProjects = loadProjects;