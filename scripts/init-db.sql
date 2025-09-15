-- Database initialization script
-- This script will be executed when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The main database and user are already created by the POSTGRES_* environment variables
-- This script can be used for additional setup if needed

-- Create any additional schemas, tables, or initial data here
-- For now, we'll let TypeORM handle the schema creation