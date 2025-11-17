// ===============================================
// v2/commands.js — Sistema de comandos del terminal
// ===============================================

const commands = {

    // ==========================
    //        pwd
    // ==========================
    pwd: {
        execute: () => {
            const path =
                terminal.currentPath === "/"
                    ? "/home/developer"
                    : "/home/developer" + terminal.currentPath;

            addOutput(path, "success-output");
        },
    },

    // ==========================
    //        whoami
    // ==========================
    whoami: {
        execute: async () => {
            const lang = localStorage.getItem("lang") || "es";
            const data = await loadJson(lang, "whoami");

            if (!data || !data[lang]) {
                addOutput(["Error cargando información"], "error-output");
                return;
            }

            addOutput(Object.values(data[lang]), "info-output");
        },
    },

    // ==========================
    //        ls -la
    // ==========================
    "ls -la": {
        execute: () => {
            const currentDir = navigatePath(terminal.currentPath);

            if (!currentDir || currentDir.type !== "directory") {
                addOutput("ls: No such directory", "error-output");
                return;
            }

            const files = [
                "drwxr-xr-x  developer  staff    4096  .",
                "drwxr-xr-x  developer  staff    4096  ..",
            ];

            for (const [name, item] of Object.entries(currentDir.files)) {
                if (item.type === "directory") {
                    files.push(`drwxr-xr-x  developer  staff    4096  ${name}/`);
                } else if (item.type === "project") {
                    files.push(`-rw-r--r--  developer  staff    2048  ${name}`);
                } else {
                    files.push(`-rw-r--r--  developer  staff    1024  ${name}`);
                }
            }

            addOutput(files, "success-output");
        },
    },

    // ==========================
    //        ls
    // ==========================
    ls: {
        execute: async () => {
            const lang = localStorage.getItem("lang") || "es";
            const errorsData = await loadJson(lang, "errors");
            const lsErrors = errorsData?.[lang]?.errors?.ls;

            const currentDir = navigatePath(terminal.currentPath);

            if (!currentDir || currentDir.type !== "directory") {
                addOutput(lsErrors?.noDir || "ls: No such directory", "error-output");
                return;
            }

            const files = Object.keys(currentDir.files).map((name) => {
                const item = currentDir.files[name];
                return item.type === "directory" ? `${name}/` : name;
            });

            if (files.length > 0) {
                addOutput(files.join("  "), "directory-output");
            }
        },
    },

    // ==========================
    //        cd
    // ==========================
    cd: {
        execute: async (args) => {
            const lang = localStorage.getItem("lang") || "es";
            const errorsData = await loadJson(lang, "errors");
            const cdErrors = errorsData?.[lang]?.errors?.cd;

            const path = args ? args.trim() : "";

            let previousPath = terminal.currentPath;

            // cd sin argumentos → vuelve a raíz
            if (!path) {
                terminal.currentPath = "/";
            }
            // cd ..
            else if (path === "..") {
                const parts = terminal.currentPath.split("/").filter(Boolean);
                parts.pop();
                terminal.currentPath = "/" + parts.join("/") || "/";
            }
            // cd /ruta/absoluta
            else if (path.startsWith("/")) {
                terminal.currentPath = path;
            }
            // cd ruta/relativa
            else {
                terminal.currentPath =
                    terminal.currentPath === "/"
                        ? `/${path}`
                        : `${terminal.currentPath}/${path}`;
            }

            const dir = navigatePath(terminal.currentPath);

            if (!dir || dir.type !== "directory") {
                const msg =
                    cdErrors?.noDir?.replace("{path}", path) ||
                    `cd: No such directory: ${path}`;

                addOutput(msg, "error-output");
                terminal.currentPath = previousPath; // restaurar
            }

            updatePrompt();
        },
    },

    // ==========================
    //        cat
    // ==========================
    cat: {
        execute: async (args) => {
            const path = args.trim();

            if (!path) {
                const lang = localStorage.getItem("lang") || "es";
                const errorsData = await loadJson(lang, "errors");
                addOutput(
                    errorsData?.[lang]?.errors?.cat?.noFile || "cat: No file specified",
                    "error-output"
                );
                return;
            }

            // cat desde /projects — abrir galería
            if (terminal.currentPath === "/projects") {
                const projectData = await getProjectData(path);
                if (projectData) return displayProjectGallery(path, projectData);
            }

            // cat projects/nombre
            if (path.startsWith("projects/")) {
                const projectName = path.replace("projects/", "");
                const projectData = await getProjectData(projectName);
                if (projectData) return displayProjectGallery(projectName, projectData);
            }

            // Archivos normales
            const contentMap = {
                "bio.txt": await getFileContent("bio.txt"),
                "skills.txt": await getFileContent("skills.txt"),
                "contact.txt": await getFileContent("contact.txt"),
            };

            if (contentMap[path]) {
                addOutput(contentMap[path], "success-output");
                return;
            }

            const lang = localStorage.getItem("lang") || "es";
            const errorsData = await loadJson(lang, "errors");
            const template =
                errorsData?.[lang]?.errors?.cat?.noFile ||
                "cat: {file}: No such file";

            addOutput(template.replace("{file}", path), "error-output");
        },
    },

    // ==========================
    //        cat projects
    // ==========================
    "cat projects": {
        execute: async () => {
            const lang = localStorage.getItem("lang") || "es";
            const errorsData = await loadJson(lang, "errors");
            const catErrors = errorsData?.[lang]?.errors?.catProjects;

            const output = [catErrors.separator];

            const projectsData = await loadJson(lang, "projects");
            if (projectsData?.[lang]) {
                for (const [name, project] of Object.entries(projectsData[lang])) {
                    output.push(`📁 ${project.title}`);
                    output.push(`   ${project.description}`);
                    output.push(catErrors.seeGallery.replace("{name}", name));
                    output.push("");
                }
            }

            output.push(catErrors.separator);

            addOutput(output, "info-output");
        },
    },

    // ==========================
    //        skills --all
    // ==========================
    "skills --all": {
        execute: async () => {
            const content = await getFileContent("skills.txt");
            addOutput(content.split("\n"), "info-output");
        },
    },

    // ==========================
    //        contact
    // ==========================
    contact: {
        execute: async () => {
            const content = await getFileContent("contact.txt");
            addOutput(content.split("\n"), "success-output");
        },
    },

    // ==========================
    //        wget cv.pdf
    // ==========================
    "wget cv.pdf": {
        execute: async () => {
            const lang = localStorage.getItem("lang") || "es";
            const data = await loadJson(lang, "wget");

            if (!data?.[lang]) {
                addOutput(["Error descargando CV"], "error-output");
                return;
            }

            addOutput(Object.values(data[lang]), "success-output");
        },
    },

    // ==========================
    //        help
    // ==========================
    help: {
        execute: async () => {
            const lang = localStorage.getItem("lang") || "es";
            const cmds = (await loadJson(lang, "availableCommands"))[lang];

            const lines = [
                "═══════════════════════════════════════",
                cmds.helpTitle,
                "═══════════════════════════════════════",
                `pwd              - ${cmds.list.pwd}`,
                `whoami           - ${cmds.list.whoami}`,
                `ls               - ${cmds.list.ls}`,
                `ls -la           - ${cmds.list.ls_la}`,
                `cd <dir>         - ${cmds.list.cd}`,
                `cd ..            - ${cmds.list.cd_back}`,
                `cat <archivo>    - ${cmds.list.cat}`,
                `skills --all     - ${cmds.list.skills_all}`,
                `contact          - ${cmds.list.contact}`,
                `wget cv.pdf      - ${cmds.list.wget}`,
                `clear            - ${cmds.list.clear}`,
                `help             - ${cmds.list.help}`,
                "═══════════════════════════════════════",
            ];

            addOutput(lines, "info-output");
        },
    },

    // ==========================
    //        clear
    // ==========================
    clear: {
        execute: () => {
            terminal.terminalBody.innerHTML = "";
            terminal.lineCount = 0;
        },
    },
};
