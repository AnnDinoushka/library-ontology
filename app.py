import streamlit as st
import requests
import pandas as pd


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

# ── Minimal CSS ───────────────────────────────────────────────────
st.markdown("""
<style>
  .block-container { max-width: 820px; padding-top: 2rem; }
  .logo { text-align:center; font-size:2.4rem; font-weight:800;
          color:#1a3a5c; margin-bottom:0; }
  .sub  { text-align:center; color:#64748b; font-size:0.9rem;
          margin-bottom:1.8rem; }
  .badge { background:#e0f2fe; color:#0369a1; padding:2px 10px;
           border-radius:20px; font-size:0.8rem; font-weight:600; }
  .stDataFrame { border-radius:8px; }
</style>
""", unsafe_allow_html=True)


# ── Helper: run SPARQL ────────────────────────────────────────────
def sparql(query: str) -> pd.DataFrame:
    r = requests.get(
        FUSEKI,
        params={"query": PREFIX + query},
        headers={"Accept": "application/sparql-results+json"},
        timeout=8,
    )
    r.raise_for_status()
    data = r.json()
    cols = data["head"]["vars"]
    rows = [{c: b[c]["value"] if c in b else "" for c in cols}
            for b in data["results"]["bindings"]]
    return pd.DataFrame(rows, columns=cols)


def clean_date(val):
    return val.replace("T00:00:00", "") if val else ""


def fuseki_ok():
    try:
        requests.get("http://localhost:3030/$/ping", timeout=2)
        return True
    except Exception:
        return False


# ══════════════════════════════════════════════════════════════════
#  HEADER
# ══════════════════════════════════════════════════════════════════
st.markdown('<p class="logo">📖 Library Explorer</p>', unsafe_allow_html=True)
st.markdown(
    '<p class="sub">Semantic Web · OWL/RDF · Apache Jena Fuseki · SPARQL</p>',
    unsafe_allow_html=True,
)

if fuseki_ok():
    st.success("✅ Connected to Fuseki  —  dataset: `/library`")
else:
    st.error("❌ Fuseki not running. Start it with: `fuseki-server.bat --update --mem /library`")
    st.stop()

st.markdown("---")

# ══════════════════════════════════════════════════════════════════
#  MAIN SEARCH
# ══════════════════════════════════════════════════════════════════
st.markdown("### 🔎 Search")

search_term = st.text_input(
    label="search",
    placeholder="Type a book title, author name, genre, or member name…",
    label_visibility="collapsed",
)

if search_term:
    term = search_term.strip()
    found_anything = False

    # Books
    try:
        df_books = sparql(f"""
            SELECT ?title ?authorName ?genreName ?publisherName ?year ?isbn
            WHERE {{
              ?book rdf:type lib:Book ;
                    lib:title           ?title ;
                    lib:isbn            ?isbn ;
                    lib:publicationYear ?year ;
                    lib:writtenBy       ?author ;
                    lib:hasGenre        ?genre ;
                    lib:publishedBy     ?pub .
              ?author lib:authorName    ?authorName .
              ?genre  lib:genreName     ?genreName .
              ?pub    lib:publisherName ?publisherName .
              FILTER(
                CONTAINS(LCASE(STR(?title)),           LCASE("{term}")) ||
                CONTAINS(LCASE(STR(?authorName)),      LCASE("{term}")) ||
                CONTAINS(LCASE(STR(?genreName)),       LCASE("{term}")) ||
                CONTAINS(LCASE(STR(?publisherName)),   LCASE("{term}"))
              )
            }}
            ORDER BY ?title
        """)
        if not df_books.empty:
            found_anything = True
            st.markdown(f"**📚 Books** &nbsp; <span class='badge'>{len(df_books)} found</span>", unsafe_allow_html=True)
            df_books.columns = ["Title", "Author", "Genre", "Publisher", "Year", "ISBN"]
            st.dataframe(df_books, use_container_width=True, hide_index=True)
    except Exception as e:
        st.error(f"Book search error: {e}")

    # Members
    try:
        df_mem = sparql(f"""
            SELECT ?memberName ?memberId ?email ?type
            WHERE {{
              ?member lib:memberName ?memberName ;
                      lib:memberId   ?memberId ;
                      lib:email      ?email .
              {{ ?member rdf:type lib:StudentMember . BIND("Student" AS ?type) }}
              UNION
              {{ ?member rdf:type lib:FacultyMember . BIND("Faculty" AS ?type) }}
              FILTER(CONTAINS(LCASE(STR(?memberName)), LCASE("{term}")))
            }}
        """)
        if not df_mem.empty:
            found_anything = True
            st.markdown(f"**👥 Members** &nbsp; <span class='badge'>{len(df_mem)} found</span>", unsafe_allow_html=True)
            df_mem.columns = ["Name", "ID", "Email", "Type"]
            st.dataframe(df_mem, use_container_width=True, hide_index=True)
    except Exception as e:
        st.error(f"Member search error: {e}")

    if not found_anything:
        st.info(f'No results found for **"{term}"**. Try a different keyword.')

st.markdown("---")

# ══════════════════════════════════════════════════════════════════
#  BROWSE BUTTONS
# ══════════════════════════════════════════════════════════════════
st.markdown("### 🗂️ Browse")

col1, col2, col3 = st.columns(3)
show_books   = col1.button("📚 All Books")
show_copies  = col2.button("✅ Available Copies")
show_loans   = col3.button("📋 Active Loans")

col4, col5, col6 = st.columns(3)
show_overdue = col4.button("⚠️ Overdue")
show_members = col5.button("👥 All Members")
show_authors = col6.button("✍️ Authors")

# All Books
if show_books:
    try:
        df = sparql("""
            SELECT ?title ?authorName ?genreName ?year
            WHERE {
              ?book rdf:type lib:Book ;
                    lib:title           ?title ;
                    lib:publicationYear ?year ;
                    lib:writtenBy       ?author ;
                    lib:hasGenre        ?genre .
              ?author lib:authorName ?authorName .
              ?genre  lib:genreName  ?genreName .
            }
            ORDER BY ?title
        """)
        st.markdown(f"**📚 All Books** &nbsp; <span class='badge'>{len(df)}</span>", unsafe_allow_html=True)
        df.columns = ["Title", "Author", "Genre", "Year"]
        st.dataframe(df, use_container_width=True, hide_index=True)
    except Exception as e:
        st.error(str(e))

# Available Copies
if show_copies:
    try:
        df = sparql("""
            SELECT ?copyId ?bookTitle
            WHERE {
              ?copy lib:isAvailable true ;
                    lib:copyId ?copyId ;
                    lib:copyOf ?book .
              ?book lib:title ?bookTitle .
            }
            ORDER BY ?bookTitle
        """)
        st.markdown(f"**✅ Available Copies** &nbsp; <span class='badge'>{len(df)}</span>", unsafe_allow_html=True)
        df.columns = ["Copy ID", "Book Title"]
        st.dataframe(df, use_container_width=True, hide_index=True)
    except Exception as e:
        st.error(str(e))

# Active Loans
if show_loans:
    try:
        df = sparql("""
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
        """)
        st.markdown(f"**📋 Active Loans** &nbsp; <span class='badge'>{len(df)}</span>", unsafe_allow_html=True)
        df["loanDate"] = df["loanDate"].apply(clean_date)
        df["dueDate"]  = df["dueDate"].apply(clean_date)
        df.columns = ["Member", "Book", "Loan Date", "Due Date"]
        st.dataframe(df, use_container_width=True, hide_index=True)
    except Exception as e:
        st.error(str(e))

# Overdue
if show_overdue:
    try:
        df = sparql("""
            SELECT ?memberName ?bookTitle ?dueDate
            WHERE {
              ?loan rdf:type lib:OverDueLoan ;
                    lib:borrowedBy   ?member ;
                    lib:includesBook ?copy ;
                    lib:dueDate      ?dueDate .
              ?member lib:memberName ?memberName .
              ?copy   lib:copyOf     ?book .
              ?book   lib:title      ?bookTitle .
            }
        """)
        if df.empty:
            st.success("🎉 No overdue loans!")
        else:
            st.warning(f"🚨 {len(df)} overdue loan(s)")
            df["dueDate"] = df["dueDate"].apply(clean_date)
            df.columns = ["Member", "Book", "Due Date"]
            st.dataframe(df, use_container_width=True, hide_index=True)
    except Exception as e:
        st.error(str(e))

# All Members
if show_members:
    try:
        df = sparql("""
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
        """)
        st.markdown(f"**👥 Members** &nbsp; <span class='badge'>{len(df)}</span>", unsafe_allow_html=True)
        df.columns = ["Name", "ID", "Email", "Type"]
        st.dataframe(df, use_container_width=True, hide_index=True)
    except Exception as e:
        st.error(str(e))

# Authors
if show_authors:
    try:
        df = sparql("""
            SELECT ?authorName ?nationality (COUNT(?book) AS ?books)
            WHERE {
              ?author lib:authorName  ?authorName ;
                      lib:nationality ?nationality .
              ?book   lib:writtenBy   ?author .
            }
            GROUP BY ?authorName ?nationality
            ORDER BY DESC(?books)
        """)
        st.markdown(f"**✍️ Authors** &nbsp; <span class='badge'>{len(df)}</span>", unsafe_allow_html=True)
        df.columns = ["Author", "Nationality", "Books"]
        st.dataframe(df, use_container_width=True, hide_index=True)
    except Exception as e:
        st.error(str(e))

st.markdown("---")

# ══════════════════════════════════════════════════════════════════
#  SPARQL EDITOR
# ══════════════════════════════════════════════════════════════════
st.markdown("### ⚡ SPARQL Query")
st.caption("Use `lib:` prefix. PREFIX block is added automatically.")

default_q = """SELECT ?title ?authorName
WHERE {
  ?book lib:title     ?title ;
        lib:writtenBy ?author .
  ?author lib:authorName ?authorName .
}
ORDER BY ?title"""

query = st.text_area("", value=default_q, height=160, label_visibility="collapsed")

if st.button("▶ Run", type="primary"):
    try:
        result = sparql(query)
        if result.empty:
            st.info("Query returned no results.")
        else:
            st.markdown(f"<span class='badge'>{len(result)} rows</span>", unsafe_allow_html=True)
            st.dataframe(result, use_container_width=True, hide_index=True)
    except Exception as e:
        st.error(f"Query error: {e}")
