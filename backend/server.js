const express = require('express');
const cors    = require('cors');
const axios   = require('axios');

const app  = express();
app.use(cors());
app.use(express.json());

// ── Fuseki endpoint ────────────────────────────────────────────────
const FUSEKI = process.env.FUSEKI_URL || 'http://localhost:3030/library/sparql';

// ── Prefix block matched to YOUR ontology IRI ─────────────────────
const PREFIX = `
PREFIX lib: <http://www.semanticweb.org/anner/ontologies/2026/1/untitled-ontology-14#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

// ── Helper: run a SPARQL SELECT query ─────────────────────────────
async function sparql(query) {
  const res = await axios.get(FUSEKI, {
    params:  { query: PREFIX + query },
    headers: { Accept: 'application/sparql-results+json' },
    timeout: 8000,
  });
  return res.data;
}

// ── Helper: safely extract binding value ──────────────────────────
const val = (b, k) => (b[k] ? b[k].value : null);

// ══════════════════════════════════════════════════════════════════
// GET /api/books   – all books with author, genre, publisher
// ══════════════════════════════════════════════════════════════════
app.get('/api/books', async (req, res) => {
  try {
    const data = await sparql(`
      SELECT ?title ?isbn ?year ?authorName ?genreName ?publisherName
      WHERE {
        ?book rdf:type lib:Book ;
              lib:title       ?title ;
              lib:isbn        ?isbn ;
              lib:publicationYear ?year ;
              lib:writtenBy   ?author ;
              lib:hasGenre    ?genre ;
              lib:publishedBy ?pub .
        ?author lib:authorName   ?authorName .
        ?genre  lib:genreName    ?genreName .
        ?pub    lib:publisherName ?publisherName .
      }
      ORDER BY ?title
    `);
    res.json(data.results.bindings.map(b => ({
      title:     val(b,'title'),
      isbn:      val(b,'isbn'),
      year:      val(b,'year'),
      author:    val(b,'authorName'),
      genre:     val(b,'genreName'),
      publisher: val(b,'publisherName'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/copies/available  – copies where isAvailable = true
// ══════════════════════════════════════════════════════════════════
app.get('/api/copies/available', async (req, res) => {
  try {
    const data = await sparql(`
      SELECT ?copyId ?bookTitle
      WHERE {
        ?copy lib:isAvailable true ;
              lib:copyId ?copyId ;
              lib:copyOf ?book .
        ?book lib:title ?bookTitle .
      }
      ORDER BY ?bookTitle
    `);
    res.json(data.results.bindings.map(b => ({
      copyId:    val(b,'copyId'),
      bookTitle: val(b,'bookTitle'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/loans/active  – unreturned loans
// ══════════════════════════════════════════════════════════════════
app.get('/api/loans/active', async (req, res) => {
  try {
    const data = await sparql(`
      SELECT ?memberName ?bookTitle ?loanDate ?dueDate
      WHERE {
        ?loan lib:borrowedBy  ?member ;
              lib:includesBook ?copy ;
              lib:loanDate     ?loanDate ;
              lib:dueDate      ?dueDate ;
              lib:isReturned   false .
        ?member lib:memberName ?memberName .
        ?copy   lib:copyOf     ?book .
        ?book   lib:title      ?bookTitle .
      }
      ORDER BY ?dueDate
    `);
    res.json(data.results.bindings.map(b => ({
      memberName: val(b,'memberName'),
      bookTitle:  val(b,'bookTitle'),
      loanDate:   val(b,'loanDate'),
      dueDate:    val(b,'dueDate'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/loans/overdue  – OverDueLoan individuals
// ══════════════════════════════════════════════════════════════════
app.get('/api/loans/overdue', async (req, res) => {
  try {
    const data = await sparql(`
      SELECT ?memberName ?bookTitle ?dueDate
      WHERE {
        ?loan rdf:type lib:OverDueLoan ;
              lib:borrowedBy  ?member ;
              lib:includesBook ?copy ;
              lib:dueDate      ?dueDate .
        ?member lib:memberName ?memberName .
        ?copy   lib:copyOf     ?book .
        ?book   lib:title      ?bookTitle .
      }
    `);
    res.json(data.results.bindings.map(b => ({
      memberName: val(b,'memberName'),
      bookTitle:  val(b,'bookTitle'),
      dueDate:    val(b,'dueDate'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/members  – all members with type
// ══════════════════════════════════════════════════════════════════
app.get('/api/members', async (req, res) => {
  try {
    const data = await sparql(`
      SELECT ?memberName ?memberId ?email ?type
      WHERE {
        ?member lib:memberName ?memberName ;
                lib:memberId   ?memberId ;
                lib:email      ?email .
        { ?member rdf:type lib:StudentMember . BIND("Student" AS ?type) }
        UNION
        { ?member rdf:type lib:FacultyMember . BIND("Faculty" AS ?type) }
      }
      ORDER BY ?memberName
    `);
    res.json(data.results.bindings.map(b => ({
      memberName: val(b,'memberName'),
      memberId:   val(b,'memberId'),
      email:      val(b,'email'),
      type:       val(b,'type'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/members/:id/loans  – loan history for one member
// ══════════════════════════════════════════════════════════════════
app.get('/api/members/:id/loans', async (req, res) => {
  try {
    const data = await sparql(`
      SELECT ?bookTitle ?loanDate ?dueDate ?returnDate ?isReturned
      WHERE {
        ?member lib:memberId "${req.params.id}" .
        ?loan lib:borrowedBy  ?member ;
              lib:includesBook ?copy ;
              lib:loanDate     ?loanDate ;
              lib:dueDate      ?dueDate ;
              lib:isReturned   ?isReturned .
        OPTIONAL { ?loan lib:returnDate ?returnDate . }
        ?copy lib:copyOf ?book .
        ?book lib:title  ?bookTitle .
      }
      ORDER BY DESC(?loanDate)
    `);
    res.json(data.results.bindings.map(b => ({
      bookTitle:  val(b,'bookTitle'),
      loanDate:   val(b,'loanDate'),
      dueDate:    val(b,'dueDate'),
      returnDate: val(b,'returnDate'),
      isReturned: val(b,'isReturned'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/authors/stats  – book count per author (CQ7)
// ══════════════════════════════════════════════════════════════════
app.get('/api/authors/stats', async (req, res) => {
  try {
    const data = await sparql(`
      SELECT ?authorName (COUNT(?book) AS ?bookCount)
      WHERE {
        ?author lib:authorName ?authorName .
        ?book   lib:writtenBy  ?author .
      }
      GROUP BY ?authorName
      ORDER BY DESC(?bookCount)
    `);
    res.json(data.results.bindings.map(b => ({
      author: val(b,'authorName'),
      count:  parseInt(val(b,'bookCount')),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/sparql  – custom query from the frontend UI
// ══════════════════════════════════════════════════════════════════
app.post('/api/sparql', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'No query provided' });
  try {
    const data = await sparql(query);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  console.log(`   Connecting to Fuseki: ${FUSEKI}`);
});
