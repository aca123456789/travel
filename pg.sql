/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : PostgreSQL
 Source Server Version : 150012 (150012)
 Source Host           : localhost:5432
 Source Catalog        : travel_note
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 150012 (150012)
 File Encoding         : 65001

 Date: 05/05/2025 09:06:26
*/


-- ----------------------------
-- Type structure for admin_role
-- ----------------------------
DROP TYPE IF EXISTS "public"."admin_role";
CREATE TYPE "public"."admin_role" AS ENUM (
  'admin',
  'auditor'
);
ALTER TYPE "public"."admin_role" OWNER TO "root";

-- ----------------------------
-- Type structure for media_type
-- ----------------------------
DROP TYPE IF EXISTS "public"."media_type";
CREATE TYPE "public"."media_type" AS ENUM (
  'image',
  'video'
);
ALTER TYPE "public"."media_type" OWNER TO "root";

-- ----------------------------
-- Type structure for note_status
-- ----------------------------
DROP TYPE IF EXISTS "public"."note_status";
CREATE TYPE "public"."note_status" AS ENUM (
  'pending',
  'approved',
  'rejected'
);
ALTER TYPE "public"."note_status" OWNER TO "root";

-- ----------------------------
-- Type structure for user_role
-- ----------------------------
DROP TYPE IF EXISTS "public"."user_role";
CREATE TYPE "public"."user_role" AS ENUM (
  'auditor',
  'admin',
  'user'
);
ALTER TYPE "public"."user_role" OWNER TO "root";

-- ----------------------------
-- Sequence structure for note_media_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."note_media_id_seq";
CREATE SEQUENCE "public"."note_media_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."note_media_id_seq" OWNER TO "root";

-- ----------------------------
-- Table structure for admins
-- ----------------------------
DROP TABLE IF EXISTS "public"."admins";
CREATE TABLE "public"."admins" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "username" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "password_hash" text COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "role" "public"."admin_role" NOT NULL DEFAULT 'auditor'::admin_role,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
ALTER TABLE "public"."admins" OWNER TO "root";

-- ----------------------------
-- Records of admins
-- ----------------------------
BEGIN;
INSERT INTO "public"."admins" ("id", "username", "password_hash", "name", "role", "created_at", "updated_at") VALUES ('39734915-348d-4fbe-b61f-96b50faa9447', 'admin', '$2b$10$Php4blJfFxKLqEfO6dvHvOxfEA2QWqumDZa2SmOcmLGRuVCcKjvCm', '超级管理员', 'admin', '2025-05-04 14:49:32.224898+00', '2025-05-04 14:49:32.224898+00');
INSERT INTO "public"."admins" ("id", "username", "password_hash", "name", "role", "created_at", "updated_at") VALUES ('bc23229c-9518-4af6-bbb5-25f3f0f339b3', 'auditor', '$2b$10$GrYJjfrzsc9kwDx5nWqvP.4fscFjj9eUkw28d79DnOKXLw1diN3Ne', '内容审核员', 'auditor', '2025-05-04 14:49:32.254017+00', '2025-05-04 14:49:32.254017+00');
COMMIT;

-- ----------------------------
-- Table structure for note_media
-- ----------------------------
DROP TABLE IF EXISTS "public"."note_media";
CREATE TABLE "public"."note_media" (
  "id" int4 NOT NULL DEFAULT nextval('note_media_id_seq'::regclass),
  "note_id" uuid NOT NULL,
  "media_type" "public"."media_type" NOT NULL,
  "url" text COLLATE "pg_catalog"."default" NOT NULL,
  "order" int4 NOT NULL DEFAULT 0,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
ALTER TABLE "public"."note_media" OWNER TO "root";

-- ----------------------------
-- Records of note_media
-- ----------------------------
BEGIN;
INSERT INTO "public"."note_media" ("id", "note_id", "media_type", "url", "order", "created_at") VALUES (4, '2ec0dfb4-c545-48f3-b342-382769b5d0a2', 'image', '/upload/fa9bbaec-051f-4699-ba9b-24836365c493.jpg', 0, '2025-05-04 14:08:14.444486+00');
INSERT INTO "public"."note_media" ("id", "note_id", "media_type", "url", "order", "created_at") VALUES (5, '2ec0dfb4-c545-48f3-b342-382769b5d0a2', 'image', '/upload/60f90b2c-9443-4a88-aa3f-e538949e7893.jpg', 1, '2025-05-04 14:08:14.444486+00');
INSERT INTO "public"."note_media" ("id", "note_id", "media_type", "url", "order", "created_at") VALUES (6, '2ec0dfb4-c545-48f3-b342-382769b5d0a2', 'video', '/upload/1e69b5b9-b4ba-4405-b0e5-85d31eda0d2b.mp4', 2, '2025-05-04 14:08:14.444486+00');
COMMIT;

-- ----------------------------
-- Table structure for travel_notes
-- ----------------------------
DROP TABLE IF EXISTS "public"."travel_notes";
CREATE TABLE "public"."travel_notes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "title" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "content" text COLLATE "pg_catalog"."default" NOT NULL,
  "status" "public"."note_status" NOT NULL DEFAULT 'pending'::note_status,
  "rejection_reason" text COLLATE "pg_catalog"."default",
  "is_deleted" bool NOT NULL DEFAULT false,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "location" text COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."travel_notes" OWNER TO "root";

-- ----------------------------
-- Records of travel_notes
-- ----------------------------
BEGIN;
INSERT INTO "public"."travel_notes" ("id", "user_id", "title", "content", "status", "rejection_reason", "is_deleted", "created_at", "updated_at", "location") VALUES ('2ec0dfb4-c545-48f3-b342-382769b5d0a2', '407892ce-c69c-4337-b29e-94a4afd671d2', '123标题', '123123123123123', 'approved', NULL, 't', '2025-05-04 12:15:58.711739+00', '2025-05-05 00:58:13.917+00', '1123');
COMMIT;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "public"."users";
CREATE TABLE "public"."users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "username" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "password_hash" text COLLATE "pg_catalog"."default" NOT NULL,
  "nickname" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "avatar_url" text COLLATE "pg_catalog"."default",
  "role" "public"."user_role" NOT NULL DEFAULT 'user'::user_role,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
ALTER TABLE "public"."users" OWNER TO "root";

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
INSERT INTO "public"."users" ("id", "username", "password_hash", "nickname", "avatar_url", "role", "created_at", "updated_at") VALUES ('407892ce-c69c-4337-b29e-94a4afd671d2', 'user', '$2b$10$a6XQk/oDtW/.yOBc2.5O9OoZtApCxiUpX87Obau6C27cbu1zX2HZa', 'xiamo', '/upload/d14d5474-dec7-4e3d-bd80-8c7d9c98862b.png', 'user', '2025-05-04 10:06:18.853656+00', '2025-05-05 00:57:56.116+00');
COMMIT;

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."note_media_id_seq"
OWNED BY "public"."note_media"."id";
SELECT setval('"public"."note_media_id_seq"', 6, true);

-- ----------------------------
-- Uniques structure for table admins
-- ----------------------------
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_username_unique" UNIQUE ("username");

-- ----------------------------
-- Primary Key structure for table admins
-- ----------------------------
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table note_media
-- ----------------------------
ALTER TABLE "public"."note_media" ADD CONSTRAINT "note_media_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table travel_notes
-- ----------------------------
ALTER TABLE "public"."travel_notes" ADD CONSTRAINT "travel_notes_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "users_username_unique" UNIQUE ("username");
ALTER TABLE "public"."users" ADD CONSTRAINT "users_nickname_unique" UNIQUE ("nickname");

-- ----------------------------
-- Primary Key structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table note_media
-- ----------------------------
ALTER TABLE "public"."note_media" ADD CONSTRAINT "note_media_note_id_travel_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."travel_notes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table travel_notes
-- ----------------------------
ALTER TABLE "public"."travel_notes" ADD CONSTRAINT "travel_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
