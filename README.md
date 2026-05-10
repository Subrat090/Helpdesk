# Multi-Language Rural Helpdesk Agent

Full-stack chatbot for rural users with:
- React (Vite) + TailwindCSS frontend
- Node.js + Express backend
- Static JSON data (no database)
- OpenAI fallback for complex queries
- Voice input/output using Web Speech API

## Project Structure

```text
backend/
  data/
    schemes.json
    jobs.json
    farming.json
  routes/
  controllers/
  utils/
  server.js

frontend/
  src/
    components/
    pages/
    services/
```

## Setup Instructions

1. Install dependencies
   - Backend:
     ```bash
     cd backend
     npm install
     ```
   - Frontend:
     ```bash
     cd ../frontend
     npm install
     ```

2. Configure environment
   - Copy `backend/.env.example` to `backend/.env`
   - Add your Gemini key:
     ```env
     GEMINI_API_KEY=your_gemini_api_key_here
     ```
   - If no key is provided, app still works with rule-based logic.

3. Run backend
   ```bash
   cd backend
   npm run dev
   ```

4. Run frontend (new terminal)
   ```bash
   cd frontend
   npm run dev
   ```

5. Open app
   - Visit [http://localhost:5173](http://localhost:5173)

## API Endpoints

- `POST /api/chat` - Chat endpoint with intent detection + OpenAI fallback
- `GET /api/schemes` - Government schemes list
- `GET /api/schemes/latest` - Latest schemes (returns full latest list; optional `?limit=10`)
- `POST /api/schemes/recommend` - Best scheme recommendations by profile (`name`, `age`, `income`, `gender`)
- `GET /api/jobs` - Government jobs list
- `GET /api/farming` - Farming tips list

### Recommendation request example

```json
{
  "name": "Ravi",
  "age": 29,
  "income": 220000,
  "gender": "male",
  "limit": 5
}
```

## Intent Rules

- `scheme`, `yojana`, `योजना` -> schemes data
- `job`, `naukri`, `नौकरी` -> jobs data
- `crop`, `kheti`, `खेती` -> farming data
- Otherwise:
  - OpenAI response (if key available)
  - Hindi fallback message (if key unavailable or unclear query)

## Voice Features

- Mic button uses Web Speech API for speech-to-text
- Speaker button on bot messages uses text-to-speech
- Works best in Chromium-based browsers
