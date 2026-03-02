import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system"; 

let MusicControl = null;
try {
  MusicControl = require("react-native-music-control").default;
} catch (e) {
  console.warn("[MediaNotification] react-native-music-control not found");
}

const NOTIFICATION_ID = "kingzplay-media";

let _callbacks = {
  onPlay: null, onPause: null, onNext: null, onPrevious: null, onStop: null,
};

let _isSetup = false;
let _notificationListener = null;
let _currentTrack = null;
let _isPlaying = false;
let _currentPosition = 0;

function setup({ onPlay, onPause, onNext, onPrevious, onStop }) {
  _callbacks = { onPlay, onPause, onNext, onPrevious, onStop };

  // Setup notification channel for Android
  if (Platform.OS === 'android' && Notifications) {
    Notifications.setNotificationChannelAsync('media-playback', {
      name: 'Media Playback',
      importance: Notifications.AndroidImportance.LOW,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null,
      bypassDnd: true,
      enableVibrate: false,
    });
  }

  if (Notifications && !_notificationListener) {
    _notificationListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;
      if (action === "PREV") _callbacks.onPrevious?.();
      else if (action === "PLAY") _callbacks.onPlay?.();
      else if (action === "PAUSE") _callbacks.onPause?.();
      else if (action === "NEXT") _callbacks.onNext?.();
    });
  }

  if (!MusicControl) {
    _isSetup = true;
    return;
  }

  if (!_isSetup) {
    try {
      // Enable background mode
      MusicControl.enableBackgroundMode(true);
      
      // Setup controls
      MusicControl.enableControl("play", true);
      MusicControl.enableControl("pause", true);
      MusicControl.enableControl("nextTrack", true);
      MusicControl.enableControl("previousTrack", true);
      MusicControl.enableControl("stop", true);
      MusicControl.enableControl("closeNotification", true, { when: "paused" });

      // Register event listeners
      MusicControl.on("play", () => {
        console.log("[MediaNotification] Play pressed");
        _callbacks.onPlay?.();
      });
      
      MusicControl.on("pause", () => {
        console.log("[MediaNotification] Pause pressed");
        _callbacks.onPause?.();
      });
      
      MusicControl.on("nextTrack", () => {
        console.log("[MediaNotification] Next pressed");
        _callbacks.onNext?.();
      });
      
      MusicControl.on("previousTrack", () => {
        console.log("[MediaNotification] Previous pressed");
        _callbacks.onPrevious?.();
      });
      
      MusicControl.on("stop", () => {
        console.log("[MediaNotification] Stop pressed");
        _callbacks.onStop?.();
      });

      console.log("[MediaNotification] ✅ MusicControl setup complete");
    } catch (e) {
      console.error("[MediaNotification] MusicControl setup error:", e);
    }
  }
  _isSetup = true;
}

function updateCallbacks(callbacks) {
  _callbacks = { ..._callbacks, ...callbacks };
}

async function update(track, isPlaying, position = 0) {
  if (!track) return;

  const isNewTrack = !_currentTrack || _currentTrack.id !== track.id;
  const artChanged =
    _currentTrack?.embeddedArtwork !== track.embeddedArtwork ||
    _currentTrack?.folderArtwork   !== track.folderArtwork   ||
    _currentTrack?.onlineArtwork   !== track.onlineArtwork;

  const stateChanged = _isPlaying !== isPlaying;

  _currentTrack = track;
  _isPlaying = isPlaying;
  _currentPosition = position;

  if (MusicControl && _isSetup) {
    try {
      MusicControl.enableBackgroundMode(true);

      // Update setNowPlaying when track changes OR artwork just loaded in
      if (isNewTrack || artChanged) {
        const title = track.filename?.replace(/\.[^/.]+$/, "") || "Unknown";
        const artworkUri = await getArtworkUri(track);

        MusicControl.setNowPlaying({
          title,
          artist: track.artist || "Unknown Artist",
          album: track.album || "KingzPlay",
          artwork: artworkUri,
          duration: track.duration ? track.duration * 1000 : 0,
          color: 0x9b59b6,
          colorized: true,
        });
      }

      MusicControl.updatePlayback({
        state: isPlaying ? MusicControl.STATE_PLAYING : MusicControl.STATE_PAUSED,
        elapsedTime: position / 1000,
      });

    } catch (e) {
      console.error("[MediaNotification] Update error:", e);
    }
  }

  // Only show fallback notification on meaningful changes
  if ((isNewTrack || stateChanged || artChanged) && Platform.OS === "android") {
    const title = track.filename?.replace(/\.[^/.]+$/, "") || "Unknown";
    showFallbackNotification(title, track.artist || "Unknown", isPlaying, position);
  }
}

async function showFallbackNotification(title, artist, isPlaying, position) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isPlaying ? '▶️ Playing' : '⏸️ Paused',
        body: `${title} - ${artist}`,
        data: { type: 'media-playback' },
        categoryIdentifier: 'media-playback',
        color: '#9b59b6',
      },
      trigger: null,
    });
  } catch (e) {
    console.error("[MediaNotification] Fallback notification error:", e);
  }
}

function dismiss() {
  if (MusicControl) {
    try {
      MusicControl.resetNowPlaying();
    } catch (e) {
      console.error("[MediaNotification] Dismiss error:", e);
    }
  }
}

function destroy() {
  dismiss();
  if (MusicControl) {
    try {
      MusicControl.stopControl();
    } catch (e) {
      console.error("[MediaNotification] Destroy error:", e);
    }
  }
  _isSetup = false;
  
  if (_notificationListener) {
    _notificationListener.remove();
    _notificationListener = null;
  }
}

async function createAndroidChannel() {
  if (Platform.OS !== "android" || !Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync("media-player", {
      name: "Media Player",
      importance: Notifications.AndroidImportance.LOW,
      showBadge: false,
      sound: null,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    console.log("[MediaNotification] ✅ Android channel created");
  } catch (e) {
    console.error("[MediaNotification] Channel creation error:", e);
  }
}

async function getArtworkUri(track) {
  // Same priority order as getAlbumArt() in AudioContext:
  // embedded → folder → online → null

  if (track.embeddedArtwork) {
    try {
      const base64Data = track.embeddedArtwork.split(",")[1];
      const tempPath = FileSystem.cacheDirectory + "current_artwork.jpg";
      await FileSystem.writeAsStringAsync(tempPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return tempPath;
    } catch (e) {
      console.error("[MediaNotification] Artwork save error:", e);
    }
  }

  if (track.folderArtwork) return track.folderArtwork;

  if (track.onlineArtwork) return track.onlineArtwork;

  return undefined; // no artwork - MusicControl shows nothing
}


export default {
  setup, updateCallbacks, update, dismiss, destroy, createAndroidChannel,
};