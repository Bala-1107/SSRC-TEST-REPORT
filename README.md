# Proctor Compaction Test — fixed standalone package

This package was prepared from the supplied Claude ZIP.

## Why the original `npm install` failed
The supplied `proctor/` directory is a source module and does not contain `package.json`.
This folder is a runnable Vite React project, so `npm install` can be run here.

## Run
```powershell
npm install
npm run dev
```

## Important
For integration into the existing Quotation/Test Report application, copy:
`src/proctor/`
into the existing app's `src/modules/proctor/` (or equivalent), and install the dependencies required by the existing project.

The original module/template assets are preserved.
