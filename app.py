import streamlit as st
import requests
import pandas as pd

# ── Page config ───────────────────────────────────────────────────
st.set_page_config(
    page_title="Library Ontology Explorer",
    page_icon="📖",
    layout="centered",
)

# ── Constants ─────────────────────────────────────────────────────
FUSEKI = "http://localhost:3030/library/sparql"
IRI    = "http://www.semanticweb.org/anner/ontologies/2026/1/untitled-ontology-14#"

PREFIX = f"""
PREFIX lib: <{IRI}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
"""

# ── CSS ───────────────────────────────────────────────────────────
st.markdown("""
<style>
  .block-container { max-width: 860px; padding-top: 1.5rem; }
  .logo  { text-align:center; font-size:2.2rem; font-weight:800; color:#1a3a5c; margin-bottom:0; }
  .sub   { text-align:center; color:#64748b; font-size:0.88rem; margin-bottom:1.5rem; }
  .badge { background:#e0f2fe; color:#0369a1; padding:2px 10px;
           border-radius:20px; font-size:0.8rem; font-weight:600; }
</style>
""", unsafe_allow_html=True)


# ── Core SPARQL runner ────────────────────────────────────────────
def sparql(query: str) -> pd.DataFrame:
    full = PREFIX + query
    r = requests.get(
        FUSEKI,
        params={"query": full},
        headers={"Accept": "application/sparql-results+json"},
        timeout=10,
    )
    r.raise_for_status()
    js   = r.json()
    cols = js["head"]["vars"]
    rows = [
        {c: b[c]["value"] if c in b else "" for c in cols}
        for b in js["results"]["bindings"]
    ]
    return pd.DataFrame(rows, columns=cols)


def clean_date(v):
    return str(v).replace("T00:00:00", "") if v else ""


def fuseki_online():
    try:
        requests.get("http://localhost:3030/$/ping", timeout=2)
        return True
    except Exception:
        return False


def show(df: pd.DataFrame, empty="No data found."):
    if df is None or df.empty:
        st.info(empty)
    else:
        st.dataframe(df, use_container_width=True, hide_index=True)
        st.caption(f"{len(df)} row{'s' if len(df) != 1 else ''}")


# ══════════════════════════════════════════════════════════════════
#  HEADER
# ══════════════════════════════════════════════════════════════════
st.markdown('<p class="logo">📖 Library Explorer</p>', unsafe_allow_html=True)
st.markdown('<p class="sub">Semantic Web · OWL/RDF · Apache Jena Fuseki · SPARQL</p>',
            unsafe_allow_html=True)

if fuseki_online():
    st.success("✅ Fuseki connected  —  dataset: `/library`")
else:
    st.error("❌ Fuseki is not running.\n\nStart it: `fuseki-server.bat --update --mem /library`")
    st.stop()

st.markdown("---")

# ══════════════════════════════════════════════════════════════════
#  DEBUG PANEL
# ══════════════════════════════════════════════════════════════════
with st.expander("🔧 Debug — verify Fuseki has data"):
    st.caption("Use these to confirm your OWL data is correctly loaded.")

    if st.button("Count all triples"):
        try:
            df_count = sparql("SELECT (COUNT(*) AS ?total) WHERE { ?s ?p ?o }")
            total = df_count["total"].iloc[0] if not df_count.empty else "0"
            if int(total) == 0:
                st.error("0 triples found — upload library.owl to Fuseki first.")
            else:
                st.success(f"✅ {total} triples loaded.")
        except Exception as e:
            st.error(f"Error: {e}")

    if st.button("List all book titles"):
        try:
            df_t = sparql("""
                SELECT ?book ?title WHERE {
                  ?book rdf:type lib:Book .
                  OPTIONAL { ?book lib:title ?title . }
                }
            """)
            show(df_t, "No books found — is the data loaded?")
        except Exception as e:
            st.error(f"Error: {e}")

    if st.button("Show raw boolean values (isAvailable)"):
        try:
            df_bool = sparql("""
                SELECT ?copy ?isAvailable WHERE {
                  ?copy lib:isAvailable ?isAvailable .
                }
            """)
            show(df_bool, "No isAvailable data found.")
            st.caption("Check the exact value — should be 'true' or 'false' as string")
        except Exception as e:
            st.error(f"Error: {e}")

st.markdown("---")

# ══════════════════════════════════════════════════════════════════
#  SEARCH
# ══════════════════════════════════════════════════════════════════
st.markdown("### 🔎 Search")
st.caption("Search by book title, author name, genre, or member name")

term = st.text_input(
    "search",
    placeholder="e.g.  Tolkien   /   Fantasy   /   Kasun",
    label_visibility="collapsed",
)

if term:
    found = False

    # ── Search books ──────────────────────────────────────────────
    try:
        df_b = sparql(f"""
            SELECT DISTINCT ?title ?authorName ?genreName ?year
            WHERE {{
              ?book rdf:type lib:Book .
              OPTIONAL {{ ?book lib:title           ?title . }}
              OPTIONAL {{ ?book lib:publicationYear ?year  . }}
              OPTIONAL {{ ?book lib:writtenBy ?author .
                          ?author lib:authorName ?authorName . }}
              OPTIONAL {{ ?book lib:hasGenre ?genre .
                          ?genre lib:genreName ?genreName . }}
              FILTER(
                CONTAINS(LCASE(COALESCE(STR(?title),      "")), LCASE("{term}")) ||
                CONTAINS(LCASE(COALESCE(STR(?authorName), "")), LCASE("{term}")) ||
                CONTAINS(LCASE(COALESCE(STR(?genreName),  "")), LCASE("{term}"))
              )
            }}
            ORDER BY ?title
        """)
        if not df_b.empty:
            found = True
            st.markdown(f"**📚 Books** &nbsp;<span class='badge'>{len(df_b)} found</span>",
                        unsafe_allow_html=True)
            df_b.columns = ["Title", "Author", "Genre", "Year"]
            show(df_b)
    except Exception as e:
        st.error(f"Book search error: {e}")

    # ── Search members ────────────────────────────────────────────
    try:
        df_m = sparql(f"""
            SELECT DISTINCT ?memberName ?memberId ?email ?type
            WHERE {{
              ?member lib:memberName ?memberName ;
                      lib:memberId   ?memberId .
              OPTIONAL {{ ?member lib:email ?email . }}
              {{ ?member rdf:type lib:StudentMember . BIND("Student" AS ?type) }}
              UNION
              {{ ?member rdf:type lib:FacultyMember . BIND("Faculty" AS ?type) }}
              FILTER(CONTAINS(LCASE(STR(?memberName)), LCASE("{term}")))
            }}
        """)
        if not df_m.empty:
            found = True
            st.markdown(f"**👥 Members** &nbsp;<span class='badge'>{len(df_m)} found</span>",
                        unsafe_allow_html=True)
            df_m.columns = ["Name", "ID", "Email", "Type"]
            show(df_m)
    except Exception as e:
        st.error(f"Member search error: {e}")

    if not found:
        st.info(f'No results for **"{term}"**. Try another keyword.')

st.markdown("---")

# ══════════════════════════════════════════════════════════════════
#  BROWSE BUTTONS
# ══════════════════════════════════════════════════════════════════
st.markdown("### 🗂️ Browse")

c1, c2, c3 = st.columns(3)
btn_books   = c1.button("📚 All Books")
btn_copies  = c2.button("✅ Available Copies")
btn_loans   = c3.button("📋 Active Loans")

c4, c5, c6 = st.columns(3)
btn_overdue  = c4.button("⚠️ Overdue Loans")
btn_members  = c5.button("👥 All Members")
btn_authors  = c6.button("✍️ Authors")

# ──────────────────────────────────────────────────────────────────
# 📚 ALL BOOKS
# Shows: every book in the ontology with title, author, genre, year
# ──────────────────────────────────────────────────────────────────
if btn_books:
    try:
        df = sparql("""
            SELECT DISTINCT ?title ?authorName ?genreName ?year ?isbn
            WHERE {
              ?book rdf:type lib:Book .
              OPTIONAL { ?book lib:title           ?title . }
              OPTIONAL { ?book lib:publicationYear ?year  . }
              OPTIONAL { ?book lib:isbn            ?isbn  . }
              OPTIONAL { ?book lib:writtenBy ?author .
                         ?author lib:authorName ?authorName . }
              OPTIONAL { ?book lib:hasGenre ?genre .
                         ?genre lib:genreName ?genreName . }
            }
            ORDER BY ?title
        """)
        st.markdown(f"**📚 All Books** &nbsp;<span class='badge'>{len(df)}</span>",
                    unsafe_allow_html=True)
        df.columns = ["Title", "Author", "Genre", "Year", "ISBN"]
        show(df, "No books found. Is library.owl uploaded to Fuseki?")
    except Exception as e:
        st.error(str(e))

# ──────────────────────────────────────────────────────────────────
# ✅ AVAILABLE COPIES
# Shows: only BookCopy individuals where isAvailable = true
# Fix: use "true"^^xsd:boolean literal instead of bare true
# ──────────────────────────────────────────────────────────────────
if btn_copies:
    try:
        df = sparql("""
            SELECT DISTINCT ?copyId ?bookTitle
            WHERE {
              ?copy lib:isAvailable "true"^^xsd:boolean ;
                    lib:copyId ?copyId ;
                    lib:copyOf ?book .
              ?book lib:title ?bookTitle .
            }
            ORDER BY ?bookTitle
        """)
        st.markdown(f"**✅ Available Copies** &nbsp;<span class='badge'>{len(df)}</span>",
                    unsafe_allow_html=True)
        df.columns = ["Copy ID", "Book Title"]
        show(df, "No available copies found.")
    except Exception as e:
        st.error(str(e))

# ──────────────────────────────────────────────────────────────────
# 📋 ACTIVE LOANS
# Shows: LoanRecord where isReturned = false (book not yet returned)
# Fix: use "false"^^xsd:boolean literal
# ──────────────────────────────────────────────────────────────────
if btn_loans:
    try:
        df = sparql("""
            SELECT DISTINCT ?memberName ?bookTitle ?loanDate ?dueDate
            WHERE {
              ?loan lib:isReturned "false"^^xsd:boolean ;
                    lib:borrowedBy   ?member ;
                    lib:includesBook ?copy .
              OPTIONAL { ?loan lib:loanDate ?loanDate . }
              OPTIONAL { ?loan lib:dueDate  ?dueDate  . }
              ?member lib:memberName ?memberName .
              ?copy   lib:copyOf     ?book .
              ?book   lib:title      ?bookTitle .
            }
            ORDER BY ?dueDate
        """)
        st.markdown(f"**📋 Active Loans** &nbsp;<span class='badge'>{len(df)}</span>",
                    unsafe_allow_html=True)
        for col in ["loanDate", "dueDate"]:
            if col in df.columns:
                df[col] = df[col].apply(clean_date)
        df.columns = ["Member", "Book", "Loan Date", "Due Date"]
        show(df, "No active loans.")
    except Exception as e:
        st.error(str(e))

# ──────────────────────────────────────────────────────────────────
# ⚠️ OVERDUE LOANS
# Shows: loans that are BOTH typed as OverDueLoan AND isReturned = false
# Fix: added isReturned false check so returned-overdue loans don't show
# ──────────────────────────────────────────────────────────────────
if btn_overdue:
    try:
        df = sparql("""
            SELECT DISTINCT ?memberName ?bookTitle ?dueDate
            WHERE {
              ?loan rdf:type lib:OverDueLoan ;
                    lib:isReturned   "false"^^xsd:boolean ;
                    lib:borrowedBy   ?member ;
                    lib:includesBook ?copy .
              OPTIONAL { ?loan lib:dueDate ?dueDate . }
              ?member lib:memberName ?memberName .
              ?copy   lib:copyOf     ?book .
              ?book   lib:title      ?bookTitle .
            }
        """)
        if df.empty:
            st.success("🎉 No overdue loans!")
        else:
            st.warning(f"🚨 {len(df)} overdue loan(s) — follow up required!")
            if "dueDate" in df.columns:
                df["dueDate"] = df["dueDate"].apply(clean_date)
            df.columns = ["Member", "Book", "Due Date"]
            show(df)
    except Exception as e:
        st.error(str(e))

# ──────────────────────────────────────────────────────────────────
# 👥 ALL MEMBERS
# Shows: all StudentMember and FacultyMember individuals
# ──────────────────────────────────────────────────────────────────
if btn_members:
    try:
        df = sparql("""
            SELECT DISTINCT ?memberName ?memberId ?email ?type
            WHERE {
              ?member lib:memberName ?memberName ;
                      lib:memberId   ?memberId .
              OPTIONAL { ?member lib:email ?email . }
              { ?member rdf:type lib:StudentMember . BIND("Student" AS ?type) }
              UNION
              { ?member rdf:type lib:FacultyMember . BIND("Faculty" AS ?type) }
            }
            ORDER BY ?type ?memberName
        """)
        st.markdown(f"**👥 All Members** &nbsp;<span class='badge'>{len(df)}</span>",
                    unsafe_allow_html=True)
        df.columns = ["Name", "ID", "Email", "Type"]
        show(df, "No members found.")
    except Exception as e:
        st.error(str(e))

# ──────────────────────────────────────────────────────────────────
# ✍️ AUTHORS
# Shows: all authors with nationality and how many books they wrote
# ──────────────────────────────────────────────────────────────────
if btn_authors:
    try:
        df = sparql("""
            SELECT ?authorName ?nationality (COUNT(?book) AS ?books)
            WHERE {
              ?author lib:authorName ?authorName .
              OPTIONAL { ?author lib:nationality ?nationality . }
              OPTIONAL { ?book lib:writtenBy ?author . }
            }
            GROUP BY ?authorName ?nationality
            ORDER BY DESC(?books)
        """)
        st.markdown(f"**✍️ Authors** &nbsp;<span class='badge'>{len(df)}</span>",
                    unsafe_allow_html=True)
        df.columns = ["Author", "Nationality", "Books Written"]
        show(df, "No authors found.")
    except Exception as e:
        st.error(str(e))

st.markdown("---")

# ══════════════════════════════════════════════════════════════════
#  SPARQL EDITOR
# ══════════════════════════════════════════════════════════════════
st.markdown("### ⚡ SPARQL Query")
st.caption("Write any SPARQL SELECT query. Use `lib:` prefix. PREFIX block added automatically.")

default_q = """SELECT ?title ?authorName
WHERE {
  ?book rdf:type lib:Book .
  OPTIONAL { ?book lib:title ?title . }
  OPTIONAL { ?book lib:writtenBy ?a .
             ?a lib:authorName ?authorName . }
}
ORDER BY ?title"""

query = st.text_area("", value=default_q, height=180, label_visibility="collapsed")

if st.button("▶ Run", type="primary"):
    try:
        result = sparql(query)
        if result.empty:
            st.info("Query returned no results.")
        else:
            st.markdown(f"<span class='badge'>{len(result)} rows</span>",
                        unsafe_allow_html=True)
            show(result)
    except Exception as e:
        st.error(f"Query error: {e}")