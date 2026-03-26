# StudentDB — IIT Chicago AI Academic Platform

An AI-powered academic management platform for IIT Chicago. Features Text-to-SQL querying and RAG-based document intelligence on top of a student/course database.

---

## Features

- **Dashboard** — Analytics overview with GPA distribution, graduation year trends, and department breakdown charts
- **Student Management** — Full CRUD for student records (name, email, GPA, department, graduation year, credits)
- **Course Management** — Full CRUD for academic courses (name, credits, instructor, enrollment, department)
- **SQL Agent** — Natural language to SQL queries powered by AI. Ask anything about the database in plain English
- **Doc Intel (RAG)** — Upload documents and ask questions about their content using Retrieval-Augmented Generation
- **Reports** — Analytics reports, department performance, honor roll, academic probation, CSV export, and PDF generation
- **Schema Viewer** — Browse the PostgreSQL database schema and table structure
- **Query History** — View all previous SQL Agent queries and their generated SQL

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Charts | Recharts |
| Fonts | Outfit + DM Mono (Google Fonts) |

---

## Project Structure

```
studentdb/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/
│   │   └── client.js          # Axios instance + all API calls
│   ├── components/
│   │   ├── Layout.jsx          # App shell with sidebar
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   └── ProtectedRoute.jsx  # Auth guard
│   ├── context/
│   │   └── AuthContext.jsx     # Auth state (login/logout/user)
│   ├── pages/
│   │   ├── Login.jsx           # Login page
│   │   ├── Dashboard.jsx       # Analytics dashboard
│   │   ├── Students.jsx        # Student management
│   │   ├── Courses.jsx         # Course management
│   │   ├── AgentPage.jsx       # SQL Agent chat interface
│   │   ├── RagPage.jsx         # Doc Intel / RAG chat
│   │   ├── Reports.jsx         # Reports & exports
│   │   ├── Schema.jsx          # Database schema viewer
│   │   └── History.jsx         # Query history
│   ├── App.jsx                 # Root component + routes
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles + Tailwind
├── index.html
├── package.json
├── vite.config.js              # Vite config + API proxy
├── tailwind.config.js          # Custom theme (colors, fonts)
└── postcss.config.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A running backend API at `http://localhost:8000` (or update `vite.config.js`)

### Installation

```bash
# Clone the repo
git clone https://github.com/DeepeshkumarApparSenthilkumar/studentdb-AI.git
cd studentdb-AI

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder, ready to deploy to Vercel, Netlify, or any static host.

---

## API Endpoints

The frontend proxies all `/api/*` requests to your backend. Expected endpoints:

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET/POST | `/api/students` | List / create students |
| PUT/DELETE | `/api/students/:id` | Update / delete student |
| GET | `/api/students/departments/list` | List departments |
| GET/POST | `/api/courses` | List / create courses |
| PUT/DELETE | `/api/courses/:id` | Update / delete course |
| POST | `/api/agent/query` | Run natural language SQL query |
| GET | `/api/agent/history` | Query history |
| GET | `/api/agent/stats` | Agent stats |
| GET | `/api/agent/schema` | Database schema |
| POST | `/api/rag/upload` | Upload document |
| POST | `/api/rag/query` | Query documents |
| GET | `/api/rag/docs` | List uploaded docs |
| GET | `/api/reports/analytics` | Analytics data |
| GET | `/api/reports/department-performance` | Dept performance |
| GET | `/api/reports/export/csv` | Export students CSV |

---

## Environment

Copy `.env.example` to `.env` and set your backend URL:

```env
VITE_API_URL=http://localhost:8000
```

The dev server proxy is configured in `vite.config.js`:

```js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
},
```

---

## Design System

The app uses a custom dark cyberpunk theme defined in `tailwind.config.js`:

| Token | Color | Usage |
|---|---|---|
| `bg` | `#05070f` | Page background |
| `surface` | `#0c0f1e` | Cards, sidebar |
| `surface2` | `#111827` | Inputs, hover states |
| `border` | `#1e2640` | Borders |
| `cyan` | `#00e5c8` | Primary accent |
| `blue` | `#3d7eff` | Buttons, active states |
| `green` | `#39d98a` | Success, RAG |
| `orange` | `#ff8c42` | Warning, courses |
| `red` | `#ff4d6a` | Error, delete |

---

## Deployment

This project is deployed on **Vercel** at [https://studentdb-delta.vercel.app](https://studentdb-delta.vercel.app).

To deploy your own instance:

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Set the framework preset to **Vite**
4. Add environment variables as needed
5. Deploy

---

## License

MIT
