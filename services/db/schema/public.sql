-- CREATE SCHEMA IF NOT EXISTS public;

--
-- Table: users
--

-- DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS public.users (
    id serial PRIMARY KEY,
    group_id integer DEFAULT 2 NOT NULL,
    email character varying(320) UNIQUE NOT NULL,
    password character varying(255) NOT NULL,
    active boolean DEFAULT false NOT NULL,
    settings json NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    last_login timestamp
    -- CONSTRAINT group_fkey
    --     FOREIGN KEY(group_id)
	--         REFERENCES groups(id)
);

-- DO $$
--     BEGIN
--         IF NOT EXISTS
--             (
--                 SELECT *
--                 FROM users
--                 WHERE email = 'streamstory@ijs.si'
--             )
--         THEN
--             INSERT INTO users (
--                 group_id,
--                 email,
--                 password,
--                 active,
--                 settings
--             )
--             VALUES (
--                 1,
--                 'streamstory@ijs.si',
--                 '$2a$10$kF2crRMmb.4xOA28lt6CDejGe9bShzUllL9hJxwSfr0zb3zjilIYW',
--                 true,
--                 '{}'
--             );
--         END IF;
--     END
-- $$;

--
-- Table: tokens
--

-- DROP TABLE IF EXISTS tokens;
CREATE TABLE IF NOT EXISTS public.tokens (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    value character(64) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT token_fkey
        FOREIGN KEY(user_id)
	        REFERENCES users(id)
);

--
-- Table: sessions
--

-- DROP TABLE IF EXISTS sessions;
CREATE TABLE IF NOT EXISTS public.sessions (
    sid varchar NOT NULL COLLATE "default",
    sess json NOT NULL,
    expire timestamp(6) NOT NULL,
    CONSTRAINT session_pkey
        PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
)
WITH (OIDS=FALSE);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- DO $$
--     BEGIN
--         IF NOT EXISTS
--             (
--                 SELECT 1
--                 FROM information_schema.tables
--                 WHERE table_schema = 'public'
--                     AND table_name = 'session'
--             )
--         THEN
--             CREATE TABLE public.sessions (
--                 sid varchar NOT NULL COLLATE 'default',
--                 sess json NOT NULL,
--                 expire timestamp(6) NOT NULL
--             )
--             WITH (OIDS=FALSE);

--             ALTER TABLE sessions
--             ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;

--             CREATE INDEX IDX_session_expire ON sessions (expire);
--         END IF;
--     END
-- $$;