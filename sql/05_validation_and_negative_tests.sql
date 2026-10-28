-- =====================================================================
-- ResearchLens - 05_validation_and_negative_tests.sql
-- Run AFTER 01-04.  EVERY "EXPECT ERROR" statement below is SUPPOSED to
-- fail - that failure is the proof that the constraint / trigger works.
--
-- Run it with --force so the client keeps going after each error:
--     mysql -u root -p --force researchlens < sql/05_validation_and_negative_tests.sql
-- In MySQL Workbench: Query > "Continue on SQL Script Error" (toggle on).
-- =====================================================================
USE researchlens;

SELECT COUNT(*) AS papers_before FROM research_paper;

-- ---------- Member 1: transaction rollback inside sp_add_paper ----------
-- EXPECT ERROR 1062 (Duplicate entry for key 'research_paper.doi').
-- The procedure's EXIT HANDLER does ROLLBACK, so nothing is half-inserted.
CALL sp_add_paper('Duplicate DOI test', 2022, '10.1000/gnn.2022.01',
                  'x', 'x', 2, 1, @bad_id);

-- EXPECT ERROR 1452 (FK on paper_topic): topic 9999 does not exist.
-- The paper row that was inserted first must be rolled back as well.
CALL sp_add_paper('Bad topic test', 2022, '10.1000/badtopic.2022',
                  'x', 'x', 9999, 1, @bad_id2);

SELECT COUNT(*) AS papers_after FROM research_paper;          -- same as papers_before
SELECT COUNT(*) AS should_be_zero FROM research_paper
WHERE doi IN ('10.1000/badtopic.2022') OR title = 'Duplicate DOI test';

-- ---------- CHECK constraints ----------
INSERT INTO research_paper (title, publication_year) VALUES ('Bad year', 1500);          -- EXPECT ERROR 3819 chk_publication_year
INSERT INTO citation (citing_paper_id, cited_paper_id) VALUES (1,1);                      -- EXPECT ERROR 3819 chk_no_self_citation
INSERT INTO users (name,email,password_hash,role) VALUES ('X','x@x.com','h','HACKER');    -- EXPECT ERROR 3819 chk_user_role
INSERT INTO users (name,email,password_hash) VALUES ('Y','not-an-email','h');            -- EXPECT ERROR 3819 chk_user_email
INSERT INTO paper_author (paper_id, author_id, author_order) VALUES (1, 2, 0);            -- EXPECT ERROR 3819 chk_author_order
INSERT INTO search_history (user_id, query, search_type, results_count)
VALUES (3, 'x', 'keyword', -5);                                                           -- EXPECT ERROR 3819 chk_results_count

-- ---------- FOREIGN KEY / NOT NULL / UNIQUE ----------
INSERT INTO paper_topic (paper_id, topic_id) VALUES (9999, 1);                            -- EXPECT ERROR 1452 foreign key
INSERT INTO author (name) VALUES (NULL);                                                  -- EXPECT ERROR 1048 NOT NULL
INSERT INTO users (name,email,password_hash) VALUES ('Dup','arjun@example.com','h');      -- EXPECT ERROR 1062 UNIQUE email
INSERT INTO research_domain (domain_name) VALUES ('Physics');                              -- EXPECT ERROR 1062 UNIQUE domain_name
INSERT INTO paper_topic (paper_id, topic_id) VALUES (1, 1);                               -- EXPECT ERROR 1062 duplicate composite PK

-- ---------- Member 2: triggers that reject bad data ----------
INSERT INTO research_paper (title) VALUES ('     ');                                       -- EXPECT ERROR 1644 'Paper title cannot be blank'
UPDATE research_paper SET title = '' WHERE paper_id = 1;                                   -- EXPECT ERROR 1644 'Paper title cannot be blank'
INSERT INTO search_history (user_id, query, search_type) VALUES (3, '   ', 'keyword');     -- EXPECT ERROR 1644 'Search query cannot be blank'

INSERT INTO research_paper (title, doi) VALUES ('Bad DOI', 'not-a-doi');                     -- EXPECT ERROR 1644 'DOI must look like 10.xxxx/suffix'
INSERT INTO research_paper (title, pdf_url) VALUES ('Bad URL', 'ftp://x/y.pdf');           -- EXPECT ERROR 1644 'PDF URL must start with http:// or https://'
UPDATE research_paper SET pdf_url = 'javascript:alert(1)' WHERE paper_id = 1;              -- EXPECT ERROR 1644 (same rule on UPDATE)

-- DOI normalisation means the same DOI written differently is still a duplicate
INSERT INTO research_paper (title, doi) VALUES ('Same DOI, other case', 'HTTPS://DOI.ORG/10.5555/3295222.3295349'); -- EXPECT ERROR 1062

-- ---------- ON DELETE CASCADE demonstration (succeeds) ----------
INSERT INTO research_domain (domain_name, description) VALUES ('Cascade Demo', 'temporary');
SET @d := LAST_INSERT_ID();
INSERT INTO research_subdomain (domain_id, subdomain_name) VALUES (@d, 'Cascade Sub');
SET @s := LAST_INSERT_ID();
INSERT INTO research_topic (subdomain_id, topic_name) VALUES (@s, 'Cascade Topic');
SELECT COUNT(*) AS rows_before_delete FROM research_topic WHERE subdomain_id = @s;   -- 1
DELETE FROM research_domain WHERE domain_id = @d;
SELECT COUNT(*) AS rows_after_delete  FROM research_topic WHERE subdomain_id = @s;   -- 0 (cascaded)

-- ---------- ALTER / DROP demonstration (succeeds) ----------
ALTER TABLE author ADD COLUMN orcid VARCHAR(30);
DESCRIBE author;
ALTER TABLE author DROP COLUMN orcid;
CREATE TABLE temp_demo (id INT);
DROP TABLE temp_demo;

-- Final check: the database is unchanged by all the failed statements
SELECT COUNT(*) AS papers_final FROM research_paper;
