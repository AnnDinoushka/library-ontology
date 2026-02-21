# 📖 Library Ontology Explorer

Semantic Web Assignment — Full Stack (OWL + Fuseki + Node.js + React)

---

## 📁 Folder Structure

```
library-ontology-app/
│
├── ontology/
│   └── library.owl                 ← Your Protégé OWL file
│
├── sparql/
│   └── queries.sparql              ← 10 competency questions (SPARQL)
│
├── backend/
│   ├── package.json
│   └── server.js                   ← Express API → queries Fuseki
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        └── App.jsx                 ← Full React UI
```

---

## 🧱 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Ontology   | OWL/RDF (built in Protégé)          |
| Triple Store | Apache Jena Fuseki                |
| Backend    | Node.js + Express                   |
| Frontend   | React + Vite                        |
| Query Language | SPARQL 1.1                     |

---

## 🚀 How to Run — Step by Step

### Step 1 — Download & Start Apache Jena Fuseki

1. Download from: https://jena.apache.org/download/
   (Look for: `apache-jena-fuseki-X.X.X.zip`)

2. Extract the zip file somewhere easy, e.g. your Desktop

3. Open a terminal in that folder and run:

**Mac/Linux:**
```bash
./fuseki-server --update --mem /library
```

**Windows:**
```cmd
fuseki-server.bat --update --mem /library
```

4. Open your browser → http://localhost:3030
   You should see the Fuseki web interface.

5. Click **"manage datasets"** → you should see `/library` listed.
   Click **"upload data"** → upload your `ontology/library.owl` file.

6. Go to **"query"** tab and test with:
```sparql
SELECT * WHERE { ?s ?p ?o } LIMIT 10
```
If you get results, Fuseki is working ✅

---

### Step 2 — Start the Backend

Open a **new terminal** (keep Fuseki running in the first one):

```bash
# Go into the backend folder
cd library-ontology-app/backend

# Install dependencies (only needed first time)
npm install

# Start the server
npm start
```

You should see:
```
✅ Backend running at http://localhost:4000
   Connecting to Fuseki: http://localhost:3030/library/sparql
```

Test it by opening in browser: http://localhost:4000/api/books
You should see JSON data ✅

---

### Step 3 — Start the Frontend

Open a **third terminal**:

```bash
# Go into the frontend folder
cd library-ontology-app/frontend

# Install dependencies (only needed first time)
npm install

# Start the dev server
npm run dev
```

You should see:
```
  VITE v5.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
```

Open http://localhost:3000 in your browser 🎉

---

## 🖥️ Frontend Features

| Tab | What it shows |
|-----|---------------|
| 📚 Books | All books with author, genre, publisher, year. Searchable. |
| ✅ Available | Book copies where `isAvailable = true` |
| 📋 Active Loans | Loans where `isReturned = false` |
| ⚠️ Overdue | Individuals of class `OverDueLoan` |
| 👥 Members | All members with type badge. Click "View History" for loans. |
| 🔍 Custom SPARQL | Write and run any SPARQL query live. Example queries included. |

---

## 🔗 API Endpoints (Backend)

| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/books | All books |
| GET | /api/copies/available | Available copies |
| GET | /api/loans/active | Active loans |
| GET | /api/loans/overdue | Overdue loans |
| GET | /api/members | All members |
| GET | /api/members/:id/loans | Loan history for a member |
| GET | /api/authors/stats | Book count per author |
| POST | /api/sparql | Run a custom SPARQL query |

---

## ⚠️ Common Issues

**"Connection Error" in the app**
→ Check that Fuseki is running AND the backend is running

**Fuseki: "No dataset found"**
→ Make sure you created the `/library` dataset and uploaded library.owl

**Port already in use**
→ Backend uses port 4000, Frontend uses 3000, Fuseki uses 3030
→ Make sure nothing else is using those ports

**Windows: `fuseki-server` not recognized**
→ Use `fuseki-server.bat` instead, or run `java -jar fuseki-server.jar --update --mem /library`
