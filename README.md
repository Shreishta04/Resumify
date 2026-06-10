# Resumify

Upload your resume in any format. AI converts it to Jake Gutierrez's LaTeX resume template. Edit live, chat with AI to refine, download as PDF.

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in your API keys:
   - `GEMINI_API_KEY` — free from https://aistudio.google.com
   - `GROQ_API_KEY` — free from https://console.groq.com
4. `npm run dev`
5. Open http://localhost:3000

## Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel at https://vercel.com/new
3. Add environment variables in Vercel dashboard: `GEMINI_API_KEY` and `GROQ_API_KEY`
4. Deploy

## Tech Stack

- **Framework**: Next.js 14 App Router (TypeScript)
- **Styling**: Tailwind CSS + custom CSS variables
- **AI Conversion**: Google Gemini 2.5 Flash
- **AI Chat**: Groq (Llama 3.1 8B) — streaming
- **Editor**: Monaco Editor with LaTeX syntax
- **PDF Compile**: latexonline.cc REST API
- **Parsing**: pdf-parse (PDF), mammoth (DOCX)
