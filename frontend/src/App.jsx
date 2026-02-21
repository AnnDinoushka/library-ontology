import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:4000/api";

// ─────────────────────────────────────────────
//  Shared: fetch hook
// ─────────────────────────────────────────────
function useFetch(url) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d  => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [url]);

  return { data, loading, error };
}

// ─────────────────────────────────────────────
//  Shared UI components
// ─────────────────────────────────────────────
const S = {
  // colours
  navy:   '#1a3a5c',
  navyD:  '#122844',
  teal:   '#0d9488',
  amber:  '#d97706',
  red:    '#dc2626',
  green:  '#16a34a',
  slate:  '#64748b',
  bg:     '#f0f4f8',
  white:  '#ffffff',
  border: '#e2e8f0',
};

function Card({ children, style }) {
  return (
    <div style={{
      background: S.white, borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      padding: '1.5rem', ...style
    }}>
      {children}
    </div>
  );
}

function Badge({ label, color = S.navy }) {
  const light = color + '22';
  return (
    <span style={{
      background: light, color, fontWeight: 600,
      padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem',
    }}>
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: S.slate }}>
      <div style={{
        display: 'inline-block', width: 36, height: 36,
        border: `4px solid ${S.border}`,
        borderTopColor: S.navy, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>Loading…</p>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      background: '#fef2f2', border: `1px solid #fca5a5`,
      borderRadius: 10, padding: '1rem 1.25rem',
      color: S.red, fontSize: '0.9rem', lineHeight: 1.6,
    }}>
      <strong>⚠ Connection Error</strong>
      <br />{msg}
      <br /><br />
      Make sure:
      <ol style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
        <li>Apache Jena Fuseki is running at <code>http://localhost:3030</code></li>
        <li>You uploaded <code>library.owl</code> to the <code>/library</code> dataset</li>
        <li>The backend is running: <code>cd backend &amp;&amp; npm start</code></li>
      </ol>
    </div>
  );
}

function Table({ columns, rows, emptyMsg = "No results found." }) {
  if (!rows || rows.length === 0)
    return <p style={{ color: S.slate, padding: '1.5rem 0', textAlign: 'center' }}>{emptyMsg}</p>;
  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${S.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: S.navy }}>
            {columns.map(c => (
              <th key={c} style={{
                padding: '11px 16px', textAlign: 'left',
                color: S.white, fontWeight: 600, whiteSpace: 'nowrap',
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{
              background: i % 2 === 0 ? '#f8fafc' : S.white,
              borderBottom: `1px solid ${S.border}`,
              transition: 'background 0.15s',
            }}>
              {Object.values(row).map((v, j) => (
                <td key={j} style={{ padding: '10px 16px', color: '#334155' }}>
                  {v ?? <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionTitle({ icon, title, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <span style={{ fontSize: '1.4rem' }}>{icon}</span>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: S.navy }}>{title}</h2>
      {count != null && (
        <span style={{
          marginLeft: 'auto', background: S.navy + '18',
          color: S.navy, fontWeight: 600, fontSize: '0.8rem',
          padding: '2px 10px', borderRadius: 20,
        }}>{count} result{count !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Tab: Books
// ─────────────────────────────────────────────
function BooksTab() {
  const { data, loading, error } = useFetch(`${API}/books`);
  const [search, setSearch] = useState('');

  const filtered = (data || []).filter(b =>
    [b.title, b.author, b.genre, b.publisher].some(v =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <Card>
      <SectionTitle icon="📚" title="All Books" count={data ? filtered.length : null} />
      <input
        placeholder="Search by title, author, genre…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '9px 14px', marginBottom: '1rem',
          border: `1px solid ${S.border}`, borderRadius: 8,
          fontSize: '0.9rem', outline: 'none',
        }}
      />
      {loading && <Spinner />}
      {error   && <ErrorBox msg={error} />}
      {data    && (
        <Table
          columns={['Title', 'Author', 'Genre', 'Publisher', 'Year', 'ISBN']}
          rows={filtered.map(b => ({
            title:     b.title,
            author:    b.author,
            genre:     <Badge label={b.genre} color={S.teal} />,
            publisher: b.publisher,
            year:      b.year,
            isbn:      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{b.isbn}</span>,
          }))}
        />
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Tab: Available Copies
// ─────────────────────────────────────────────
function AvailableTab() {
  const { data, loading, error } = useFetch(`${API}/copies/available`);
  return (
    <Card>
      <SectionTitle icon="✅" title="Available Book Copies" count={data?.length} />
      {loading && <Spinner />}
      {error   && <ErrorBox msg={error} />}
      {data    && (
        <Table
          columns={['Copy ID', 'Book Title']}
          rows={data.map(c => ({
            copyId:    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.copyId}</span>,
            bookTitle: c.bookTitle,
          }))}
          emptyMsg="All copies are currently on loan."
        />
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Tab: Active Loans
// ─────────────────────────────────────────────
function LoansTab() {
  const { data, loading, error } = useFetch(`${API}/loans/active`);

  function fmt(iso) {
    if (!iso) return '—';
    return iso.replace('T00:00:00', '').split('-').reverse().join('/');
  }

  return (
    <Card>
      <SectionTitle icon="📋" title="Active (Unreturned) Loans" count={data?.length} />
      {loading && <Spinner />}
      {error   && <ErrorBox msg={error} />}
      {data    && (
        <Table
          columns={['Member', 'Book', 'Loan Date', 'Due Date']}
          rows={data.map(l => ({
            member:   l.memberName,
            book:     l.bookTitle,
            loanDate: fmt(l.loanDate),
            dueDate:  <span style={{ color: S.amber, fontWeight: 600 }}>{fmt(l.dueDate)}</span>,
          }))}
          emptyMsg="No active loans."
        />
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Tab: Overdue
// ─────────────────────────────────────────────
function OverdueTab() {
  const { data, loading, error } = useFetch(`${API}/loans/overdue`);

  function fmt(iso) {
    if (!iso) return '—';
    return iso.replace('T00:00:00', '').split('-').reverse().join('/');
  }

  return (
    <Card>
      <SectionTitle icon="⚠️" title="Overdue Loans" count={data?.length} />
      {data && data.length > 0 && (
        <div style={{
          background: '#fff7ed', border: `1px solid #fed7aa`,
          borderRadius: 8, padding: '0.75rem 1rem',
          color: '#9a3412', marginBottom: '1rem', fontSize: '0.9rem',
        }}>
          🚨 <strong>{data.length}</strong> overdue loan{data.length !== 1 ? 's' : ''} — please follow up with the member{data.length !== 1 ? 's' : ''}.
        </div>
      )}
      {loading && <Spinner />}
      {error   && <ErrorBox msg={error} />}
      {data    && (
        <Table
          columns={['Member', 'Book Title', 'Due Date']}
          rows={data.map(l => ({
            member:  l.memberName,
            book:    l.bookTitle,
            dueDate: <span style={{ color: S.red, fontWeight: 600 }}>{fmt(l.dueDate)}</span>,
          }))}
          emptyMsg="🎉 No overdue loans!"
        />
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Tab: Members
// ─────────────────────────────────────────────
function MembersTab() {
  const { data, loading, error } = useFetch(`${API}/members`);
  const [selected, setSelected]   = useState(null);
  const [loans, setLoans]         = useState(null);
  const [loanLoading, setLoanLoading] = useState(false);

  function fmt(iso) {
    if (!iso) return null;
    return iso.replace('T00:00:00', '').split('-').reverse().join('/');
  }

  function viewHistory(memberId) {
    setSelected(memberId);
    setLoans(null);
    setLoanLoading(true);
    fetch(`${API}/members/${memberId}/loans`)
      .then(r => r.json())
      .then(d  => { setLoans(d); setLoanLoading(false); })
      .catch(() => setLoanLoading(false));
  }

  return (
    <>
      <Card style={{ marginBottom: '1.25rem' }}>
        <SectionTitle icon="👥" title="Library Members" count={data?.length} />
        {loading && <Spinner />}
        {error   && <ErrorBox msg={error} />}
        {data && (
          <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${S.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: S.navy }}>
                  {['Name','ID','Type','Email','Action'].map(c => (
                    <th key={c} style={{ padding:'11px 16px', textAlign:'left', color: S.white, fontWeight:600 }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((m, i) => (
                  <tr key={i} style={{
                    background: i % 2 === 0 ? '#f8fafc' : S.white,
                    borderBottom: `1px solid ${S.border}`,
                    outline: selected === m.memberId ? `2px solid ${S.navy}` : 'none',
                  }}>
                    <td style={{ padding:'10px 16px', fontWeight: 600 }}>{m.memberName}</td>
                    <td style={{ padding:'10px 16px', fontFamily:'monospace', fontSize:'0.82rem' }}>{m.memberId}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <Badge
                        label={m.type}
                        color={m.type === 'Faculty' ? S.navy : S.teal}
                      />
                    </td>
                    <td style={{ padding:'10px 16px', color: S.slate }}>{m.email}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <button
                        onClick={() => viewHistory(m.memberId)}
                        style={{
                          background: selected === m.memberId ? S.navyD : S.navy,
                          color: S.white, border: 'none',
                          padding: '5px 14px', borderRadius: 6,
                          cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >
                        {selected === m.memberId ? '▶ Viewing' : 'View History'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Card>
          <SectionTitle
            icon="📂"
            title={`Loan History — ${selected}`}
            count={loans?.length}
          />
          {loanLoading && <Spinner />}
          {loans && (
            <Table
              columns={['Book','Loan Date','Due Date','Return Date','Returned?']}
              rows={loans.map(l => ({
                book:       l.bookTitle,
                loanDate:   fmt(l.loanDate),
                dueDate:    fmt(l.dueDate),
                returnDate: fmt(l.returnDate),
                returned:   l.isReturned === 'true'
                  ? <Badge label="✓ Yes" color={S.green} />
                  : <Badge label="✗ No"  color={S.red}   />,
              }))}
              emptyMsg="No loan history for this member."
            />
          )}
        </Card>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
//  Tab: Custom SPARQL
// ─────────────────────────────────────────────
const DEFAULT_QUERY = `SELECT ?title ?authorName ?genreName
WHERE {
  ?book lib:title     ?title ;
        lib:writtenBy ?author ;
        lib:hasGenre  ?genre .
  ?author lib:authorName ?authorName .
  ?genre  lib:genreName  ?genreName .
}
ORDER BY ?title`;

const EXAMPLE_QUERIES = [
  {
    label: 'All books by genre',
    query: `SELECT ?title ?authorName ?genreName
WHERE {
  ?book lib:title     ?title ;
        lib:writtenBy ?author ;
        lib:hasGenre  ?genre .
  ?author lib:authorName ?authorName .
  ?genre  lib:genreName  ?genreName .
}
ORDER BY ?title`,
  },
  {
    label: 'Available copies',
    query: `SELECT ?copyId ?bookTitle
WHERE {
  ?copy lib:isAvailable true ;
        lib:copyId ?copyId ;
        lib:copyOf ?book .
  ?book lib:title ?bookTitle .
}`,
  },
  {
    label: 'Faculty borrow limits',
    query: `SELECT ?memberName ?maxLimit
WHERE {
  ?member rdf:type lib:FacultyMember ;
          lib:memberName ?memberName ;
          lib:membershipCategory ?mtype .
  ?mtype lib:maxBorrowLimit ?maxLimit .
}`,
  },
  {
    label: 'Books per author',
    query: `SELECT ?authorName (COUNT(?book) AS ?count)
WHERE {
  ?author lib:authorName ?authorName .
  ?book   lib:writtenBy  ?author .
}
GROUP BY ?authorName
ORDER BY DESC(?count)`,
  },
];

function SparqlTab() {
  const [query, setQuery]   = useState(DEFAULT_QUERY);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/sparql`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query }),
    })
      .then(r => r.json())
      .then(d  => { setResult(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [query]);

  const vars     = result?.head?.vars     || [];
  const bindings = result?.results?.bindings || [];

  return (
    <Card>
      <SectionTitle icon="🔍" title="Custom SPARQL Query" />

      {/* Example buttons */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {EXAMPLE_QUERIES.map(eq => (
          <button
            key={eq.label}
            onClick={() => setQuery(eq.query)}
            style={{
              background: '#f1f5f9', color: S.navy,
              border: `1px solid ${S.border}`, borderRadius: 6,
              padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
            }}
          >
            {eq.label}
          </button>
        ))}
      </div>

      <p style={{ color: S.slate, fontSize: '0.82rem', marginBottom: '0.5rem' }}>
        Use <code>lib:</code> prefix for your ontology properties. The backend adds all PREFIX declarations automatically.
      </p>

      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        rows={9}
        spellCheck={false}
        style={{
          width: '100%', fontFamily: "'Courier New', monospace",
          fontSize: '0.85rem', padding: '0.75rem',
          border: `1px solid ${S.border}`, borderRadius: 8,
          resize: 'vertical', outline: 'none',
          background: '#f8fafc', lineHeight: 1.6,
        }}
      />

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center' }}>
        <button
          onClick={run}
          disabled={loading}
          style={{
            background: S.navy, color: S.white,
            border: 'none', padding: '9px 24px',
            borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: '0.9rem',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '⏳ Running…' : '▶ Run Query'}
        </button>
        {result && (
          <span style={{ color: S.slate, fontSize: '0.85rem' }}>
            {bindings.length} row{bindings.length !== 1 ? 's' : ''} returned
          </span>
        )}
      </div>

      {error && <div style={{ marginTop: '1rem' }}><ErrorBox msg={error} /></div>}

      {result && bindings.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <Table
            columns={vars}
            rows={bindings.map(b =>
              Object.fromEntries(vars.map(v => [v, b[v]?.value ?? null]))
            )}
          />
        </div>
      )}
      {result && bindings.length === 0 && (
        <p style={{ marginTop: '1rem', color: S.slate }}>Query ran successfully but returned no results.</p>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Main App
// ─────────────────────────────────────────────
const TABS = [
  { id: 'books',     icon: '📚', label: 'Books'           },
  { id: 'available', icon: '✅', label: 'Available'       },
  { id: 'loans',     icon: '📋', label: 'Active Loans'    },
  { id: 'overdue',   icon: '⚠️', label: 'Overdue'         },
  { id: 'members',   icon: '👥', label: 'Members'         },
  { id: 'sparql',    icon: '🔍', label: 'Custom SPARQL'   },
];

export default function App() {
  const [tab, setTab] = useState('books');

  const content = {
    books:     <BooksTab />,
    available: <AvailableTab />,
    loans:     <LoansTab />,
    overdue:   <OverdueTab />,
    members:   <MembersTab />,
    sparql:    <SparqlTab />,
  };

  return (
    <div style={{ minHeight: '100vh', background: S.bg }}>

      {/* ── Header ── */}
      <header style={{ background: S.navy, color: S.white, padding: '0 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.1rem 0' }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            📖 Library Ontology Explorer
          </h1>
          <p style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: 3 }}>
            OWL/RDF · Apache Jena Fuseki · SPARQL · Semantic Web Assignment
          </p>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav style={{
        background: S.white,
        borderBottom: `1px solid ${S.border}`,
        overflowX: 'auto',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', gap: 0, padding: '0 1rem',
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'none', border: 'none',
                borderBottom: tab === t.id ? `3px solid ${S.navy}` : '3px solid transparent',
                color: tab === t.id ? S.navy : S.slate,
                fontWeight: tab === t.id ? 700 : 500,
                padding: '0.9rem 1.1rem',
                cursor: 'pointer', fontSize: '0.88rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
        {content[tab]}
      </main>

    </div>
  );
}
