import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image,
  ImageBackground, StyleSheet, Share, ActivityIndicator,
  Animated, Easing,
} from "react-native";
import { useAudio } from "../context/AudioContext";
import {
  Ionicons, MaterialIcons, Entypo,
  AntDesign, MaterialCommunityIcons,
} from "@expo/vector-icons";
import CustomHeader from "../components/ui/CustomHeader";
import Slider from "@react-native-community/slider";

export default function FavouriteScreen() {
  const {
    audioFiles, favoriteFiles, currentTrackIndex, isPlaying,
    durationMillis, positionMillis, isLoading, defaultImage,
    playPauseHandler, toggleRepeat, toggleShuffle, 
    repeatMode, shuffleMode, toggleFavorite, isFavorite, 
    getAlbumArt, setCurrentTrackIndex, setIsPlaying, seekHandler,
    playNextTrack, playPreviousTrack,
  } = useAudio();

  const [activeTab, setActiveTab] = useState("list"); // 'list' | 'player'
  const [favoritesPlaylist, setFavoritesPlaylist] = useState([]);
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Create a filtered playlist of only favorites
  useEffect(() => {
    const favs = audioFiles.filter(file => isFavorite(file.id));
    setFavoritesPlaylist(favs);
  }, [audioFiles, favoriteFiles]);

  // Animation for album art rotation
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotationAnim.stopAnimation();
      rotationAnim.setValue(0);
    }
  }, [isPlaying]);

  const rotateInterpolate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentTrack = audioFiles[currentTrackIndex] ?? null;
  const currentIsInFavs = currentTrack ? favoritesPlaylist.some(f => f.id === currentTrack.id) : false;
  const progress = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

  // Helper function to get artist name with fallback
  const getArtistName = useCallback((track) => {
    if (!track) return "Unknown Artist";
    return track.artist && track.artist !== "Unknown Artist" ? track.artist : "Unknown Artist";
  }, []);

  // Check if current track is last in favorites
  const isLastInFavorites = useCallback(() => {
    if (!currentTrack || favoritesPlaylist.length === 0) return false;
    const currentFavIndex = favoritesPlaylist.findIndex(f => f.id === currentTrack.id);
    return currentFavIndex === favoritesPlaylist.length - 1;
  }, [currentTrack, favoritesPlaylist]);

  // Handle next track within favorites only
  const handleNextInFavorites = useCallback(() => {
    if (!currentTrack || favoritesPlaylist.length === 0) return;

    const currentFavIndex = favoritesPlaylist.findIndex(f => f.id === currentTrack.id);
    
    if (currentFavIndex === -1) {
      // Current track not in favorites, play first favorite
      if (favoritesPlaylist.length > 0) {
        const firstFav = favoritesPlaylist[0];
        const indexInAll = audioFiles.findIndex(f => f.id === firstFav.id);
        if (indexInAll !== -1) {
          setCurrentTrackIndex(indexInAll);
          setIsPlaying(true);
        }
      }
    } else {
      if (repeatMode === "one") {
        // Repeat one - just restart current track
        if (seekHandler) {
          seekHandler(0);
          setIsPlaying(true);
        }
      } else if (currentFavIndex < favoritesPlaylist.length - 1) {
        // Play next in favorites
        const nextFav = favoritesPlaylist[currentFavIndex + 1];
        const indexInAll = audioFiles.findIndex(f => f.id === nextFav.id);
        if (indexInAll !== -1) {
          setCurrentTrackIndex(indexInAll);
          setIsPlaying(true);
        }
      } else {
        // Last track in favorites
        if (repeatMode === "all") {
          // Repeat all - go back to first
          if (favoritesPlaylist.length > 0) {
            const firstFav = favoritesPlaylist[0];
            const indexInAll = audioFiles.findIndex(f => f.id === firstFav.id);
            if (indexInAll !== -1) {
              setCurrentTrackIndex(indexInAll);
              setIsPlaying(true);
            }
          }
        } else {
          // Repeat off - stop playback
          setIsPlaying(false);
          if (seekHandler) {
            seekHandler(0);
          }
        }
      }
    }
  }, [currentTrack, favoritesPlaylist, audioFiles, repeatMode, setCurrentTrackIndex, setIsPlaying, seekHandler]);

  // Handle previous track within favorites only
  const handlePreviousInFavorites = useCallback(() => {
    if (!currentTrack || favoritesPlaylist.length === 0) return;

    const currentFavIndex = favoritesPlaylist.findIndex(f => f.id === currentTrack.id);
    
    if (currentFavIndex > 0) {
      const prevFav = favoritesPlaylist[currentFavIndex - 1];
      const indexInAll = audioFiles.findIndex(f => f.id === prevFav.id);
      if (indexInAll !== -1) {
        setCurrentTrackIndex(indexInAll);
        setIsPlaying(true);
      }
    } else if (currentFavIndex === 0) {
      // At first track, if repeat all is on, go to last
      if (repeatMode === "all" && favoritesPlaylist.length > 0) {
        const lastFav = favoritesPlaylist[favoritesPlaylist.length - 1];
        const indexInAll = audioFiles.findIndex(f => f.id === lastFav.id);
        if (indexInAll !== -1) {
          setCurrentTrackIndex(indexInAll);
          setIsPlaying(true);
        }
      }
    }
  }, [currentTrack, favoritesPlaylist, audioFiles, repeatMode, setCurrentTrackIndex, setIsPlaying]);

  // Play from favorites playlist
  const playFromFavorites = useCallback((trackId) => {
    const indexInAll = audioFiles.findIndex((f) => f.id === trackId);
    if (indexInAll !== -1) {
      setCurrentTrackIndex(indexInAll);
      setIsPlaying(true);
      setActiveTab("player");
    }
  }, [audioFiles, setCurrentTrackIndex, setIsPlaying]);

  // Handle seek
  const handleSeek = useCallback((value) => {
    if (seekHandler) {
      const seekPosition = (value / 100) * durationMillis;
      seekHandler(seekPosition);
    }
  }, [durationMillis, seekHandler]);

  const shareTrack = async (track) => {
    try {
      await Share.share({ 
        message: `Check out this song: ${track.filename}`,
        title: track.filename
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case "one":
        return <MaterialCommunityIcons name="repeat-once" size={22} color="#7db659" />;
      case "all":
        return <Ionicons name="repeat" size={22} color="#09f03b" />;
      default:
        return <Ionicons name="repeat-outline" size={22} color="rgba(255,255,255,0.6)" />;
    }
  };

  const formatTotalDuration = (files) => {
    const totalSeconds = files.reduce((acc, file) => acc + (file.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours} hr ${minutes} min`;
    return `${minutes} min`;
  };

  const formatTime = (millis) => {
    if (!millis || isNaN(millis)) return "00:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (favoriteFiles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="favorite-outline" size={80} color="#e74c3c" />
        <Text style={styles.emptyTitle}>No Favourites Yet</Text>
        <Text style={styles.emptySubtitle}>
          Tap the ♥ icon on any song to add it here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={currentTrack && currentIsInFavs ? getAlbumArt(currentTrack) : defaultImage}
        style={styles.backgroundImage}
        blurRadius={5}
      >
        <View style={styles.overlay}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <CustomHeader />
              <MaterialIcons name="favorite" size={24} color="#e74c3c" style={{ marginLeft: 8 }} />
              <Text style={styles.headerTitle}>Favourites</Text>
            </View>
            <Text style={styles.headerCount}>{favoriteFiles.length} songs</Text>
          </View>

          {/* ── Tab Switch ── */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "list" && styles.tabActive]}
              onPress={() => setActiveTab("list")}
            >
              <Text style={[styles.tabText, activeTab === "list" && styles.tabTextActive]}>
                Playlist
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "player" && styles.tabActive]}
              onPress={() => setActiveTab("player")}
            >
              <Text style={[styles.tabText, activeTab === "player" && styles.tabTextActive]}>
                Now Playing
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "list" ? (
            <>
              {/* Stats bar */}
              <View style={styles.statsBar}>
                <Text style={styles.statsText}>
                  {favoriteFiles.length} songs • {formatTotalDuration(favoriteFiles)}
                </Text>
                <TouchableOpacity
                  style={styles.playAllBtn}
                  onPress={() => {
                    if (favoriteFiles.length > 0) playFromFavorites(favoriteFiles[0].id);
                  }}
                >
                  <Ionicons name="play-circle" size={18} color="#9b59b6" />
                  <Text style={styles.playAllText}>Play All</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={favoriteFiles}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const actualIndex = audioFiles.findIndex((f) => f.id === item.id);
                  const isCurrentTrack = actualIndex === currentTrackIndex && currentIsInFavs;
                  const itemProgress =
                    isCurrentTrack && durationMillis > 0
                      ? (positionMillis / durationMillis) * 100
                      : 0;
                  const art = getAlbumArt(item);
                  const artistName = getArtistName(item);

                  return (
                    <TouchableOpacity
                      style={[styles.trackItem, isCurrentTrack && styles.trackItemActive]}
                      onPress={() => playFromFavorites(item.id)}
                    >
                      <Image
                        source={art}
                        style={styles.thumbnail}
                        defaultSource={defaultImage}
                      />
                      <View style={styles.trackInfo}>
                        <Text
                          style={[styles.trackName, isCurrentTrack && styles.trackNameActive]}
                          numberOfLines={1}
                        >
                          {item.filename.replace(/\.[^/.]+$/, "")}
                        </Text>
                        <Text style={styles.trackArtist} numberOfLines={1}>
                          {artistName}
                        </Text>
                        {isCurrentTrack && (
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${itemProgress}%` }]} />
                          </View>
                        )}
                      </View>
                      <View style={styles.actions}>
                        {isCurrentTrack && (
                          <TouchableOpacity onPress={playPauseHandler}>
                            <Ionicons
                              name={isPlaying ? "pause-circle" : "play-circle"}
                              size={28}
                              color="#9b59b6"
                            />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                          <MaterialIcons name="favorite" size={22} color="#e74c3c" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => shareTrack(item)}>
                          <Entypo name="share" size={20} color="#999" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          ) : (
            /* ── Mini Player View ── */
            <View style={styles.playerContainer}>
              {!currentIsInFavs && currentTrack ? (
                <View style={styles.notFavContainer}>
                  <Ionicons name="musical-notes" size={50} color="#555" />
                  <Text style={styles.notFavText}>
                    Currently playing song is not in your favourites
                  </Text>
                  <Text style={styles.notFavSub}>
                    Select a song from the Playlist tab to play a favourite
                  </Text>
                </View>
              ) : currentTrack ? (
                <>
                  <View style={styles.artContainer}>
                    <Animated.Image
                      source={getAlbumArt(currentTrack)}
                      style={[
                        styles.albumArt,
                        { transform: [{ rotate: rotateInterpolate }] }
                      ]}
                      defaultSource={defaultImage}
                    />
                  </View>

                  <View style={styles.playerTrackRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playerTrackName} numberOfLines={1}>
                        {currentTrack.filename.replace(/\.[^/.]+$/, "")}
                      </Text>
                      <Text style={styles.playerArtist} numberOfLines={1}>
                        {getArtistName(currentTrack)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleFavorite(currentTrack.id)}>
                      <MaterialIcons 
                        name={isFavorite(currentTrack.id) ? "favorite" : "favorite-border"} 
                        size={26} 
                        color={isFavorite(currentTrack.id) ? "#e74c3c" : "#888"} 
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Seekbar with slider */}
                  <View style={styles.seekbarContainer}>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={100}
                      value={progress}
                      onSlidingComplete={handleSeek}
                      minimumTrackTintColor="#9b59b6"
                      maximumTrackTintColor="#444"
                      thumbTintColor="#9b59b6"
                    />
                    <View style={styles.timeRow}>
                      <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
                      <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
                    </View>
                  </View>

                  <View style={styles.controls}>
                    <TouchableOpacity onPress={toggleShuffle}>
                      <Ionicons
                        name="shuffle-outline"
                        size={22}
                        color={shuffleMode ? "#f808d4" : "rgba(255,255,255,0.6)"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePreviousInFavorites}>
                      <AntDesign name="step-backward" size={26} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={playPauseHandler} disabled={isLoading}>
                      {isLoading ? (
                        <ActivityIndicator size="large" color="white" />
                      ) : (
                        <Ionicons
                          name={isPlaying ? "pause-circle" : "play-circle"}
                          size={70}
                          color="white"
                        />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleNextInFavorites}>
                      <AntDesign name="step-forward" size={26} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleRepeat}>
                      {getRepeatIcon()}
                    </TouchableOpacity>
                  </View>

                  {/* Show repeat status message when on last track */}
                  {isLastInFavorites() && repeatMode === "off" && (
                    <Text style={styles.lastTrackMessage}>
                      {/* Last track - playback will stop when finished */}
                    </Text>
                  )}
                </>
              ) : (
                <View style={styles.notFavContainer}>
                  <MaterialIcons name="music-note" size={50} color="#555" />
                  <Text style={styles.notFavText}>No track selected</Text>
                  <Text style={styles.notFavSub}>
                    Select a song from the Playlist tab to start playing
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  backgroundImage: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },

  emptyContainer: {
    flex: 1, backgroundColor: "#121212",
    justifyContent: "center", alignItems: "center", padding: 30,
  },
  emptyTitle: {
    color: "white", fontSize: 22, fontWeight: "bold",
    marginTop: 20, marginBottom: 10,
  },
  emptySubtitle: { color: "#888", fontSize: 15, textAlign: "center" },

  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 20, paddingTop: 50,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "bold", marginLeft: 8 },
  headerCount: { color: "#aaa", fontSize: 14 },

  tabRow: {
    flexDirection: "row", margin: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12, overflow: "hidden",
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#9b59b6" },
  tabText: { color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "white" },

  statsBar: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 15, paddingBottom: 10,
  },
  statsText: { color: "#aaa", fontSize: 13 },
  playAllBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  playAllText: { color: "#9b59b6", fontWeight: "600" },

  trackItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 15, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
  },
  trackItemActive: { backgroundColor: "rgba(155,89,182,0.15)" },

  thumbnail: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: "#1a1a2e" },

  trackInfo: { flex: 1, marginRight: 8 },
  trackName: { color: "white", fontSize: 14, fontWeight: "500" },
  trackNameActive: { color: "#9b59b6" },
  trackArtist: { color: "#888", fontSize: 12, marginTop: 2 },

  progressBar: {
    height: 3, backgroundColor: "#444",
    borderRadius: 2, marginTop: 5, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#9b59b6", borderRadius: 2 },

  actions: { flexDirection: "row", alignItems: "center", gap: 15 },

  playerContainer: {
    flex: 1, paddingHorizontal: 25, paddingTop: 20, alignItems: "center",
  },
  notFavContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", gap: 12,
  },
  notFavText: { color: "#888", fontSize: 16, textAlign: "center", fontWeight: "500" },
  notFavSub: { color: "#555", fontSize: 13, textAlign: "center" },

  artContainer: { marginVertical: 20, alignItems: "center" },
  albumArt: { width: 220, height: 220, borderRadius: 110, backgroundColor: "#1a1a2e" },

  playerTrackRow: {
    flexDirection: "row", alignItems: "center",
    width: "100%", marginBottom: 15,
  },
  playerTrackName: { color: "white", fontSize: 18, fontWeight: "bold" },
  playerArtist: { color: "#888", fontSize: 14, marginTop: 3 },

  seekbarContainer: {
    width: "100%",
    marginBottom: 20,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeRow: {
    flexDirection: "row", justifyContent: "space-between",
    width: "100%", marginTop: 6,
  },
  timeText: { color: "#888", fontSize: 12 },

  controls: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", width: "100%",
    marginBottom: 20,
  },

  lastTrackMessage: {
    color: "#9b59b6",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
});