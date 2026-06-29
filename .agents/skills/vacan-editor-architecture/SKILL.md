---
name: vacan-editor-architecture
description: Use when implementing, refactoring, or reviewing Vacan editor features so changes stay TDD-first, modular, Convex-safe, and maintainable across canvas, project persistence, templates, assets, export, and collaboration work.
---

# Vacan Editor Architecture

## Overview

Use this skill for non-trivial Vacan feature work. It captures the local
architecture rules that keep the Canva-like editor scalable while the product
surface grows.

## Workflow

1. Read `AGENTS.md`. If touching Convex code, read
   `convex/_generated/ai/guidelines.md` before edits.
2. Identify the narrow product feature being advanced. Keep each commit scoped
   to one coherent feature or foundation layer.
3. Write tests first for pure behavior whenever possible. Prefer tests under
   `src/editor/*.test.ts` for document, layout, snapping, project, export, and
   template logic.
4. Put deterministic editor behavior in framework-light modules under
   `src/editor/`. React components should orchestrate UI and delegate rules to
   those modules.
5. Keep external systems behind adapters. The canvas editor should accept
   injected persistence or service contracts instead of importing backend calls
   deep inside canvas logic.
6. Run `pnpm test`, `pnpm lint`, and `pnpm build` before each feature commit.
7. Commit with a clear message and push `main` after the feature is tested.

## Code Boundaries

- `src/editor/document.ts`: canonical in-memory document model and operations.
  Rich text defaults, image filter defaults, bounded style/filter updates, and
  image crop/mask plus element alignment/distribution and legacy normalization
  belong here, not in React.
- `src/editor/projects.ts`: project persistence helpers, summaries, validation,
  autosave fingerprints, and save payload shaping.
- `src/editor/assets.ts`: asset metadata helpers. Persist bytes in storage and
  keep document/table records limited to metadata and URLs.
- `src/editor/snapping.ts`: drag-time guides and snap math.
- `src/editor/templates.ts`: design formats, template definitions, document
  creation from templates, and resize math.
- `src/editor/history.ts`: undo/redo state transitions. Keep history generic
  and framework-light, then wire it from React.
- `src/editor/search.ts`: shared accent-insensitive search/filter helpers for
  templates, assets, projects, tools, and future libraries.
- `src/editor/export.ts`: export formats, filenames, MIME types, and quality
  defaults. Keep browser/PDF rendering in UI adapters.
- `src/editor/comments.ts`: comment draft/target/summary helpers. Keep
  collaborative metadata out of project canvas documents.
- `src/App.tsx`: UI composition and injected adapters. Avoid adding business
  logic here if it can be tested in `src/editor`.
- `convex/*.ts`: backend storage and query/mutation/action boundaries.

## Convex Rules

- Never use unbounded `.collect()` for project lists. Use `.take(n)` or
  pagination.
- List queries should return summaries when possible. Fetch full canvas data
  only for explicit open/edit flows.
- All public Convex functions need validators.
- Keep high-churn collaboration or presence state separate from stable project
  documents when collaboration is introduced.
- Comments and collaboration metadata should live in dedicated tables indexed by
  project, with bounded reads.

## UI Rules

- Preserve the Canva-like dense editor: sidebar tools, central canvas, compact
  controls, and direct manipulation.
- Do not turn editor features into marketing pages.
- Prefer visible, feature-complete controls over placeholder copy.
- Keep disabled or local-only states explicit when Convex is not configured.

## Testing Targets

- Document mutations: id stability, page counts, z-order, duplicate behavior.
- Text helpers: rich style defaults, bounded numeric style values, and legacy
  document normalization.
- Image helpers: filter defaults, crop defaults, mask defaults, bounded filter
  and crop values, and legacy image normalization.
- Layout helpers: snapping, resize, positioning, element alignment,
  distribution, and template placement.
- Project helpers: save payloads, validation, summary counts, autosave change
  detection.
- Asset helpers: filename normalization, supported image types, local fallback
  assets, and persisted asset summaries.
- History helpers: push, undo, redo, replace-current, future invalidation, and
  bounded past length.
- Search helpers: normalization, accent-insensitive matching, multiple fields,
  and custom accessors.
- Export helpers: file type, page selection, scaling, transparency options.
  Use dynamic imports for heavy PDF/export dependencies.
- Comment helpers: draft normalization, target descriptions, and record
  summaries.
