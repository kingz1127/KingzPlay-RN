import React, {
  createContext, useContext, useState, useRef, useEffect, useCallback,
} from "react";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import MediaNotificationService from "../services/MediaNotificationService";

const AudioContext = createContext();
export const useAudio = () => useContext(AudioContext);

const FAVORITES_KEY = "@kingzplay_favorites";

// ─── Native metadata packages (optional) ─────────────────────────────────────
let MusicInfo = null;
let MetadataRetriever = null;
try { MusicInfo = require("expo-music-info-2").default; } catch (_) {}
try { MetadataRetriever = require("@missingcore/react-native-metadata-retriever"); } catch (_) {}

async function extractEmbeddedArtwork(localUri) {
  if (MusicInfo) {
    try {
      const info = await MusicInfo.getMusicInfoAsync(localUri, {
        title: false, artist: true, album: false, genre: false, picture: true,
      });
      const artist = info?.artist || null;
      if (info?.picture?.pictureData?.length > 0) {
        const mime = info.picture.pictureType || "image/jpeg";
        return { artist, artwork: `data:${mime};base64,${info.picture.pictureData}` };
      }
      if (artist) return { artist, artwork: null };
    } catch (_) {}
  }
  if (MetadataRetriever) {
    try {
      const fn = MetadataRetriever.getMetadata
        ?? MetadataRetriever.default?.getMetadata
        ?? MetadataRetriever.retrieveMetadata
        ?? MetadataRetriever.default?.retrieveMetadata;
      if (fn) {
        const metadata = await fn(localUri, ["artist", "albumArtist", "artwork"]);
        if (metadata) {
          const artist = metadata.artist || metadata.albumArtist || null;
          const artwork = metadata.artwork ? `data:image/jpeg;base64,${metadata.artwork}` : null;
          if (artist || artwork) return { artist, artwork };
        }
      }
    } catch (_) {}
  }
  return { artist: null, artwork: null };
}

async function findFolderArt(uri) {
  try {
    const dir = uri.substring(0, uri.lastIndexOf("/") + 1);
    for (const name of [
      "cover.jpg","Cover.jpg","COVER.jpg","folder.jpg","Folder.jpg","FOLDER.jpg",
      "album.jpg","Album.jpg","ALBUM.jpg","artwork.jpg","cover.png","folder.png","album.png",
    ]) {
      const info = await FileSystem.getInfoAsync(dir + name);
      if (info.exists) return dir + name;
    }
  } catch (_) {}
  return null;
}

async function fetchOnlineMetadata(filename, existingArtist) {
  try {
    const cleanName = filename
      .replace(/\.[^/.]+$/, "").replace(/[_\-]/g, " ").replace(/\(\d{4}\)/g, "").trim();
    const query = existingArtist && existingArtist !== "Unknown Artist"
      ? `recording:"${cleanName}" AND artist:"${existingArtist}"` : `recording:"${cleanName}"`;
    const res = await fetch(
      `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&limit=1&fmt=json`,
      { headers: { "User-Agent": "KingzPlay/1.0 (app@example.com)" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const recording = data?.recordings?.[0];
    if (!recording) return null;
    const artist = recording["artist-credit"]?.[0]?.artist?.name || null;
    const releaseId = recording?.releases?.[0]?.id || null;
    let albumArtUrl = null;
    if (releaseId) {
      try {
        const r = await fetch(`https://coverartarchive.org/release/${releaseId}/front-250`, { method: "HEAD" });
        if (r.ok) albumArtUrl = `https://coverartarchive.org/release/${releaseId}/front-250`;
      } catch (_) {}
    }
    return { artist, albumArtUrl };
  } catch (_) { return null; }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AudioProvider({ children }) {

  // ── Refs: always current, safe inside any async callback ──────────────────
  const soundRef             = useRef(null);
  const isSoundLoadedRef     = useRef(false);   // mirrors isSoundLoaded state
  const repeatModeRef        = useRef("off");   // mirrors repeatMode state
  const shuffleModeRef       = useRef(false);   // mirrors shuffleMode state
  const audioFilesRef        = useRef([]);      // mirrors audioFiles state
  const currentIdxRef        = useRef(0);       // mirrors currentTrackIndex state
  const isPlayingRef         = useRef(false);   // mirrors isPlaying state
  const appStateRef          = useRef(AppState.currentState);

  // ── Stable BT callback refs (set every render, called by the one-time setup)
  const btPlayRef   = useRef(null);
  const btPauseRef  = useRef(null);
  const btNextRef   = useRef(null);
  const btPrevRef   = useRef(null);
  const btStopRef   = useRef(null);

  // ── ref that always points to the latest handleTrackEnd implementation ─────
  const handleTrackEndRef = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [audioFiles,         setAudioFiles]         = useState([]);
  const [filteredAudioFiles, setFilteredAudioFiles] = useState([]);
  const [currentTrackIndex,  setCurrentTrackIndex]  = useState(0);
  const [isPlaying,          setIsPlaying]           = useState(false);
  const [durationMillis,     setDurationMillis]      = useState(0);
  const [positionMillis,     setPositionMillis]      = useState(0);
  const [sliderValue,        setSliderValue]         = useState(0);
  const [isLoading,          setIsLoading]           = useState(false);
  const [isSoundLoaded,      setIsSoundLoaded]       = useState(false);
  const [totalAudioCount,    setTotalAudioCount]     = useState(0);
  const [repeatMode,         setRepeatModeState]     = useState("off");
  const [shuffleMode,        setShuffleMode]         = useState(false);
  const [hasPermissions,     setHasPermissions]      = useState(false);
  const [favorites,          setFavorites]           = useState([]);
  const [metadataCache,      setMetadataCache]       = useState({});

  const defaultImage = require("../assets/images/KingzPlaylogo2.png");

  // ── Keep refs in sync with state ──────────────────────────────────────────
  useEffect(() => { repeatModeRef.current    = repeatMode;        }, [repeatMode]);
  useEffect(() => { shuffleModeRef.current   = shuffleMode;       }, [shuffleMode]);
  useEffect(() => { audioFilesRef.current    = audioFiles;        }, [audioFiles]);
  useEffect(() => { currentIdxRef.current    = currentTrackIndex; }, [currentTrackIndex]);
  useEffect(() => { isPlayingRef.current     = isPlaying;         }, [isPlaying]);
  useEffect(() => { isSoundLoadedRef.current = isSoundLoaded;     }, [isSoundLoaded]);

  // ── Audio mode ────────────────────────────────────────────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playsInSilentModeIOS: true,
    }).catch(console.error);
  }, []);

  // ── AppState ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => { appStateRef.current = s; });
    return () => sub.remove();
  }, []);

  // ── Favorites: load persisted on mount ───────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY)
      .then((v) => { if (v) setFavorites(JSON.parse(v)); })
      .catch(console.error);
  }, []);

  // ── Favorites: save whenever they change ─────────────────────────────────
  useEffect(() => {
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)).catch(console.error);
  }, [favorites]);

  // ── MediaNotificationService: ONE-TIME setup via stable refs ─────────────
  // The callbacks passed here never change — they just forward to the refs,
  // which are updated every render to point at the latest implementations.
  useEffect(() => {
    MediaNotificationService.createAndroidChannel();
    MediaNotificationService.setup({
      onPlay:     () => btPlayRef.current?.(),
      onPause:    () => btPauseRef.current?.(),
      onNext:     () => btNextRef.current?.(),
      onPrevious: () => btPrevRef.current?.(),
      onStop:     () => btStopRef.current?.(),
    });
    return () => MediaNotificationService.destroy();
  }, []); // intentionally empty — runs once only

  // ── Load on mount / track change ─────────────────────────────────────────
  useEffect(() => { getPermissionsAndLoadAudio(); }, []);
  useEffect(() => {
    if (audioFiles.length > 0) loadAudio();
  }, [currentTrackIndex, audioFiles.length]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────────────────
  const getPermissionsAndLoadAudio = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") return;
      setHasPermissions(true);
      const total = await MediaLibrary.getAssetsAsync({ mediaType: "audio", first: 1 });
      setTotalAudioCount(total.totalCount);
      const media = await MediaLibrary.getAssetsAsync({ mediaType: "audio", first: 1000 });
      const basicAssets = await Promise.all(
        media.assets.map(async (asset) => {
          try {
            const info = await MediaLibrary.getAssetInfoAsync(asset.id);
            const localUri = info.localUri || asset.uri;
            const mlArtist = info.artist && info.artist !== "Unknown Artist" ? info.artist : null;
            return { ...asset, localUri, artist: mlArtist, album: info.album || null,
              duration: info.duration, embeddedArtwork: null, folderArtwork: null,
              onlineArtwork: null, metadataLoaded: false };
          } catch {
            return { ...asset, localUri: asset.uri, artist: null, album: null,
              embeddedArtwork: null, folderArtwork: null, onlineArtwork: null, metadataLoaded: false };
          }
        })
      );
      setAudioFiles(basicAssets);
      setFilteredAudioFiles(basicAssets);
    } catch (e) { console.error("Error loading audio:", e); }
  };

  const enrichTrackMetadata = useCallback(async (track, index) => {
    if (!track || track.metadataLoaded || metadataCache[track.id]) return;
    setMetadataCache((prev) => ({ ...prev, [track.id]: true }));
    const localUri = track.localUri || track.uri;
    const update = { metadataLoaded: true };
    const embedded = await extractEmbeddedArtwork(localUri);
    if (embedded.artwork) update.embeddedArtwork = embedded.artwork;
    if (embedded.artist)  update.artist = embedded.artist;
    if (!update.embeddedArtwork) {
      const fa = await findFolderArt(localUri);
      if (fa) update.folderArtwork = fa;
    }
    if (!update.embeddedArtwork && !update.folderArtwork) {
      const online = await fetchOnlineMetadata(track.filename, update.artist || track.artist);
      if (online?.artist && !update.artist) update.artist = online.artist;
      if (online?.albumArtUrl) update.onlineArtwork = online.albumArtUrl;
    }
    setAudioFiles((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], ...update };
      return next;
    });
    setFilteredAudioFiles((prev) =>
      prev.map((f) => (f.id === track.id ? { ...f, ...update } : f))
    );
  }, [metadataCache]);

  // ─── loadAudio ────────────────────────────────────────────────────────────
 const loadAudio = async () => {
  const track = audioFiles[currentTrackIndex];
  if (!track) return;

  try {
    setIsLoading(true);
    setIsSoundLoaded(false);
    isSoundLoadedRef.current = false;

    if (soundRef.current) {
      try { await soundRef.current.unloadAsync(); } catch (_) {}
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: track.localUri || track.uri },
      { shouldPlay: isPlayingRef.current, progressUpdateIntervalMillis: 1000 },
      (status) => handleStatusUpdate(status)
    );

    soundRef.current = sound;
    const status = await sound.getStatusAsync();
    setDurationMillis(status.durationMillis || 0);
    setPositionMillis(0);
    setSliderValue(0);
    setIsSoundLoaded(true);
    isSoundLoadedRef.current = true;
    setIsLoading(false);

    // Show notification immediately (may have no artwork yet)
    MediaNotificationService.update(track, isPlayingRef.current, 0);

    // Enrich metadata in background, then update notification with real artwork
    if (!track.metadataLoaded && !metadataCache[track.id]) {
      const localUri = track.localUri || track.uri;
      const enrichUpdate = { metadataLoaded: true };

      const embedded = await extractEmbeddedArtwork(localUri);
      if (embedded.artwork) enrichUpdate.embeddedArtwork = embedded.artwork;
      if (embedded.artist)  enrichUpdate.artist = embedded.artist;

      if (!enrichUpdate.embeddedArtwork) {
        const fa = await findFolderArt(localUri);
        if (fa) enrichUpdate.folderArtwork = fa;
      }

      if (!enrichUpdate.embeddedArtwork && !enrichUpdate.folderArtwork) {
        const online = await fetchOnlineMetadata(track.filename, enrichUpdate.artist || track.artist);
        if (online?.artist && !enrichUpdate.artist) enrichUpdate.artist = online.artist;
        if (online?.albumArtUrl) enrichUpdate.onlineArtwork = online.albumArtUrl;
      }

      // Merge into state
      setMetadataCache((prev) => ({ ...prev, [track.id]: true }));
      const enrichedTrack = { ...track, ...enrichUpdate };

      setAudioFiles((prev) => {
        const next = [...prev];
        if (next[currentTrackIndex]) next[currentTrackIndex] = enrichedTrack;
        return next;
      });
      setFilteredAudioFiles((prev) =>
        prev.map((f) => (f.id === track.id ? { ...f, ...enrichUpdate } : f))
      );

      // ← Now update notification with real artwork using the enriched track directly
      // Only if still on the same track
      if (currentIdxRef.current === currentTrackIndex) {
        MediaNotificationService.update(enrichedTrack, isPlayingRef.current, 0);
      }
    }

  } catch (e) {
    console.error("loadAudio error:", e);
    setIsLoading(false);
    setIsSoundLoaded(false);
    isSoundLoadedRef.current = false;
  }
};

  // ─── seekHandler ─────────────────────────────────────────────────────────
  const seekHandler = async (value) => {
    setSliderValue(value);
    setPositionMillis(value);
    if (soundRef.current && isSoundLoadedRef.current) {
      try { 
        await soundRef.current.setPositionAsync(value);
        // After seeking, update notification with new position
        const track = audioFilesRef.current[currentIdxRef.current];
        const status = await soundRef.current.getStatusAsync();
        MediaNotificationService.update(track, status.isPlaying, status.positionMillis);
      } catch (_) {}
    }
  };

  // ─── BT Ref callbacks - SINGLE VERSION (removed duplicate) ───────────────
  useEffect(() => {
    btPlayRef.current  = async () => {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        const status = await soundRef.current.getStatusAsync();
        setIsPlaying(true);
        const t = audioFilesRef.current[currentIdxRef.current];
        MediaNotificationService.update(t, true, status.positionMillis);
      }
    };
    
    btPauseRef.current = async () => {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        const status = await soundRef.current.getStatusAsync();
        setIsPlaying(false);
        const t = audioFilesRef.current[currentIdxRef.current];
        MediaNotificationService.update(t, false, status.positionMillis);
      }
    };
    
    btNextRef.current  = () => playNextTrack();
    btPrevRef.current  = () => playPreviousTrack();
    btStopRef.current  = async () => {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        setIsPlaying(false);
        const t = audioFilesRef.current[currentIdxRef.current];
        MediaNotificationService.update(t, false, 0);
      }
    };

    // Update the service callbacks
    MediaNotificationService.updateCallbacks({
      onPlay:     () => btPlayRef.current?.(),
      onPause:    () => btPauseRef.current?.(),
      onNext:     () => btNextRef.current?.(),
      onPrevious: () => btPrevRef.current?.(),
      onStop:     () => btStopRef.current?.(),
    });
  }, [playNextTrack, playPreviousTrack]); // Added dependencies

  // handleStatusUpdate is a stable function
 // In handleStatusUpdate, only update notification for state changes, not position spam
const handleStatusUpdate = useCallback((status) => {
  if (!status.isLoaded) return;

  setPositionMillis(status.positionMillis);
  setSliderValue(status.positionMillis);

  const wasPlaying = isPlayingRef.current;
  setIsPlaying(status.isPlaying);

  // Only update notification on play/pause state changes, not every tick
  if (status.isPlaying !== wasPlaying) {
    const track = audioFilesRef.current[currentIdxRef.current];
    if (track) {
      MediaNotificationService.update(track, status.isPlaying, status.positionMillis);
    }
  }

  if (status.didJustFinish) {
    handleTrackEndRef.current?.();
  }
}, []);

  // ─── handleTrackEnd ───────────────────────────────────────────────────────
  const handleTrackEnd = useCallback(() => {
    const mode  = repeatModeRef.current;
    const files = audioFilesRef.current;
    const idx   = currentIdxRef.current;
    const snd   = soundRef.current;

    console.log(`[TrackEnd] mode=${mode} idx=${idx}/${files.length}`);

    // ── REPEAT ONE ──────────────────────────────────────────────────────────
    if (mode === "one") {
      if (snd) {
        snd.setPositionAsync(0)
          .then(() => snd.playAsync())
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error("[repeatOne] error:", err);
            isPlayingRef.current = true;
            setCurrentTrackIndex(idx);
            setIsPlaying(true);
          });
      }
      return;
    }

    // ── REPEAT ALL ──────────────────────────────────────────────────────────
    if (mode === "all") {
      const next = shuffleModeRef.current
        ? Math.floor(Math.random() * files.length)
        : (idx + 1) % files.length;
      isPlayingRef.current = true;
      setCurrentTrackIndex(next);
      setIsPlaying(true);
      return;
    }

    // ── REPEAT OFF ──────────────────────────────────────────────────────────
    if (idx < files.length - 1) {
      const next = shuffleModeRef.current
        ? Math.floor(Math.random() * files.length)
        : idx + 1;
      isPlayingRef.current = true;
      setCurrentTrackIndex(next);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      setPositionMillis(0);
      setSliderValue(0);
    }
  }, []);

  // Keep handleTrackEndRef pointing to the latest version
  useEffect(() => {
    handleTrackEndRef.current = handleTrackEnd;
  }, [handleTrackEnd]);

  // ─── playPauseHandler ─────────────────────────────────────────────────────
  const playPauseHandler = async () => {
    if (isLoading) return;
    if (!isSoundLoadedRef.current) { 
      await loadAudio(); 
      return; 
    }
    try {
      const track = audioFilesRef.current[currentIdxRef.current];
      
      if (isPlayingRef.current) {
        await soundRef.current.pauseAsync();
        const status = await soundRef.current.getStatusAsync();
        setIsPlaying(false);
        MediaNotificationService.update(track, false, status.positionMillis);
      } else {
        await soundRef.current.playAsync();
        const status = await soundRef.current.getStatusAsync();
        setIsPlaying(true);
        MediaNotificationService.update(track, true, status.positionMillis);
      }
    } catch (e) { 
      console.error("Play/Pause error:", e);
    }
  };

  // ─── playTrack ────────────────────────────────────────────────────────────
  const playTrack = useCallback((index) => {
    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentTrackIndex(index);
  }, []);

  // ─── playNextTrack ────────────────────────────────────────────────────────
  const playNextTrack = useCallback((sourceList) => {
    const files = audioFilesRef.current;
    const queue = sourceList || files;
    if (!queue.length) return;
    const curId = files[currentIdxRef.current]?.id;
    const curQ  = queue.findIndex((f) => f.id === curId);
    const nextQ = shuffleModeRef.current
      ? Math.floor(Math.random() * queue.length)
      : (curQ + 1) % queue.length;
    const next  = files.findIndex((f) => f.id === queue[nextQ]?.id);
    if (next !== -1) playTrack(next);
  }, [playTrack]);

  // ─── playPreviousTrack ────────────────────────────────────────────────────
  const playPreviousTrack = useCallback((sourceList) => {
    const files = audioFilesRef.current;
    const queue = sourceList || files;
    if (!queue.length) return;
    const curId = files[currentIdxRef.current]?.id;
    const curQ  = queue.findIndex((f) => f.id === curId);
    const prevQ = (curQ - 1 + queue.length) % queue.length;
    const prev  = files.findIndex((f) => f.id === queue[prevQ]?.id);
    if (prev !== -1) playTrack(prev);
  }, [playTrack]);

  // ─── toggleShuffle / toggleRepeat ────────────────────────────────────────
  const toggleShuffle = () => setShuffleMode((s) => !s);

  const toggleRepeat = () => {
    const order = ["off", "one", "all"];
    setRepeatModeState((m) => {
      const next = order[(order.indexOf(m) + 1) % order.length];
      repeatModeRef.current = next;
      return next;
    });
  };

  // ─── Favorites ────────────────────────────────────────────────────────────
  const toggleFavorite = useCallback((trackId) => {
    const id = trackId || audioFilesRef.current[currentIdxRef.current]?.id;
    if (!id) return;
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(console.error);
      return next;
    });
  }, []);

  const isFavorite = useCallback((trackId) => {
    const id = trackId || audioFilesRef.current[currentIdxRef.current]?.id;
    return favorites.includes(id);
  }, [favorites]);

  const deleteTrack = (trackId) => {
    setAudioFiles((p) => p.filter((f) => f.id !== trackId));
    setFilteredAudioFiles((p) => p.filter((f) => f.id !== trackId));
    setFavorites((p) => p.filter((id) => id !== trackId));
  };

  const getAlbumArt = useCallback((track) => {
    if (!track) return defaultImage;
    if (track.embeddedArtwork) return { uri: track.embeddedArtwork };
    if (track.folderArtwork)   return { uri: track.folderArtwork };
    if (track.onlineArtwork)   return { uri: track.onlineArtwork };
    return defaultImage;
  }, []);

  const favoriteFiles = audioFiles.filter((f) => favorites.includes(f.id));

  return (
    <AudioContext.Provider value={{
      audioFiles, setAudioFiles,
      filteredAudioFiles, setFilteredAudioFiles,
      currentTrackIndex, setCurrentTrackIndex,
      isPlaying, setIsPlaying,
      durationMillis, positionMillis, sliderValue,
      isLoading, isSoundLoaded,
      totalAudioCount, repeatMode, shuffleMode,
      hasPermissions, favorites, favoriteFiles, defaultImage,
      getPermissionsAndLoadAudio,
      playPauseHandler, playNextTrack, playPreviousTrack,
      toggleShuffle, toggleRepeat, seekHandler,
      toggleFavorite, isFavorite, deleteTrack,
      getAlbumArt, playTrack,
    }}>
      {children}
    </AudioContext.Provider>
  );
}