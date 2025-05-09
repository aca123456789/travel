import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  pgEnum,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enum definitions based on requirements
export const userRoleEnum = pgEnum("user_role", ["auditor", "admin", "user"]); // Added 'user' for mobile app users
export const noteStatusEnum = pgEnum("note_status", [
  "pending",
  "approved",
  "rejected",
]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
export const adminRoleEnum = pgEnum("admin_role", ["admin", "auditor"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  nickname: varchar("nickname", { length: 255 }).unique().notNull(),
  avatarUrl: text("avatar_url"), // Default can be handled application-side
  role: userRoleEnum("role").default("user").notNull(), // Default to 'user'
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()) // Automatically update timestamp on update
    .notNull(),
});

// Admin users table
export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: adminRoleEnum("role").default("auditor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Travel Notes table
export const travelNotes = pgTable("travel_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Link to users table, cascade delete notes if user is deleted
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  location: text("location"), // 添加位置字段
  status: noteStatusEnum("status").default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  isDeleted: boolean("is_deleted").default(false).notNull(), // For logical delete
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Note Media table (Images/Video)
export const noteMedia = pgTable("note_media", {
  id: serial("id").primaryKey(),
  noteId: uuid("note_id")
    .notNull()
    .references(() => travelNotes.id, { onDelete: "cascade" }), // Link to travel_notes table, cascade delete media if note is deleted
  mediaType: mediaTypeEnum("media_type").notNull(),
  url: text("url").notNull(), // URL or path to the media file
  order: integer("order").default(0).notNull(), // To maintain order, video first etc.
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  travelNotes: many(travelNotes),
}));

export const travelNotesRelations = relations(travelNotes, ({ one, many }) => ({
  user: one(users, {
    fields: [travelNotes.userId],
    references: [users.id],
  }),
  media: many(noteMedia),
}));

export const noteMediaRelations = relations(noteMedia, ({ one }) => ({
  travelNote: one(travelNotes, {
    fields: [noteMedia.noteId],
    references: [travelNotes.id],
  }),
})); 
 