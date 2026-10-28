# Test results

The checks below ran the project's own code (`lib/`, `app/api/**/route.js`, `middleware.js`,
`scripts/`) against a live Qdrant 1.20.0 and a MySQL-compatible SQL server (Dolt, MySQL 8.0 wire
protocol). The build machine had no access to the npm registry, so these packages were replaced by
small stand-ins with the same API: `mysql2` (same `?` placeholder formatting), `jose` (HS256 JWT),
`bcryptjs` (real bcrypt through PHP) and the embedding model (a hashed bag-of-words with the same
384-dim normalised output). **Cosine scores in section 1 therefore differ from what the real
all-MiniLM-L6-v2 model produces** — the real model gives better semantic matches.
Re-run everything on your machine with the manual checklist at the end, and take your report
screenshots from that run.

## 1. API / end-to-end tests — 57 passed, 0 failed

```
PASS  register rejects weak password  -> Password must be at least 8 characters and contain a letter and a number.
PASS  register new student -> 201 + cookie  -> {"user":{"user_id":5,"name":"Test User","email":"test.user@example.com","role":"STUDENT"}}
PASS  register duplicate email -> 409  -> An account with this email already exists.
PASS  login wrong password -> 401  -> Invalid email or password.
PASS  login unknown email -> same 401 message
PASS  forged cookie -> 401
PASS  search without login -> 401
PASS  student demo login (sample bcrypt hash) -> 200
PASS  /me returns student
PASS  student can list papers  -> 17 papers
PASS  student cannot add paper -> 403  -> Only ADMIN users can do this.
PASS  student cannot delete paper -> 403
PASS  student cannot reindex -> 403
PASS  student cannot promote self -> 403
PASS  keyword search "transformer"  -> 8,1,2
PASS  author search "Kraska"  -> Learned Cardinality Estimation for Query Optimization | The Case for Learned Index Structures
PASS  title search "quantum"
PASS  filter-only search (CS, 2019-2020)  -> 6 results
PASS  keyword + topic filter (Computer Vision)  -> Deep Residual Learning for Image Recognition | ImageNet Classification with Deep Convolutional Neural Networks
PASS  empty search -> 400  -> Type something to search for, or pick a filter.
PASS  SQL-injection text is treated as plain text  -> 0 results
PASS  history recorded (newest first)  -> [["' OR 1=1 --","keyword",0],["q=deep&topic=7","keyword",2],["domain=1&yearFrom=2019&yearTo=2020","filter",6]]
PASS  save search -> 201
PASS  saving twice is detected
PASS  list saved searches (only own)
PASS  re-run URL for saved search  -> /search?q=deep&topic=7&type=keyword&run=1
PASS  describe stored query
PASS  another student cannot delete Arjun's saved search -> 404
PASS  owner deletes saved search
PASS  add paper validation (no topic) -> 400  -> Choose at least one topic.
PASS  add paper validation (year) -> 400  -> Publication year must be a whole number between 1900 and 2100.
PASS  duplicate DOI (written as URL) -> 409  -> A paper with this DOI already exists.
PASS  unknown topic -> 400 and nothing saved  -> A referenced record (topic / author / user) does not exist.
PASS  admin adds paper -> 201  -> {"paper_id":21,"warning":null}
PASS  stored: title trimmed, doi lower-case
PASS  authors in order, existing author re-used
PASS  keywords created/linked (existing reused)  -> 3:language model,14:question answering,18:retrieval
PASS  topics linked
PASS  paper count +1
PASS  admin edits paper  -> {"paper_id":21,"warning":null}
PASS  edit applied to links
PASS  edit missing paper -> 404  -> Paper not found.
PASS  admin rebuilds vector index  -> {"indexed":18}
PASS  status: online, all papers indexed, 384 cosine  -> {"online":true,"collectionExists":true,"indexedPoints":18,"papersInMySQL":18,"vectorSize":384,"distance":"Cosine"}
PASS  semantic search returns scored papers joined with MySQL  -> 0.69 Approximate Nearest Neighbor Search with Vector Indexes | 0.64 Billion-Scale Similarity Search with GPUs | 0.53 RAG (edited)
PASS  semantic search with payload year filter  -> 2021,2020,2020,2020,2020,2022,2021
PASS  similar papers to #4 (excludes itself)  -> 0.74 #12 | 0.43 #21 | 0.32 #14 | 0.29 #11 | 0.16 #10
PASS  semantic search logged in history
PASS  new paper auto-indexed (no warning)
PASS  vector count follows MySQL  -> 19/19
PASS  admin deletes paper
PASS  deleted paper -> 404
PASS  vector removed on delete  -> 18/18
PASS  audit log written by triggers (INSERT/UPDATE/DELETE)  -> [{"action":"DELETE","paper_id":22},{"action":"INSERT","paper_id":22},{"action":"UPDATE","paper_id":21},{"action":"INSERT","paper_id":21}]
PASS  admin cannot demote self  -> You cannot remove your own admin role.
PASS  admin promotes Meera
PASS  role change takes effect immediately (role read from DB)

57 passed, 0 failed
```

## 2. Page protection (middleware)

| Request | Who | Result |
|---|---|---|
| `/` | not logged in | 200 (public) |
| `/papers` | not logged in | 307 → `/login?next=/papers` |
| `/papers` | STUDENT | 200 |
| `/admin` | STUDENT | 307 → `/papers?denied=1` |
| `/papers/3/edit` | STUDENT | 307 → `/papers?denied=1` |
| `/papers/new`, `/admin` | ADMIN | 200 |

## 3. SQL negative tests (`sql/05_validation_and_negative_tests.sql`)

| Statement | Expected | Result |
|---|---|---|
| `CALL sp_add_paper(... duplicate DOI ...)` | ERROR 1062, rollback | rejected, paper count unchanged |
| `CALL sp_add_paper(... topic 9999 ...)` | ERROR 1452, rollback | rejected, no orphan paper row |
| year 1500 | `chk_publication_year` | rejected |
| self-citation (1,1) | `chk_no_self_citation` | rejected |
| role 'HACKER' | `chk_user_role` | rejected |
| email 'not-an-email' | `chk_user_email` | rejected |
| author_order 0 | `chk_author_order` | rejected |
| results_count -5 | `chk_results_count` | rejected |
| paper_topic (9999,1) | FK | rejected |
| author name NULL | NOT NULL | rejected |
| duplicate user email / domain name / (paper,topic) | UNIQUE / PK | rejected |
| blank title on INSERT and UPDATE | trigger SIGNAL 45000 | "Paper title cannot be blank" |
| blank search query | trigger SIGNAL 45000 | "Search query cannot be blank" |
| DOI 'not-a-doi' | trigger SIGNAL 45000 | "DOI must look like 10.xxxx/suffix" |
| pdf_url 'ftp://…' on INSERT, 'javascript:…' on UPDATE | trigger SIGNAL 45000 | "PDF URL must start with http:// or https://" |
| same DOI written as `HTTPS://DOI.ORG/...` | trigger normalises → UNIQUE | rejected as duplicate |
| delete a domain | ON DELETE CASCADE | subdomain + topic removed (1 → 0) |
| ALTER ADD/DROP COLUMN, CREATE/DROP TABLE | succeed | succeeded |

## 4. Trigger and view outputs (`sql/04_member2_advanced.sql`)

```
+----------+----------------------+----------------------+---------+
| paper_id | stored_title         | doi                  | journal |
+----------+----------------------+----------------------+---------+
| 18       | [Trigger Demo Paper] | 10.1000/trigger.demo | NULL    |
+----------+----------------------+----------------------+---------+

+--------+----------+--------+-----------------------------+-----------------------------+----------------+---------------------+
| log_id | paper_id | action | old_title                   | new_title                   | changed_by     | changed_at          |
+--------+----------+--------+-----------------------------+-----------------------------+----------------+---------------------+
| 3      | 18       | DELETE | Trigger Demo Paper (edited) | NULL                        | root@localhost | 2026-10-26 10:02:39 |
| 2      | 18       | UPDATE | Trigger Demo Paper          | Trigger Demo Paper (edited) | root@localhost | 2026-10-26 10:02:39 |
| 1      | 18       | INSERT | NULL                        | Trigger Demo Paper          | root@localhost | 2026-10-26 10:02:39 |
+--------+----------+--------+-----------------------------+-----------------------------+----------------+---------------------+

+------------+-------------------+-------------+
| history_id | stored_query      | search_type |
+------------+-------------------+-------------+
| 4          | [neural networks] | keyword     |
+------------+-------------------+-------------+

+----------+------------------------------------------------------------------+--------------------------+---------------------------------------------+--------------------+-------------+
| paper_id | title                                                            | authors                  | topics                                      | domains            | times_cited |
+----------+------------------------------------------------------------------+--------------------------+---------------------------------------------+--------------------+-------------+
| 1        | Attention Is All You Need                                        | Ashish Vaswani           | Deep Learning, Natural Language Processing  | Computer Science   | 4           |
| 2        | BERT: Pre-training of Deep Bidirectional Transformers            | Jacob Devlin             | Deep Learning, Natural Language Processing  | Computer Science   | 3           |
| 3        | Efficient Query Processing in Relational Databases               | Priya Sharma, Li Wei     | Query Optimization                          | Computer Science   | 3           |
| 12       | Billion-Scale Similarity Search with GPUs                        | Jeff Johnson             | Vector Databases                            | Computer Science   | 2           |
| 9        | ImageNet Classification with Deep Convolutional Neural Networks  | Alex Krizhevsky          | Computer Vision, Deep Learning              | Computer Science   | 1           |
| 11       | The Case for Learned Index Structures                            | Tim Kraska, Andreas Kipf | Query Optimization                          | Computer Science   | 1           |
| 13       | Surface Codes: Towards Practical Large-Scale Quantum Computation | Austin Fowler            | Quantum Computing, Quantum Error Correction | Physics            | 1           |
| 15       | Programmable Editing of a Target Base in Genomic DNA             | Alexis Komor             | Gene Editing                                | Biomedical Science | 1           |
+----------+------------------------------------------------------------------+--------------------------+---------------------------------------------+--------------------+-------------+

+--------------------+-------------------------+------------------------------+-------------+
| domain_name        | subdomain_name          | topic_name                   | paper_count |
+--------------------+-------------------------+------------------------------+-------------+
| Biomedical Science | Genomics                | Gene Editing                 | 2           |
| Biomedical Science | Genomics                | Protein Structure Prediction | 1           |
| Computer Science   | Artificial Intelligence | Computer Vision              | 2           |
| Computer Science   | Artificial Intelligence | Deep Learning                | 7           |
| Computer Science   | Artificial Intelligence | Natural Language Processing  | 4           |
| Computer Science   | Databases               | Query Optimization           | 3           |
| Computer Science   | Databases               | Vector Databases             | 3           |
| Physics            | Quantum Physics         | Quantum Computing            | 2           |
| Physics            | Quantum Physics         | Quantum Error Correction     | 1           |
+--------------------+-------------------------+------------------------------+-------------+

+--------------------+---------+----------------+---------------------+----------------+
| name               | role    | total_searches | last_search_at      | saved_searches |
+--------------------+---------+----------------+---------------------+----------------+
| Shwetha S          | ADMIN   | 0              | NULL                | 0              |
| Pratistha Majumder | ADMIN   | 0              | NULL                | 0              |
| Arjun Rao          | STUDENT | 3              | 2026-10-26 10:02:39 | 1              |
| Meera Nair         | STUDENT | 1              | 2026-10-26 10:02:38 | 1              |
+--------------------+---------+----------------+---------------------+----------------+

+----------------------------------+--------+----------------+--------------------------------------------------------------------------------------------------------------+--------+---------------------+----------+---------+----------------------+----------------------+--------------------+
| Trigger                          | Event  | Table          | Statement                                                                                                    | Timing | Created             | sql_mode | Definer | character_set_client | collation_connection | Database Collation |
+----------------------------------+--------+----------------+--------------------------------------------------------------------------------------------------------------+--------+---------------------+----------+---------+----------------------+----------------------+--------------------+
| trg_paper_after_delete           | DELETE | research_paper | BEGIN                                                                                                        | AFTER  | 2026-10-26 04:32:39 |          |         | utf8mb4              | utf8mb4_0900_bin     | utf8mb4_0900_bin   |
```

## 5. Manual demo checklist

1. `npm run check-setup` → MySQL tables 14, views 3, triggers 6, routines 2; Qdrant OK.
2. Log in as `arjun@example.com` (STUDENT). Try `/admin` → redirected with "ADMIN only" message. No Add/Edit/Delete buttons.
3. Search "transformer"; filter Domain = Computer Science, years 2019–2020; Save the search.
4. History & saved → the searches are listed with result counts → *Run again*.
5. Semantic search: "fast lookup of similar vectors" → ANN / FAISS papers on top, although the words differ.
6. Open any paper → *Similar papers* panel with cosine scores.
7. Log out; log in as `shwetha@example.com` (ADMIN). Add a paper (try a duplicate DOI first → friendly error). Edit it, then delete it (confirmation dialog).
8. Admin page → audit log shows INSERT / UPDATE / DELETE rows written by triggers; vector index count matches MySQL; promote a student to ADMIN.
9. Run `sql/05` with `--force` to show every constraint rejecting bad data.
