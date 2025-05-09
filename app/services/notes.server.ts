import { db, travelNotes, noteMedia, users } from "~/db";
import { eq, desc, and, or, sql, like, asc } from "drizzle-orm";

// Get all notes for a user
export async function getUserNotes(userId: string) {
  try {
    const notes = await db.query.travelNotes.findMany({
      where: eq(travelNotes.userId, userId),
      with: {
        media: true,
        user: {
          columns: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [desc(travelNotes.createdAt)],
    });
    
    return notes;
  } catch (error) {
    console.error("Error fetching user notes:", error);
    return [];
  }
}

// Get a single note by ID
export async function getNoteById(id: string) {
  try {
    const note = await db.query.travelNotes.findFirst({
      where: eq(travelNotes.id, id),
      with: {
        media: true,
        user: {
          columns: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });
    
    return note;
  } catch (error) {
    console.error("Error fetching note by ID:", error);
    return null;
  }
}

// Create a new note
export async function createNote({ 
  userId, 
  title, 
  content, 
  location = "",
  media = []
}: { 
  userId: string; 
  title: string; 
  content: string; 
  location?: string;
  media?: Array<{ type: "image" | "video"; url: string; order?: number }>;
}) {
  try {
    // Insert note
    const [note] = await db.insert(travelNotes)
      .values({
        userId,
        title, 
        content,
        location,
        status: "pending", // Always start as pending
      })
      .returning();
    
    if (!note) {
      throw new Error("Failed to create note");
    }
    
    // Insert media
    if (media.length > 0) {
      const mediaRows = media.map((m, index) => ({
        noteId: note.id,
        mediaType: m.type,
        url: m.url,
        order: m.order ?? index
      }));
      
      await db.insert(noteMedia).values(mediaRows);
    }
    
    // Return the created note with media
    return getNoteById(note.id);
  } catch (error) {
    console.error("Error creating note:", error);
    return null;
  }
}

// Update an existing note
export async function updateNote({
  id,
  userId,
  title,
  content,
  location,
  media = []
}: {
  id: string;
  userId: string;
  title: string;
  content: string;
  location?: string;
  media?: Array<{ id?: string; type: "image" | "video"; url: string; order?: number }>;
}) {
  try {
    // Verify the note belongs to this user
    const existingNote = await db.query.travelNotes.findFirst({
      where: and(
        eq(travelNotes.id, id),
        eq(travelNotes.userId, userId)
      )
    });
    
    if (!existingNote) {
      return { error: "NOTE_NOT_FOUND" };
    }
    
    // Update note
    const [updatedNote] = await db.update(travelNotes)
      .set({ 
        title, 
        content,
        location: location || existingNote.location,
        status: "pending", // Revert to pending status when edited
        updatedAt: new Date()
      })
      .where(eq(travelNotes.id, id))
      .returning();
    
    if (!updatedNote) {
      return { error: "UPDATE_FAILED" };
    }
    
    // Handle media updates (more complex in a real app)
    // Here we take the simple approach: delete all existing media and add new ones
    await db.delete(noteMedia).where(eq(noteMedia.noteId, id));
    
    if (media.length > 0) {
      const mediaRows = media.map((m, index) => ({
        noteId: id,
        mediaType: m.type,
        url: m.url,
        order: m.order ?? index
      }));
      
      await db.insert(noteMedia).values(mediaRows);
    }
    
    // Return the updated note with media
    return { note: await getNoteById(id) };
  } catch (error) {
    console.error("Error updating note:", error);
    return { error: "UPDATE_FAILED" };
  }
}

// Delete a note (logical delete)
export async function deleteNote(id: string, userId: string) {
  try {
    // Verify the note belongs to this user
    const existingNote = await db.query.travelNotes.findFirst({
      where: and(
        eq(travelNotes.id, id),
        eq(travelNotes.userId, userId)
      )
    });
    
    if (!existingNote) {
      return { error: "NOTE_NOT_FOUND" };
    }
    
    // Perform a logical delete
    await db.update(travelNotes)
      .set({ isDeleted: true })
      .where(eq(travelNotes.id, id));
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);
    return { error: "DELETE_FAILED" };
  }
}

// Get published notes for the homepage or public viewing
export async function getPublishedNotes({ limit = 10, offset = 0 }: { limit?: number; offset?: number } = {}) {
  try {
    const notes = await db.query.travelNotes.findMany({
      where: and(
        eq(travelNotes.status, "approved"),
        eq(travelNotes.isDeleted, false)
      ),
      with: {
        media: true,
        user: {
          columns: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [desc(travelNotes.createdAt)],
      limit,
      offset,
    });
    
    return notes;
  } catch (error) {
    console.error("Error fetching published notes:", error);
    return [];
  }
}

// Types for review
export type TravelNoteStatus = "pending" | "approved" | "rejected";

export type TravelNoteWithAuthor = {
  id: string;
  title: string;
  content: string;
  status: TravelNoteStatus;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  author: {
    id: string;
    username: string;
    nickname: string;
    avatarUrl: string | null;
  };
  mediaCount: number;
};

// Get notes for admin review with pagination
export async function getNotesForReview({
  status,
  page = 1,
  limit = 10,
  search,
}: {
  status?: TravelNoteStatus;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const offset = (page - 1) * limit;
  
  // Build where conditions
  let whereConditions = and(
    eq(travelNotes.isDeleted, false)
  );
  
  // Add status filter if provided
  if (status) {
    whereConditions = and(
      whereConditions,
      eq(travelNotes.status, status)
    );
  }
  
  // Add search filter if provided
  if (search) {
    whereConditions = and(
      whereConditions,
      or(
        like(travelNotes.title, `%${search}%`),
        like(users.nickname, `%${search}%`)
      )
    );
  }
  
  // Get notes with authors
  const notesWithAuthors = await db
    .select({
      id: travelNotes.id,
      title: travelNotes.title,
      content: travelNotes.content,
      status: travelNotes.status,
      rejectionReason: travelNotes.rejectionReason,
      createdAt: travelNotes.createdAt,
      updatedAt: travelNotes.updatedAt,
      isDeleted: travelNotes.isDeleted,
      author: {
        id: users.id,
        username: users.username,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
      },
      mediaCount: sql<number>`COUNT(${noteMedia.id})`,
    })
    .from(travelNotes)
    .leftJoin(users, eq(travelNotes.userId, users.id))
    .leftJoin(noteMedia, eq(travelNotes.id, noteMedia.noteId))
    .where(whereConditions)
    .groupBy(
      travelNotes.id,
      travelNotes.title,
      travelNotes.content,
      travelNotes.status,
      travelNotes.rejectionReason,
      travelNotes.createdAt,
      travelNotes.updatedAt,
      travelNotes.isDeleted,
      users.id,
      users.username,
      users.nickname,
      users.avatarUrl
    )
    .orderBy(desc(travelNotes.createdAt))
    .limit(limit)
    .offset(offset);
    
  // Get total count of notes matching filters
  const [{ count }] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(travelNotes)
    .leftJoin(users, eq(travelNotes.userId, users.id))
    .where(whereConditions);
  
  const totalPages = Math.ceil(count / limit);
  
  return {
    notes: notesWithAuthors,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
    },
  };
}

// Update note status
export async function updateNoteStatus({
  noteId,
  status,
  rejectionReason,
}: {
  noteId: string;
  status: TravelNoteStatus;
  rejectionReason?: string;
}) {
  await db
    .update(travelNotes)
    .set({
      status,
      rejectionReason: status === "rejected" ? rejectionReason : null,
      updatedAt: new Date(),
    })
    .where(eq(travelNotes.id, noteId));
    
  return { success: true };
}

// Delete note for admin (logical delete)
export async function adminDeleteNote(noteId: string) {
  await db
    .update(travelNotes)
    .set({
      isDeleted: true,
      updatedAt: new Date(),
    })
    .where(eq(travelNotes.id, noteId));
    
  return { success: true };
}

// Get note details with media
export async function getNoteDetails(noteId: string) {
  const note = await db.query.travelNotes.findFirst({
    where: eq(travelNotes.id, noteId),
    with: {
      user: true,
      media: {
        orderBy: asc(noteMedia.order),
      },
    },
  });
  
  if (!note) {
    throw new Error("游记不存在");
  }
  
  return note;
} 
