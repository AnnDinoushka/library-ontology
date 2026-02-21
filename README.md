# 📖 Library Management Ontology — Project Setup Guide

A Semantic Web application built with OWL/RDF, Apache Jena Fuseki, and Streamlit.

---

## 📁 Project Structure

```
library-ontology-project/
│
├── app.py                  ← Streamlit web application
├── requirements.txt        ← Python dependencies
│
├── ontology/
│   └── library.ttl         ← OWL ontology in Turtle format
│
└── sparql/
    └── queries.sparql      ← All 10 SPARQL competency questions
```

---

## ✅ Prerequisites

Before starting, make sure you have these installed:

| Tool | Version | Download |
|------|---------|----------|
| Java | 21 (LTS) | https://adoptium.net |
| Python | 3.10+ | https://python.org |
| Apache Jena Fuseki | 6.0.0 | https://jena.apache.org/download/ |

### Check Java version
```cmd
java -version
```
Must show `openjdk version "21"`. If not, download Java 21 from https://adoptium.net first.

---

## 🚀 Step 1 — Start Apache Jena Fuseki

### 1.1 — Extract Fuseki
- Download `apache-jena-fuseki-6.0.0.zip` from https://jena.apache.org/download/
- Right-click the zip → **Extract All** → extract to a simple path like `C:\fuseki`

### 1.2 — Open Command Prompt inside Fuseki folder
1. Open File Explorer and go to your extracted Fuseki folder
2. Click the **address bar** at the top
3. Type `cmd` and press **Enter**

### 1.3 — Start Fuseki and load your ontology

> ⚠️ **Important:** Replace the path below with the actual path to your `library.ttl` file.

**Windows:**
```cmd
fuseki-server.bat --update --file=C:/path/to/your/library.ttl /library
```

**Mac/Linux:**
```bash
./fuseki-server --update --file=/path/to/your/library.ttl /library
```

**Example (Windows):**
```cmd
fuseki-server.bat --update --file=C:/Users/YourName/Downloads/library.ttl /library
```

### 1.4 — Confirm Fuseki is running
You should see this in the terminal:
```
[INFO]  Fuseki     :: Apache Jena Fuseki 6.0.0
[INFO]  Server     :: Started - Press Ctrl+C to stop
```

Then open your browser and go to: **http://localhost:3030**

You should see the Fuseki web interface with `/library` listed as a dataset. ✅

---

## 📂 Step 2 — Upload Ontology to Fuseki (if not using --file flag)

If you started Fuseki with `--update --mem /library` instead of `--file`, upload the ontology manually:

1. Open **http://localhost:3030**
2. Click **"manage datasets"** in the top menu
3. Find `/library` in the list → click **"upload data"**
4. Click **"select files"** → choose your `library.ttl` file
5. Click **"Upload Now"**
6. You should see a green success message with a triple count

### Verify data is loaded
Go to **http://localhost:3030** → click **"query"** next to `/library` → run:
```sparql
SELECT * WHERE { ?s ?p ?o } LIMIT 5
```
If you see results, data is loaded correctly. ✅

---

## 🐍 Step 3 — Set Up Python Environment

Open a **new** Command Prompt window in your project folder.

### 3.1 — Navigate to project folder
```cmd
cd C:/path/to/your/project
```

### 3.2 — Create a virtual environment
```cmd
python -m venv venv
```

### 3.3 — Activate the virtual environment

**Windows:**
```cmd
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

You should see `(venv)` at the start of your command line.

### 3.4 — Install dependencies
```cmd
pip install -r requirements.txt
```

---

## 🌐 Step 4 — Run the Streamlit App

With the virtual environment still active, run:
```cmd
streamlit run app.py
```

The app will open automatically in your browser at: **http://localhost:8501** ✅

---


## ⚠️ Important Notes

- **Keep both terminal windows open** — one for Fuseki, one for Streamlit. Closing either will stop that service.
- **Fuseki does not run in the background** — you must start it every time you restart your computer.
- If you see **"Fuseki not running"** in the app sidebar, go back to Step 1 and start Fuseki again.
- Always use `--file=` to reload your ontology automatically on startup. The `--mem` flag stores data in memory only and loses it when Fuseki stops.

---


## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Ontology Language | OWL 2 / RDF (Turtle format) |
| Ontology Editor | Protégé 5.x |
| Triple Store | Apache Jena Fuseki 6.0.0 |
| Query Language | SPARQL 1.1 |
| Backend | Python + requests library |
| Frontend | Streamlit |
| Runtime | Java 21 (for Fuseki) |
