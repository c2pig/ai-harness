# Neo4j Browser — Architecture PoC intent queries

Mem0 OSS graph nodes (see `mem0ai` Neo4j integration) use:

- **Dynamic labels** (entity types from extraction), e.g. inferred types on `MERGE (n:SomeType { ... })`
- **`name`** — string used for search / display
- **`user_id`** — Mem0 user scope (matches harness **`entityId`**; for this PoC use **`dept-architecture`**)

Always **scope by `user_id`** first so you only see the architecture department namespace (not other demos).

Run these in **Neo4j Browser** (`http://localhost:7474`), database **`neo4j`**, Bolt **`bolt://localhost:7687`**.

---

## 0) Sanity — count your namespace

```cypher
MATCH (n)
WHERE n.user_id = 'dept-architecture'
RETURN count(n) AS nodesForDept;
```

```cypher
MATCH ()-[r]->()
WHERE startNode(r).user_id = 'dept-architecture'
  AND endNode(r).user_id = 'dept-architecture'
RETURN count(r) AS relsForDept;
```

If these return **0**, Mem0 may have used another id — run **§0b** once.

### 0b) Discover actual `user_id` values (if needed)

```cypher
MATCH (n)
WHERE n.user_id IS NOT NULL
RETURN DISTINCT n.user_id AS userId, count(*) AS cnt
ORDER BY cnt DESC;
```

Use the value you see for your architecture runs in place of `dept-architecture` below.

---

## 1) Intent: “What is Jordan focused on (Aurora / Nexus)?”

Nodes whose **`name`** mentions Jordan (and optionally Aurora):

```cypher
MATCH (n)
WHERE n.user_id = 'dept-architecture'
  AND toLower(n.name) CONTAINS 'jordan'
RETURN labels(n) AS labels, n.name AS name, n
LIMIT 50;
```

Relationships touching Jordan-named entities:

```cypher
MATCH p = (s)-[r]->(d)
WHERE s.user_id = 'dept-architecture'
  AND d.user_id = 'dept-architecture'
  AND (toLower(s.name) CONTAINS 'jordan' OR toLower(d.name) CONTAINS 'jordan')
RETURN p
LIMIT 50;
```

---

## 2) Intent: “Who are the PMs for Nexus and Aurora / emails?”

Search **`name`** for PM names from the story (Priya, Sam, Nair, Okada):

```cypher
MATCH (n)
WHERE n.user_id = 'dept-architecture'
  AND (
    toLower(n.name) CONTAINS 'priya'
    OR toLower(n.name) CONTAINS 'nair'
    OR toLower(n.name) CONTAINS 'sam'
    OR toLower(n.name) CONTAINS 'okada'
  )
RETURN labels(n), n.name, n
LIMIT 50;
```

Program / project anchors:

```cypher
MATCH (n)
WHERE n.user_id = 'dept-architecture'
  AND (toLower(n.name) CONTAINS 'nexus' OR toLower(n.name) CONTAINS 'aurora')
RETURN labels(n), n.name, n
LIMIT 50;
```

---

## 3) Intent: “Reference stack for Nexus (Node, React, AWS)”

```cypher
MATCH (n)
WHERE n.user_id = 'dept-architecture'
  AND (
    toLower(n.name) CONTAINS 'node'
    OR toLower(n.name) CONTAINS 'react'
    OR toLower(n.name) CONTAINS 'aws'
    OR toLower(n.name) CONTAINS 'nexus'
  )
RETURN labels(n), n.name, n
LIMIT 50;
```

---

## 4) Intent: “Riley vs Jordan focus”

```cypher
MATCH (n)
WHERE n.user_id = 'dept-architecture'
  AND (toLower(n.name) CONTAINS 'riley' OR toLower(n.name) CONTAINS 'jordan')
RETURN labels(n), n.name, n
ORDER BY n.name
LIMIT 50;
```

Subgraph between them (if edges exist):

```cypher
MATCH p = (a)-[r*1..4]-(b)
WHERE a.user_id = 'dept-architecture'
  AND b.user_id = 'dept-architecture'
  AND toLower(a.name) CONTAINS 'riley'
  AND toLower(b.name) CONTAINS 'jordan'
RETURN p
LIMIT 20;
```

---

## 5) Intent: “Aurora pending / vendor selection”

```cypher
MATCH (n)
WHERE n.user_id = 'dept-architecture'
  AND (toLower(n.name) CONTAINS 'aurora' OR toLower(n.name) CONTAINS 'vendor')
RETURN labels(n), n.name, n
LIMIT 50;
```

Relationship types involving “vendor” or “pending” in **names** of endpoints:

```cypher
MATCH (s)-[rel]->(d)
WHERE s.user_id = 'dept-architecture'
  AND d.user_id = 'dept-architecture'
  AND (
    toLower(s.name) CONTAINS 'vendor'
    OR toLower(d.name) CONTAINS 'vendor'
    OR toLower(s.name) CONTAINS 'aurora'
    OR toLower(d.name) CONTAINS 'aurora'
  )
RETURN s.name, type(rel) AS relType, d.name
LIMIT 50;
```

---

## 6) Full namespace listing (tabular — good for debugging)

```cypher
MATCH (n)
WHERE n.user_id = 'dept-architecture'
RETURN labels(n)[0] AS primaryLabel, n.name AS name
ORDER BY name
LIMIT 200;
```

---

## 7) If `user_id` is missing on some nodes (mixed graph)

Mem0 only adds `user_id` to graph entities it creates. For a **global** text probe (slower, can hit other demos):

```cypher
MATCH (n)
WHERE ANY(k IN keys(n)
          WHERE k = 'name'
            AND n[k] IS :: STRING
            AND toLower(n[k]) CONTAINS 'jordan')
RETURN labels(n), n.name, n.user_id
LIMIT 50;
```

---

## Notes

- **94 nodes** may include **multiple** `user_id` values from other skills/tests. Prefer **§0** + **scoped** queries.
- **Seeds** use `infer: false` — graph triples may be **sparse** until live **`add`** with inference; names in Neo4j come from Mem0’s **entity extraction**, so wording may not match seed text exactly.
- Colors in the Neo4j Browser visualization map to **labels**; use `CALL db.labels()` to list them.
