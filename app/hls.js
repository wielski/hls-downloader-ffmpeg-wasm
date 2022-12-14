export const mkHlsInstance = () => {
  return new Hls({
    debug: true,
    fLoader: (_context) => {}, // Disable fragment loading
  });
};

// returns array of levels
export const getLevelsList = (hls, url) => {
  return new Promise((resolve, reject) => {
    hls.on(Hls.Events.LEVEL_LOADED, (_event, level) => {
      resolve(hls.levels);
    });
    hls.loadSource(url);
  });
};

export const getAudioTracksList = (hls) => {
  return hls.audioTracks;
};

// returns level with fragments
export const resolveLevelWithFragments = (hls, level) => {
  return new Promise((resolve, reject) => {
    hls.on(Hls.Events.LEVEL_LOADED, (_event, level) => {
      resolve(level);
    });
    if (hls.currentLevel == level.id || hls.levels.length === 1) {
      resolve(level);
    }
    hls.loadLevel = level.id;
  });
};

// returns track with fragments
export const resolveTrackWithFragments = (hls, track) => {
  return new Promise((resolve, reject) => {
    hls.on(Hls.Events.AUDIO_TRACK_LOADED, (_event, track) => {
      resolve(track);
    });
    if (hls.audioTrack == track.id || hls.audioTracks.length === 1) {
      resolve(track);
    }
    hls.audioTrack = track.id;
  });
};

// returns array of fragments
export const getLevelFragments = (level) => {
  return (level.details.fragments || []).map((f) => f.url);
};

// returns object of a track name and its fragments
export const getAudioTracksFragments = async (hls) => {
  const audioTracks = hls.audioTracks;
  const audioTracksFragments = {};
  for (const track of audioTracks) {
    const trackWithFragments = await resolveTrackWithFragments(hls, track);
    audioTracksFragments[track.name] = getLevelFragments(trackWithFragments);
  }
  return audioTracksFragments;
};
