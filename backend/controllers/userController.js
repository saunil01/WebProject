const db = require('../config/Database');

const userController = {
  // Fetch all users with basic + aggregated mood data
  getPublicProfiles: async (req, res) => {
    try {
      const [users] = await db.query(`
        SELECT
          u.user_id,
          u.username,
          u.avatar,
          u.role,
          u.gender,
          u.dob,
          TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) AS age,
          u.about_me,
          u.theme,
          COUNT(m.mood_id) AS total_moods,
          SUM(CASE WHEN m.mood_type = 'happy' THEN 1 ELSE 0 END) AS happy_count,
          SUM(CASE WHEN m.mood_type = 'sad' THEN 1 ELSE 0 END) AS sad_count,
          SUM(CASE WHEN m.mood_type = 'anxious' THEN 1 ELSE 0 END) AS anxious_count,
          SUM(CASE WHEN m.mood_type = 'stressed' THEN 1 ELSE 0 END) AS stressed_count,
          SUM(CASE WHEN m.mood_type = 'neutral' THEN 1 ELSE 0 END) AS neutral_count
        FROM Users u
        LEFT JOIN MoodEntries m ON u.user_id = m.user_id
        GROUP BY u.user_id
        ORDER BY u.username;
      `);
      res.json(users);
    } catch (error) {
      console.error('Error fetching public profiles:', error);
      res.status(500).json({ message: 'Server error while fetching profiles' });
    }
  },

  // Fetch single user public profile
  getUserProfileById: async (req, res) => {
    try {
      const userId = req.params.id;
      const [rows] = await db.query(`
        SELECT 
          u.user_id,
          u.username,
          u.avatar,
          u.gender,
          u.dob,
          TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) AS age,
          u.about_me,
          u.theme,
          COUNT(m.mood_id) AS total_moods,
          SUM(CASE WHEN m.mood_type = 'happy' THEN 1 ELSE 0 END) AS happy_count,
          SUM(CASE WHEN m.mood_type = 'sad' THEN 1 ELSE 0 END) AS sad_count,
          SUM(CASE WHEN m.mood_type = 'anxious' THEN 1 ELSE 0 END) AS anxious_count,
          SUM(CASE WHEN m.mood_type = 'stressed' THEN 1 ELSE 0 END) AS stressed_count,
          SUM(CASE WHEN m.mood_type = 'neutral' THEN 1 ELSE 0 END) AS neutral_count
        FROM Users u
        LEFT JOIN MoodEntries m ON u.user_id = m.user_id
        WHERE u.user_id = ?
        GROUP BY u.user_id;
      `, [userId]);

      if (rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching single user profile:', error);
      res.status(500).json({ message: 'Server error while fetching profile' });
    }
  }
};

module.exports = userController;