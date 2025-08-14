const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Endpoint to get episode URL
app.get('/api/episode', (req, res) => {
  const { animeTitle, season, episode } = req.query;

  // Validate required parameters
  if (!animeTitle || !episode) {
    return res.status(400).json({
      error: 'Missing required parameters: animeTitle and episode are required'
    });
  }

  // Create filename from animeTitle
  const filename = `${animeTitle.toLowerCase().replace(/\s+/g, '-')}.txt`;
  const filepath = path.join(__dirname, 'anime', filename);

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({
      error: `Anime file not found: ${filename}`
    });
  }

  try {
    // Read the file content
    const data = fs.readFileSync(filepath, 'utf8');
    const lines = data.split('\n');

    // Find the episode URL
    let episodeUrl = null;
    const targetSeason = season || '1'; // Default to season 1 if not provided

    if (targetSeason === '1') {
      // For season 1, look for episodes before any season header
      for (const line of lines) {
        // If we hit a season header, we've moved past season 1
        if (/^Season \d+$/.test(line.trim())) {
          break;
        }
        
        // Check if this line is the episode we're looking for
        const episodeRegex = new RegExp(`Episode (${episode}):\\s*(https?:\\/\\/\\S+)`);
        const match = line.match(episodeRegex);
        
        if (match) {
          episodeUrl = match[2];
          break;
        }
      }
    } else {
      // For other seasons, look for episodes after the season header
      let inTargetSeason = false;
      
      for (const line of lines) {
        // Check if this line is a season header
        const seasonHeaderRegex = /^Season (\d+)$/;
        const seasonHeaderMatch = line.trim().match(seasonHeaderRegex);
        
        if (seasonHeaderMatch) {
          // We found a season header, check if it's the one we're looking for
          inTargetSeason = (seasonHeaderMatch[1] === targetSeason);
          continue;
        }
        
        // If we're in the target season section, check for episodes
        if (inTargetSeason) {
          // Check if this line is an episode
          const episodeRegex = new RegExp(`Episode (${episode}):\\s*(https?:\\/\\/\\S+)`);
          const match = line.match(episodeRegex);
          
          if (match) {
            episodeUrl = match[2];
            break;
          }
        }
      }
    }

    if (!episodeUrl) {
      return res.status(404).json({
        error: `Episode ${episode} not found for anime: ${animeTitle} season: ${targetSeason}`
      });
    }

    // Return the episode URL
    res.json({
      animeTitle,
      season: targetSeason,
      episode,
      url: episodeUrl
    });
  } catch (error) {
    res.status(500).json({
      error: `Error reading file: ${error.message}`
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Anime Episode API is running' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Anime Episode API server is running on port ${PORT}`);
});

module.exports = app;