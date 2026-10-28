CREATE DATABASE researchlens_;
USE researchlens_;
SELECT DATABASE();

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,

    CONSTRAINT chk_user_role
        CHECK (role IN ('STUDENT', 'ADMIN'))
);

CREATE TABLE research_domain (
    domain_id SERIAL PRIMARY KEY,
    domain_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

DESCRIBE research_domain;
CREATE TABLE research_subdomain (
    subdomain_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    domain_id BIGINT UNSIGNED NOT NULL,
    subdomain_name VARCHAR(150) NOT NULL,
    description TEXT,

    CONSTRAINT fk_subdomain_domain
        FOREIGN KEY (domain_id)
        REFERENCES research_domain(domain_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_subdomain
        UNIQUE (domain_id, subdomain_name)
);


CREATE TABLE research_topic (
    topic_id SERIAL PRIMARY KEY,
    subdomain_id BIGINT UNSIGNED NOT NULL,
    topic_name VARCHAR(150) NOT NULL,
    description TEXT,

    CONSTRAINT fk_topic_subdomain
        FOREIGN KEY (subdomain_id)
        REFERENCES research_subdomain(subdomain_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_topic
        UNIQUE (subdomain_id, topic_name)
);

CREATE TABLE research_paper (
    paper_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    publication_year INT,
    doi VARCHAR(255) UNIQUE,
    pdf_url TEXT,
    abstract TEXT,

    CONSTRAINT chk_publication_year
        CHECK (
            publication_year IS NULL
            OR publication_year BETWEEN 1900 AND 2100
        )
);

CREATE TABLE paper_topic (
    paper_id BIGINT UNSIGNED NOT NULL,
    topic_id BIGINT UNSIGNED NOT NULL,

    CONSTRAINT pk_paper_topic
        PRIMARY KEY (paper_id, topic_id),

    CONSTRAINT fk_paper_topic_paper
        FOREIGN KEY (paper_id)
        REFERENCES research_paper(paper_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_paper_topic_topic
        FOREIGN KEY (topic_id)
        REFERENCES research_topic(topic_id)
        ON DELETE CASCADE
);

CREATE TABLE author (
    author_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    affiliation VARCHAR(255),
    email VARCHAR(150)
);

CREATE TABLE paper_author (
    paper_id BIGINT UNSIGNED NOT NULL,
    author_id BIGINT UNSIGNED NOT NULL,
    author_order INT,

    CONSTRAINT pk_paper_author
        PRIMARY KEY (paper_id, author_id),

    CONSTRAINT fk_paper_author_paper
        FOREIGN KEY (paper_id)
        REFERENCES research_paper(paper_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_paper_author_author
        FOREIGN KEY (author_id)
        REFERENCES author(author_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_author_order
        CHECK (author_order IS NULL OR author_order > 0)
);

CREATE TABLE keyword (
    keyword_id SERIAL PRIMARY KEY,
    keyword_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE paper_keyword (
    paper_id BIGINT UNSIGNED NOT NULL,
    keyword_id BIGINT UNSIGNED NOT NULL,

    CONSTRAINT pk_paper_keyword
        PRIMARY KEY (paper_id, keyword_id),

    CONSTRAINT fk_paper_keyword_paper
        FOREIGN KEY (paper_id)
        REFERENCES research_paper(paper_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_paper_keyword_keyword
        FOREIGN KEY (keyword_id)
        REFERENCES keyword(keyword_id)
        ON DELETE CASCADE
);

CREATE TABLE citation (
    citing_paper_id BIGINT UNSIGNED NOT NULL,
    cited_paper_id BIGINT UNSIGNED NOT NULL,
    citation_context TEXT,

    CONSTRAINT pk_citation
        PRIMARY KEY (citing_paper_id, cited_paper_id),

    CONSTRAINT fk_citation_citing
        FOREIGN KEY (citing_paper_id)
        REFERENCES research_paper(paper_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_citation_cited
        FOREIGN KEY (cited_paper_id)
        REFERENCES research_paper(paper_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_no_self_citation
        CHECK (citing_paper_id <> cited_paper_id)
);

DESCRIBE users;

CREATE INDEX idx_paper_title
ON research_paper(title(255));

CREATE INDEX idx_paper_year
ON research_paper(publication_year);

CREATE INDEX idx_author_name
ON author(name);

CREATE INDEX idx_topic_name
ON research_topic(topic_name);

CREATE INDEX idx_search_history_user
ON search_history(user_id);

DESCRIBE users;

CREATE TABLE saved_search (
    search_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_saved_search_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);
DESCRIBE users;

CREATE TABLE saved_search (
    search_id SERIAL PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_saved_search_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE search_history (
    history_id SERIAL PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    results_count INT DEFAULT 0,

    CONSTRAINT fk_search_history_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_results_count
        CHECK (results_count >= 0)
);

CREATE INDEX idx_search_history_user
ON search_history(user_id);

CREATE INDEX idx_saved_search_user
ON saved_search(user_id);

ALTER TABLE research_paper
ADD COLUMN journal VARCHAR(255);

CREATE TABLE test_table (
    test_id INT
);
DROP TABLE test_table;

SHOW TABLES;