-- =====================================================================
-- ResearchLens - 03_member1_advanced.sql   (Member 1 advanced features)
-- Run AFTER 01 and 02.
--   Feature A: STORED PROCEDURE + TRANSACTION  (sp_add_paper)
--   Feature B: STORED FUNCTION                 (fn_citation_count)
--   Feature C: FULL-TEXT SEARCH + INDEXING     (already in 01 / Q8 in 02)
-- Member 2 covers TRIGGERS and VIEWS in 04_member2_advanced.sql (team total: 6 concepts).
-- Run this file in the MySQL command line client or Workbench (it uses DELIMITER).
-- =====================================================================
USE researchlens;

DROP PROCEDURE IF EXISTS sp_add_paper;
DROP FUNCTION  IF EXISTS fn_citation_count;

DELIMITER $$

-- Feature A: inserts a paper + its authors + its topic atomically.
-- If ANY step fails, the whole thing rolls back (no half-saved paper).
CREATE PROCEDURE sp_add_paper(
    IN  p_title    TEXT,
    IN  p_year     INT,
    IN  p_doi      VARCHAR(255),
    IN  p_abstract TEXT,
    IN  p_journal  VARCHAR(255),
    IN  p_topic_id BIGINT UNSIGNED,
    IN  p_author_id BIGINT UNSIGNED,
    OUT p_new_paper_id BIGINT UNSIGNED
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_new_paper_id = NULL;
        RESIGNAL;
    END;

    START TRANSACTION;
        INSERT INTO research_paper (title, publication_year, doi, abstract, journal)
        VALUES (p_title, p_year, p_doi, p_abstract, p_journal);

        SET p_new_paper_id = LAST_INSERT_ID();

        INSERT INTO paper_topic  (paper_id, topic_id)               VALUES (p_new_paper_id, p_topic_id);
        INSERT INTO paper_author (paper_id, author_id, author_order) VALUES (p_new_paper_id, p_author_id, 1);
    COMMIT;
END$$

-- Feature B: function returning how many papers cite a given paper
CREATE FUNCTION fn_citation_count(p_paper_id BIGINT UNSIGNED)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count FROM citation WHERE cited_paper_id = p_paper_id;
    RETURN v_count;
END$$

DELIMITER ;

-- =====================================================================
-- TESTS (screenshot the outputs)
-- =====================================================================

-- Test 1: successful call -> paper, topic link and author link all created
CALL sp_add_paper('Graph Neural Networks Survey', 2022, '10.1000/gnn.2022.01',
                  'A survey of graph neural networks.', 'IEEE TNNLS', 2, 1, @new_id);
SELECT @new_id AS new_paper_id;
SELECT * FROM paper_topic  WHERE paper_id = @new_id;
SELECT * FROM paper_author WHERE paper_id = @new_id;

-- Test 2 (duplicate DOI -> ROLLBACK) is an EXPECTED-ERROR test, so it lives in
-- 05_validation_and_negative_tests.sql together with the other failing demos.
-- Keeping every file in 01-04 error-free means the whole setup can be run
-- top-to-bottom (and by Docker's init scripts) without stopping.

-- Test 3: function
SELECT paper_id, title, fn_citation_count(paper_id) AS times_cited
FROM research_paper
ORDER BY times_cited DESC;

-- Data-validation / integrity demos and the ALTER/DROP demo were moved to
-- 05_validation_and_negative_tests.sql (they are expected to fail).
