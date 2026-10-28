-- =====================================================================
-- ResearchLens - 04_member2_advanced.sql   (Member 2 advanced features)
-- Run AFTER 01, 02 and 03.  Uses DELIMITER -> run in the mysql client
-- or MySQL Workbench.
--
--   Feature D: TRIGGERS  (data cleaning + validation + audit trail)
--       trg_paper_before_insert   - trims title, normalises DOI, rejects blank title,
--                                   badly formatted DOI and non-http(s) PDF URL
--       trg_paper_before_update   - same rules on UPDATE
--       trg_paper_after_insert    - writes an INSERT row to paper_audit_log
--       trg_paper_after_update    - writes an UPDATE row to paper_audit_log
--       trg_paper_after_delete    - writes a DELETE row to paper_audit_log
--       trg_search_history_before_insert - cleans the query text, rejects blanks
--
--   Feature E: VIEWS
--       v_paper_details           - one row per paper with authors, topics,
--                                   domains, keywords and citation counts
--                                   (used directly by the web app)
--       v_topic_statistics        - domain > subdomain > topic paper counts
--       v_user_search_activity    - per-user search / saved-search summary
--
-- Team total of distinct advanced SQL concepts:
--   Member 1: stored procedure, transaction (COMMIT/ROLLBACK), stored function,
--             full-text index/search
--   Member 2: triggers, views
-- =====================================================================
USE researchlens;

-- ---------------------------------------------------------------------
-- Audit table filled ONLY by triggers (the application never writes it)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS paper_audit_log;
CREATE TABLE paper_audit_log (
    log_id     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    paper_id   BIGINT UNSIGNED NOT NULL,      -- no FK: the paper may be deleted
    action     VARCHAR(10) NOT NULL,
    old_title  TEXT,
    new_title  TEXT,
    changed_by VARCHAR(150),                  -- MySQL account that ran the statement
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_audit_action CHECK (action IN ('INSERT','UPDATE','DELETE'))
);
CREATE INDEX idx_audit_paper ON paper_audit_log(paper_id);

DROP TRIGGER IF EXISTS trg_paper_before_insert;
DROP TRIGGER IF EXISTS trg_paper_before_update;
DROP TRIGGER IF EXISTS trg_paper_after_insert;
DROP TRIGGER IF EXISTS trg_paper_after_update;
DROP TRIGGER IF EXISTS trg_paper_after_delete;
DROP TRIGGER IF EXISTS trg_search_history_before_insert;

DELIMITER $$

-- D1. Clean + validate a paper BEFORE it is stored
CREATE TRIGGER trg_paper_before_insert
BEFORE INSERT ON research_paper
FOR EACH ROW
BEGIN
    SET NEW.title = TRIM(NEW.title);
    IF NEW.title = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Paper title cannot be blank';
    END IF;

    -- Store DOIs in one canonical form: lower-case, no "https://doi.org/" prefix,
    -- and an empty string becomes NULL (so UNIQUE does not clash on '').
    IF NEW.doi IS NOT NULL THEN
        SET NEW.doi = NULLIF(
            REPLACE(REPLACE(LOWER(TRIM(NEW.doi)), 'https://doi.org/', ''), 'http://doi.org/', ''),
            '');
    END IF;

    IF NEW.journal IS NOT NULL THEN
        SET NEW.journal = NULLIF(TRIM(NEW.journal), '');
    END IF;

    -- Format rules the column types alone cannot express
    IF NEW.doi IS NOT NULL AND NEW.doi NOT LIKE '10.%/%' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DOI must look like 10.xxxx/suffix';
    END IF;
    IF NEW.pdf_url IS NOT NULL AND NEW.pdf_url NOT LIKE 'http://%' AND NEW.pdf_url NOT LIKE 'https://%' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PDF URL must start with http:// or https://';
    END IF;
END$$

-- D2. Same rules when a paper is edited
CREATE TRIGGER trg_paper_before_update
BEFORE UPDATE ON research_paper
FOR EACH ROW
BEGIN
    SET NEW.title = TRIM(NEW.title);
    IF NEW.title = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Paper title cannot be blank';
    END IF;

    IF NEW.doi IS NOT NULL THEN
        SET NEW.doi = NULLIF(
            REPLACE(REPLACE(LOWER(TRIM(NEW.doi)), 'https://doi.org/', ''), 'http://doi.org/', ''),
            '');
    END IF;

    IF NEW.journal IS NOT NULL THEN
        SET NEW.journal = NULLIF(TRIM(NEW.journal), '');
    END IF;

    -- Format rules the column types alone cannot express
    IF NEW.doi IS NOT NULL AND NEW.doi NOT LIKE '10.%/%' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DOI must look like 10.xxxx/suffix';
    END IF;
    IF NEW.pdf_url IS NOT NULL AND NEW.pdf_url NOT LIKE 'http://%' AND NEW.pdf_url NOT LIKE 'https://%' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PDF URL must start with http:// or https://';
    END IF;
END$$

-- D3. Audit trail: every insert / update / delete of a paper is logged
CREATE TRIGGER trg_paper_after_insert
AFTER INSERT ON research_paper
FOR EACH ROW
BEGIN
    INSERT INTO paper_audit_log (paper_id, action, old_title, new_title, changed_by)
    VALUES (NEW.paper_id, 'INSERT', NULL, NEW.title, CURRENT_USER());
END$$

CREATE TRIGGER trg_paper_after_update
AFTER UPDATE ON research_paper
FOR EACH ROW
BEGIN
    INSERT INTO paper_audit_log (paper_id, action, old_title, new_title, changed_by)
    VALUES (NEW.paper_id, 'UPDATE', OLD.title, NEW.title, CURRENT_USER());
END$$

CREATE TRIGGER trg_paper_after_delete
AFTER DELETE ON research_paper
FOR EACH ROW
BEGIN
    INSERT INTO paper_audit_log (paper_id, action, old_title, new_title, changed_by)
    VALUES (OLD.paper_id, 'DELETE', OLD.title, NULL, CURRENT_USER());
END$$

-- D4. Search history: store a clean query, never a blank one
CREATE TRIGGER trg_search_history_before_insert
BEFORE INSERT ON search_history
FOR EACH ROW
BEGIN
    SET NEW.query = TRIM(NEW.query);
    SET NEW.search_type = LOWER(TRIM(NEW.search_type));
    IF NEW.query = '' AND NEW.search_type <> 'filter' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Search query cannot be blank';
    END IF;
    IF NEW.results_count IS NULL THEN
        SET NEW.results_count = 0;
    END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- Feature E: VIEWS
-- ---------------------------------------------------------------------

-- E1. Everything about a paper in one row. Correlated sub-queries are used
--     (instead of joining all the link tables at once) so that a paper with
--     2 authors and 2 topics does not get its counts multiplied.
CREATE OR REPLACE VIEW v_paper_details AS
SELECT
    p.paper_id,
    p.title,
    p.publication_year,
    p.doi,
    p.pdf_url,
    p.journal,
    p.abstract,
    (SELECT GROUP_CONCAT(a.name ORDER BY pa.author_order, a.name SEPARATOR ', ')
       FROM paper_author pa JOIN author a ON a.author_id = pa.author_id
      WHERE pa.paper_id = p.paper_id)                                   AS authors,
    (SELECT GROUP_CONCAT(t.topic_name ORDER BY t.topic_name SEPARATOR ', ')
       FROM paper_topic pt JOIN research_topic t ON t.topic_id = pt.topic_id
      WHERE pt.paper_id = p.paper_id)                                   AS topics,
    (SELECT GROUP_CONCAT(DISTINCT d.domain_name ORDER BY d.domain_name SEPARATOR ', ')
       FROM paper_topic pt
       JOIN research_topic t     ON t.topic_id = pt.topic_id
       JOIN research_subdomain s ON s.subdomain_id = t.subdomain_id
       JOIN research_domain d    ON d.domain_id = s.domain_id
      WHERE pt.paper_id = p.paper_id)                                   AS domains,
    (SELECT GROUP_CONCAT(k.keyword_name ORDER BY k.keyword_name SEPARATOR ', ')
       FROM paper_keyword pk JOIN keyword k ON k.keyword_id = pk.keyword_id
      WHERE pk.paper_id = p.paper_id)                                   AS keywords,
    (SELECT COUNT(*) FROM citation c WHERE c.cited_paper_id  = p.paper_id) AS times_cited,
    (SELECT COUNT(*) FROM citation c WHERE c.citing_paper_id = p.paper_id) AS references_made
FROM research_paper p;

-- E2. How many papers sit under each node of the research hierarchy
CREATE OR REPLACE VIEW v_topic_statistics AS
SELECT d.domain_id, d.domain_name,
       s.subdomain_id, s.subdomain_name,
       t.topic_id, t.topic_name,
       COUNT(pt.paper_id) AS paper_count
FROM research_domain d
JOIN research_subdomain s ON s.domain_id = d.domain_id
JOIN research_topic t     ON t.subdomain_id = s.subdomain_id
LEFT JOIN paper_topic pt  ON pt.topic_id = t.topic_id
GROUP BY d.domain_id, d.domain_name, s.subdomain_id, s.subdomain_name, t.topic_id, t.topic_name;

-- E3. Search activity per user (no password hashes exposed through the view)
CREATE OR REPLACE VIEW v_user_search_activity AS
SELECT u.user_id, u.name, u.email, u.role,
       (SELECT COUNT(*)         FROM search_history h WHERE h.user_id = u.user_id) AS total_searches,
       (SELECT MAX(searched_at) FROM search_history h WHERE h.user_id = u.user_id) AS last_search_at,
       (SELECT COUNT(*)         FROM saved_search  s WHERE s.user_id = u.user_id) AS saved_searches
FROM users u;

-- =====================================================================
-- TESTS (screenshot the outputs)
-- =====================================================================

-- Test D1: messy input is cleaned by the BEFORE INSERT trigger
INSERT INTO research_paper (title, publication_year, doi, abstract, journal)
VALUES ('   Trigger Demo Paper   ', 2024, '  HTTPS://DOI.ORG/10.1000/TRIGGER.DEMO  ',
        'Temporary row used to demonstrate triggers.', '   ');
SELECT paper_id, CONCAT('[', title, ']') AS stored_title, doi, journal
FROM research_paper WHERE doi = '10.1000/trigger.demo';

-- Test D3: UPDATE and DELETE the demo paper; the AFTER triggers log all three actions
UPDATE research_paper SET title = 'Trigger Demo Paper (edited)' WHERE doi = '10.1000/trigger.demo';
DELETE FROM research_paper WHERE doi = '10.1000/trigger.demo';
SELECT log_id, paper_id, action, old_title, new_title, changed_by, changed_at
FROM paper_audit_log ORDER BY log_id DESC LIMIT 3;     -- DELETE, UPDATE, INSERT

-- Test D4: search query is trimmed and search_type lower-cased
INSERT INTO search_history (user_id, query, search_type, results_count)
VALUES (3, '   neural networks  ', '  KEYWORD ', 3);
SELECT history_id, CONCAT('[', query, ']') AS stored_query, search_type
FROM search_history ORDER BY history_id DESC LIMIT 1;

-- Test E1-E3: views
SELECT paper_id, title, authors, topics, domains, times_cited
FROM v_paper_details ORDER BY times_cited DESC, paper_id LIMIT 8;

SELECT domain_name, subdomain_name, topic_name, paper_count
FROM v_topic_statistics ORDER BY domain_name, subdomain_name, topic_name;

SELECT name, role, total_searches, last_search_at, saved_searches
FROM v_user_search_activity;

SHOW TRIGGERS;
SHOW FULL TABLES WHERE Table_type = 'VIEW';
