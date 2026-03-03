---
name: visual-spec-to-skill
description: >
  Generates a project-specific `components-build` skill from a visual specification document and mockup images.
  Use this to bootstrap a design system and component guidelines for a new project, automating the creation of
  a comprehensive guide for UI development agents.
license: MIT
---

# Visual Spec to Skill Generator

This skill provides a standardized workflow for an agent to automatically generate a new, project-specific `components-build` skill. The agent will analyze a visual specification document, mockup images, and other provided resources to produce a complete skill that guides other agents in building UI components with a consistent visual identity.

---

## Workflow

The process is divided into four distinct phases. Follow them sequentially.

### Phase 1: Ingestion & Analysis

**Goal:** Understand the project's visual identity and technical requirements.

1.  **Read Documentation:**
    - Read the main visual specification document (e.g., `visual-spec.md`).
    - Read the Product Requirements Document (PRD) if provided.

2.  **Analyze Mockups:**
    - Use the `file` tool with `action="view"` on all provided mockup images (`.png`, `.jpg`).
    - For each image, identify and document core visual elements.

3.  **Explore External Resources:**
    - If the documentation mentions external UI libraries (e.g., `ui.tripled.work`) or theme generators (e.g., `tweakcn.com`), use the `browser` tool to visit and explore them.

4.  **Synthesize Findings:**
    - Create a temporary file named `design_notes.md`.
    - In this file, synthesize all your findings into a structured summary. This is the most critical step. The summary MUST include:
        - **Color Palette:** List all primary, secondary, accent, and semantic colors (success, destructive, warning) with their hex codes.
        - **Typography:** Font families, sizes, and weights for different text roles (headings, body, captions).
        - **Core Style Attributes:** Border radius, spacing units, and shadow styles.
        - **Component Inventory:** List every unique, reusable component identified in the mockups (e.g., `KpiCard`, `ArrearsBanner`, `PaymentChannelItem`, `BottomNav`).
        - **Layout Patterns:** Describe the main layout structures (e.g., centered auth layout, mobile dashboard layout, responsive breakpoints).

### Phase 2: Skill Scaffolding

**Goal:** Create the necessary file structure for the new skill.

1.  **Clone Project Repo:** If the user has specified a GitHub repository for the project, clone it.

2.  **Create Skill Directory:**
    - Inside the project repository (or in `/home/ubuntu/` if no repo), create the skill directory structure.
    - The name should be `{project-name}-components-build`.
    - Use `mkdir -p skills/{project-name}-components-build/rules`.

3.  **Create Rule Files:**
    - `touch` the following empty files inside the `rules/` directory:
        - `design-tokens.md`
        - `styling.md`
        - `components.md`
        - `accessibility.md`

4.  **Create Root Files:**
    - `touch` the following empty files in the skill's root directory:
        - `SKILL.md`
        - `README.md`
        - `AGENTS.md`

5.  **Copy Mockups:**
    - Create a `docs/wireframe` directory in the project repo.
    - Copy all user-provided mockup images into this directory, giving them descriptive names (e.g., `login.png`, `dashboard.png`).

### Phase 3: Content Generation

**Goal:** Populate the created files with detailed, project-specific guidelines based on `design_notes.md`.

1.  **Generate `rules/design-tokens.md`:**
    - Detail the full color palette with semantic meanings.
    - Specify the typography stack and type scale.
    - Document spacing, radius, and shadow systems.

2.  **Generate `rules/styling.md`:**
    - Provide the code for the `cn()` utility.
    - Explain the convention for using CVA (`class-variance-authority`).
    - Define the mobile-first responsive styling approach.
    - Include rules for styling financial data (e.g., using `font-mono`).

3.  **Generate `rules/components.md`:**
    - This is the most detailed file. For **each component** in your `design_notes.md` inventory:
        - Provide the full, production-ready React/TSX code for the component.
        - Include a usage example.
        - Reference the mockup image it corresponds to.
    - For **each screen** (e.g., Login, Dashboard), describe the layout and composition of components.

4.  **Generate `rules/accessibility.md`:**
    - Mandate minimum touch target sizes (44x44px).
    - Provide code examples for associating labels with inputs.
    - Show how to use ARIA attributes for validation, dialogs, and live regions.
    - Explain focus management for modals and drawers.

5.  **Generate `SKILL.md` (the main entrypoint):**
    - Write the YAML frontmatter (`name`, `description`).
    - Write a brief abstract.
    - Create a table of contents for the rules.
    - Provide a **Quick Reference** section containing the most critical code snippets:
        - The full CSS variables for `globals.css`.
        - The full `tailwind.config.ts` configuration.
        - The code for the primary `Button` and `Card` components.
        - A summary of the layout patterns.

6.  **Generate `README.md`:**
    - Write a brief, human-readable overview of the skill, its purpose, and structure.

7.  **Generate `AGENTS.md`:**
    - This is the final, compiled document for agent consumption.
    - Concatenate all the individual rule files into this single file.
    - `cat skills/{project-name}-components-build/rules/*.md > skills/{project-name}-components-build/AGENTS.md`

### Phase 4: Delivery

**Goal:** Commit the skill to the repository and notify the user.

1.  **Commit to Git:**
    - `git add .`
    - Write a comprehensive commit message summarizing the new skill.
    - `git push`

2.  **Notify User:**
    - Use the `message` tool with `type="result"`.
    - Announce that the skill has been created and pushed to the repository.
    - Provide a summary of the skill's structure and key features.
    - Attach the main `SKILL.md` and the compiled `AGENTS.md` to the message.
