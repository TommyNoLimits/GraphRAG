-- Neo4j Schema Creation Script
-- Version: 1.0.0
-- Generated: 2025-10-21T20:10:22.504Z

-- Constraints:
CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE
CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS FOR (t:Tenant) REQUIRE t.id IS UNIQUE
CREATE CONSTRAINT user_entity_id_unique IF NOT EXISTS FOR (ue:UserEntity) REQUIRE ue.id IS UNIQUE
CREATE CONSTRAINT user_entity_tenant_investment_unique IF NOT EXISTS FOR (ue:UserEntity) REQUIRE (ue.tenant_id, ue.investment_entity) IS UNIQUE
CREATE CONSTRAINT fund_name_unique IF NOT EXISTS FOR (f:Fund) REQUIRE f.fund_name IS UNIQUE
CREATE CONSTRAINT document_id_unique IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE

-- Indexes:
CREATE INDEX user_email_index IF NOT EXISTS FOR (u:User) ON (u.email)
CREATE INDEX user_username_index IF NOT EXISTS FOR (u:User) ON (u.username)
CREATE INDEX user_tenant_index IF NOT EXISTS FOR (u:User) ON (u.tenant_id)
CREATE INDEX tenant_id_index IF NOT EXISTS FOR (t:Tenant) ON (t.id)
CREATE INDEX user_entity_tenant_id IF NOT EXISTS FOR (ue:UserEntity) ON (ue.tenant_id)
CREATE INDEX user_entity_alias IF NOT EXISTS FOR (ue:UserEntity) ON (ue.entity_allias)
CREATE INDEX fund_name_index IF NOT EXISTS FOR (f:Fund) ON (f.fund_name)
CREATE INDEX document_classification_index IF NOT EXISTS FOR (d:Document) ON (d.classification)
CREATE INDEX nav_date_index IF NOT EXISTS FOR (n:NAV) ON (n.as_of_date)
CREATE INDEX transaction_date_index IF NOT EXISTS FOR (t:Transaction) ON (t.as_of_date)

-- Schema creation complete