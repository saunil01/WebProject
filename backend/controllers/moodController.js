const MoodEntry = require("../models/MoodEntry");

// All mood-related operations grouped under one controller
const moodController = {
  // Get all moods for the logged-in user
  getAllMoods: async (req, res) => {
    try {
      const userId = req.user.user_id;
      const moods = await MoodEntry.findAllByUser(userId);
      res.json(moods);
    } catch (err) {
      console.error("Error fetching moods:", err);
      res.status(500).json({ message: "Failed to fetch moods" });
    }
  },

  // Get a single mood by its ID (must belong to current user)
  getMoodById: async (req, res) => {
    try {
      const mood = await MoodEntry.findById(req.params.id);
      if (!mood || mood.user_id !== req.user.user_id) {
        return res.status(404).json({ message: "Mood not found" });
      }
      res.json(mood);
    } catch (err) {
      console.error("Error fetching mood:", err);
      res.status(500).json({ message: "Failed to fetch mood" });
    }
  },

  // Create a new mood entry
  createMood: async (req, res) => {
    try {
      const { mood_type, emoji, note } = req.body;

      if (!mood_type) {
        return res.status(400).json({ message: "Mood type is required" });
      }

      const newMood = await MoodEntry.create({
        user_id: req.user.user_id,
        mood_type,
        emoji: emoji || "",
        note: note || "",
        mood_date: new Date(),
      });

      res.status(201).json({
        message: "Mood entry added successfully",
        mood: newMood,
      });
    } catch (err) {
      console.error("Error creating mood:", err);
      res.status(500).json({ message: "Failed to add mood entry" });
    }
  },

  // Update a mood entry (if it belongs to the logged-in user)
  updateMood: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await MoodEntry.findById(id);

      if (!existing || existing.user_id !== req.user.user_id) {
        return res.status(404).json({ message: "Mood not found" });
      }

      const updated = await MoodEntry.update(id, req.body);
      res.json({ message: "Mood updated successfully", mood: updated });
    } catch (err) {
      console.error("Error updating mood:", err);
      res.status(500).json({ message: "Failed to update mood" });
    }
  },

  // Delete a mood entry
  deleteMood: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await MoodEntry.findById(id);

      if (!existing || existing.user_id !== req.user.user_id) {
        return res.status(404).json({ message: "Mood not found" });
      }

      await MoodEntry.delete(id);
      res.json({ message: "Mood deleted successfully" });
    } catch (err) {
      console.error("Error deleting mood:", err);
      res.status(500).json({ message: "Failed to delete mood" });
    }
  },
};

module.exports = moodController;