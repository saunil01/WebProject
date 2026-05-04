const JournalEntry = require("../models/JournalEntry");

const journalController = {
  // Get all journals for a logged-in user
  
  getAllJournals: async (req, res) => {
    try {
      const userId = req.user.user_id;
      const journals = await JournalEntry.findAllByUser(userId);
      if (!journals || journals.length === 0) {
        return res.status(200).json([]);
      }
      res.json(journals);
    } catch (err) {
      console.error("Error fetching journals:", err);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  },

  // Create a new journal entry
  createJournal: async (req, res) => {
    try {
      const { title, content, mood_id } = req.body;
      const userId = req.user.user_id;

      if (!title || !content) {
        return res
          .status(400)
          .json({ message: "Title and content are required" });
      }

      const newJournal = await JournalEntry.create({
        user_id: userId,
        mood_id: mood_id || null,
        title,
        content,
      });

      res.status(201).json({
        message: "Journal created successfully",
        journal: newJournal,
      });
    } catch (err) {
      console.error("Error creating journal:", err);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  },

  // Update an existing journal entry
  updateJournal: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedJournal = await JournalEntry.update(id, updates);
      if (!updatedJournal) {
        return res.status(404).json({ message: "Journal not found" });
      }

      res.json({
        message: "Journal updated successfully",
        journal: updatedJournal,
      });
    } catch (err) {
      console.error("Error updating journal:", err);
      res.status(500).json({ message: "Failed to update journal entry" });
    }
  },

  // Delete a journal entry
  deleteJournal: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await JournalEntry.delete(id);
      if (!deleted) {
        return res.status(404).json({ message: "Journal not found" });
      }
      res.json({ message: "Journal deleted successfully" });
    } catch (err) {
      console.error("Error deleting journal:", err);
      res.status(500).json({ message: "Failed to delete journal entry" });
    }
  },
};

module.exports = journalController;