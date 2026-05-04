const BreathingSession = require('../models/BreathingSession');

const breathingController = {
  getAllSessions: async (req, res) => {
    try {
      const sessions = await BreathingSession.findAllByUser(req.user.user_id);
      res.json(sessions);
    } catch (err) {
      console.error('Fetch sessions error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  createSession: async (req, res) => {
    try {
      const { duration, actual_duration, status, session_date } = req.body;
      const newSession = await BreathingSession.create({
        user_id: req.user.user_id,
        duration,
        actual_duration,
        status,
        session_date,
      });
      res.status(201).json({
        message: 'Breathing session created successfully',
        session: newSession
      });
    } catch (err) {
      console.error('Create session error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  deleteSession: async (req, res) => {
    try {
      const deleted = await BreathingSession.delete(req.params.id);
      if (!deleted)
        return res.status(404).json({ message: 'Session not found' });
      res.json({ message: 'Session deleted successfully' });
    } catch (err) {
      console.error('Delete session error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = breathingController;