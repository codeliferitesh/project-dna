<p align="center">
  <img src="media/icon.png" alt="Project DNA Logo" width="160" />
</p>

# 🧬 Project DNA

> **Understand your entire codebase through a living project architecture map.**

Project DNA is a developer tool for Visual Studio Code that performs local static analysis on your codebase to generate an interactive, living architecture map. It analyzes structural hierarchy, code relationships, architectural roles, technologies, dependencies, configuration files, server APIs, and environment variables.

---

## 🔒 Privacy & Security First

* **100% Local Static Analysis:** All parsing and dependency graph algorithms run entirely on your local machine inside VS Code.
* **No External APIs or Telemetry:** Project DNA does not require external AI services, API keys, or cloud subscriptions for core codebase analysis.
* **Zero Code Uploads:** Your proprietary source code and files never leave your workstation.
* **Environment Secret Protection:** Secret values in `.env` files are never extracted, stored, logged, or displayed. Only variable names and scope (public vs private) are audited.

---

## ✨ Key Features & Analysis Engines

### 1. 📊 Project Overview Command Center
* **Living Architecture Dashboard:** Synthesizes file counts, directory tree metrics, architectural layers, and technology stacks into a unified summary.
* **Structural Hotspots:** Instantly flags high fan-in foundational modules and high fan-out orchestrators.
* **Cycle & Unresolved Counters:** Tracks circular dependencies and unresolved imports.
* **Scan Warnings:** Non-intrusively displays any non-fatal parsing notes or oversized files.

### 2. 📁 Workspace Structure & File Categorizer
* **Intelligent File Classification:** Automatically classifies files into `source`, `test`, `config`, `documentation`, `style`, `asset`, `lockfile`, and `data`.
* **Interactive File Tree:** Browse files with instant search and direct jump-to-file in the editor.
* **Deterministic Ignore Engine:** Ignores `node_modules`, `.git`, build outputs, cache directories, and minified bundles.

### 3. 🏛️ Architecture & Role Classifier
* **Architectural Tier Grouping:** Groups modules into Presentation, Routing, Application, Domain, Services, Data Access, Infrastructure, Configuration, and Testing layers.
* **Role Classification:** Classifies modules into Entry Points, Pages, Routes, Layouts, Components, Custom Hooks, Contexts, Services, Models, Repositories, Utilities, and more.
* **High-Level Interactions:** Categorizes relationships such as `renders`, `uses`, `calls`, `tests`, and `configures`.

### 4. 🕸️ Interactive Architecture Graph
* **Canvas Visualization:** Interactive pan/zoom graph with auto-fit viewport.
* **Deterministic Tier Layout:** Structured multi-row grid layout with collision-free coordinates.
* **Neighborhood Highlighting:** Hover or select any node to isolate its incoming and outgoing dependencies.
* **Cycle Highlighting:** Cycles are clearly highlighted with cycle length badges.
* **Side Details Drawer:** Inspect role confidence, layers, incoming/outgoing connections, and file paths.

### 5. 🔬 Evidence-Based Technology Detection
* **Multi-Ecosystem Detection:** Identifies languages, frameworks (Next.js, React, Vue, Express, FastAPI, Flask, Spring Boot), build tools, and databases.
* **Verifiable Evidence:** Provides exact file and manifest evidence for every detected technology.

### 6. 📦 Code Dependencies & Import Graph
* **Deep Import Resolution:** Supports TypeScript/JavaScript named and default imports, dynamic imports, CommonJS `require()`, JSX/TSX, and Python imports.
* **Generic Path Aliases:** Fully resolves TypeScript `@/*`, `~/*`, and custom path aliases defined in `tsconfig.json` or `jsconfig.json`.
* **Cycle Detection:** Tarjan algorithm detects direct ($A \to B \to A$) and multi-hop ($A \to B \to C \to A$) dependency cycles.
* **External Packages Catalog:** Aggregates and ranks npm/pip packages by usage frequency.

### 7. 🌐 API & Server Route Catalog
* **Next.js App & Pages Router:** Automatically derives REST endpoints from `route.ts` handlers and `pages/api` files.
* **Express, Python & Java:** Indexes routes from Express (`app.get`, `router.post`), FastAPI/Flask (`@app.get`), and Spring Boot (`@RestController`, `@GetMapping`).
* **HTTP Method Filters:** Clean filter bar for `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and other methods.

### 8. ⚙️ Configuration & Manifest Auditor
* **Categorized Project Manifests:** Categorizes configs across package managers, compilers, frameworks, bundlers, linters, formatters, and deployment platforms.

### 9. 🔐 Environment Variable Reference Auditor
* **Declared vs Referenced Status:** Identifies variables that are `declared_and_referenced`, `declared_only` (unused), or `referenced_only` (missing definition).
* **Public vs Private Scope:** Detects public client prefixes (`NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`) vs private server variables.

### 10. 🌿 Local Git Repository Integration
* **Repository Status:** Displays active branch, HEAD commit hash, configured remote origin, and working tree status locally from `.git`.

---

## 🚀 Installation & Usage

### Installing from VSIX
1. Download the `project-dna-0.1.0.vsix` package.
2. In VS Code, open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Click the `...` menu in the top-right corner of the Extensions view and select **Install from VSIX...**.
4. Select the `.vsix` file to install.

### Running Project DNA
1. Open any workspace folder in Visual Studio Code.
2. Click the **🧬 Project DNA** icon in the Activity Bar, or press `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS) and run:
   ```
   Project DNA: Open Dashboard
   ```
3. Click **Analyze Project** in the header or overview screen.
4. Navigate through the sidebar tabs to explore your architecture.

---

## ⚠️ Known Limitations of Static Analysis

Project DNA performs deterministic static analysis of source files and configurations. Please be aware of the following static analysis limitations:
* **Dynamic Route Definitions:** Dynamically computed route strings (e.g. `app.use('/api/' + getPrefix(), ...)`) are marked as dynamic/computed.
* **Runtime Imports:** Dynamic variable imports (e.g. `import(dynamicPath)`) cannot be statically resolved without runtime execution.
* **Polyglot Monorepo Depth:** Deep nested workspaces with custom non-standard compilers may require standard `tsconfig.json` or `jsconfig.json` path mappings for full alias resolution.

---

## 📄 License

This project is licensed under the MIT License (refer to the included LICENSE file).
