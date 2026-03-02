import React, { useState, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, Share, TextInput, Alert, Modal,
} from "react-native";
import { useAudio } from "../context/AudioContext";
import {
  Ionicons, MaterialIcons, Entypo,
  MaterialCommunityIcons, AntDesign,
} from "@expo/vector-icons";
import CustomHeader from "../components/ui/CustomHeader";

export default function LocalTracksListScreen() {
  const {
    audioFiles, filteredAudioFiles, setFilteredAudioFiles,
    currentTrackIndex, isPlaying, durationMillis, positionMillis,
    totalAudioCount, defaultImage,
    playPauseHandler, toggleFavorite, isFavorite,
    getAlbumArt, deleteTrack,
    playTrack, // ← use playTrack from context instead of setCurrentTrackIndex + setIsPlaying
  } = useAudio();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const flatListRef = useRef(null);

  // Local filter (independent of PlayerScreen's filter)
  const localFiltered = audioFiles.filter(
    (item) =>
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.artist && item.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Fixed: use playTrack so isPlayingRef is set before loadAudio runs ────
  const playTrackById = (trackId) => {
    const index = audioFiles.findIndex((f) => f.id === trackId);
    if (index !== -1) playTrack(index); // ← was: setCurrentTrackIndex + setIsPlaying
  };

  const shareTrack = async (track) => {
    try {
      await Share.share({ message: `Check out this song: ${track.filename}` });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const confirmDelete = (track) => {
    setSelectedTrack(track);
    Alert.alert(
      "Remove from Library",
      `Remove "${track.filename.replace(/\.[^/.]+$/, "")}" from your list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            deleteTrack(track.id);
            setSelectedTrack(null);
          },
        },
      ]
    );
  };

  const openOptions = (track) => {
    setSelectedTrack(track);
    setShowOptions(true);
  };

  const currentTrack = audioFiles[currentTrackIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
                <CustomHeader  />  
          <Ionicons name="musical-notes" size={24} color="#9b59b6" />
          <Text style={styles.headerTitle}>Local Files</Text>
        </View>
        <Text style={styles.headerCount}>
          {localFiltered.length}/{totalAudioCount} songs
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs or artists..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {localFiltered.length} songs • {formatTotalDuration(localFiltered)}
        </Text>
        <TouchableOpacity
          style={styles.playAllBtn}
          onPress={() => localFiltered.length > 0 && playTrackById(localFiltered[0].id)}
        >
          <Ionicons name="play-circle" size={18} color="#9b59b6" />
          <Text style={styles.playAllText}>Play All</Text>
        </TouchableOpacity>
      </View>

      {/* Track List */}
      <FlatList
        ref={flatListRef}
        data={localFiltered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: currentTrack ? 90 : 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={60} color="#444" />
            <Text style={styles.emptyText}>No songs found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const actualIndex = audioFiles.findIndex((f) => f.id === item.id);
          const isCurrentTrack = actualIndex === currentTrackIndex;
          const trackProgress =
            isCurrentTrack && durationMillis > 0
              ? (positionMillis / durationMillis) * 100
              : 0;
          const favored = isFavorite(item.id);
          const art = getAlbumArt(item);

          return (
            <TouchableOpacity
              style={[styles.trackItem, isCurrentTrack && styles.trackItemActive]}
              onPress={() => playTrackById(item.id)}
              onLongPress={() => openOptions(item)}
            >
              {/* Thumbnail - Album art only, no color fallback */}
              <Image
                source={art || defaultImage}
                style={styles.thumbnail}
                defaultSource={defaultImage}
              />

              {/* Info */}
              <View style={styles.trackInfo}>
                <Text
                  style={[styles.trackName, isCurrentTrack && styles.trackNameActive]}
                  numberOfLines={1}
                >
                  {item.filename.replace(/\.[^/.]+$/, "")}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {item.artist || "Unknown Artist"} •{" "}
                  {item.album !== "Unknown Album" ? item.album : ""}
                </Text>
                <Text style={styles.trackDuration}>
                  {formatTime(item.duration ? item.duration * 1000 : 0)}
                </Text>
                {isCurrentTrack && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${trackProgress}%` }]} />
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                {isCurrentTrack && (
                  <TouchableOpacity onPress={playPauseHandler}>
                    <Ionicons
                      name={isPlaying ? "pause-circle" : "play-circle"}
                      size={28} color="#9b59b6"
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                  <MaterialIcons
                    name={favored ? "favorite" : "favorite-outline"}
                    size={22}
                    color={favored ? "#e74c3c" : "#666"}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openOptions(item)}>
                  <Entypo name="dots-three-vertical" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Mini Now-Playing bar at the bottom */}
      {currentTrack && (
        <TouchableOpacity style={styles.miniPlayer} activeOpacity={0.9}>
          {/* Mini player art - Album art only */}
          <Image
            source={getAlbumArt(currentTrack) || defaultImage}
            style={styles.miniArt}
            defaultSource={defaultImage}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.miniTrackName} numberOfLines={1}>
              {currentTrack.filename.replace(/\.[^/.]+$/, "")}
            </Text>
            <Text style={styles.miniArtist} numberOfLines={1}>
              {currentTrack.artist || "Unknown Artist"}
            </Text>
          </View>
          <TouchableOpacity onPress={playPauseHandler} style={{ padding: 8 }}>
            <Ionicons
              name={isPlaying ? "pause-circle" : "play-circle"}
              size={38} color="#9b59b6"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Options Bottom Sheet Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.optionsSheet}>
            {/* Track preview - Album art only */}
            {selectedTrack && (
              <View style={styles.optionsHeader}>
                <Image
                  source={getAlbumArt(selectedTrack) || defaultImage}
                  style={styles.optionsArt}
                  defaultSource={defaultImage}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionsTrackName} numberOfLines={1}>
                    {selectedTrack.filename.replace(/\.[^/.]+$/, "")}
                  </Text>
                  <Text style={styles.optionsArtist} numberOfLines={1}>
                    {selectedTrack.artist || "Unknown Artist"}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.optionsDivider} />

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setShowOptions(false);
                selectedTrack && playTrackById(selectedTrack.id);
              }}
            >
              <Ionicons name="play-circle-outline" size={24} color="white" />
              <Text style={styles.optionText}>Play Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setShowOptions(false);
                selectedTrack && toggleFavorite(selectedTrack.id);
              }}
            >
              <MaterialIcons
                name={selectedTrack && isFavorite(selectedTrack.id) ? "favorite" : "favorite-outline"}
                size={24}
                color={selectedTrack && isFavorite(selectedTrack.id) ? "#e74c3c" : "white"}
              />
              <Text style={styles.optionText}>
                {selectedTrack && isFavorite(selectedTrack.id)
                  ? "Remove from Favourites"
                  : "Add to Favourites"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setShowOptions(false);
                selectedTrack && shareTrack(selectedTrack);
              }}
            >
              <Entypo name="share" size={22} color="white" />
              <Text style={styles.optionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setShowOptions(false);
                selectedTrack && confirmDelete(selectedTrack);
              }}
            >
              <MaterialIcons name="delete-outline" size={24} color="#e74c3c" />
              <Text style={[styles.optionText, { color: "#e74c3c" }]}>
                Remove from Library
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionRow, styles.cancelRow]}
              onPress={() => setShowOptions(false)}
            >
              <Text style={[styles.optionText, { color: "#888" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function formatTime(millis) {
  if (!millis) return "00:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatTotalDuration(files) {
  const totalSeconds = files.reduce((acc, file) => acc + (file.duration || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },

  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15,
    borderBottomWidth: 1, borderBottomColor: "#222",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "bold" },
  headerCount: { color: "#888", fontSize: 13 },

  searchContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1e1e1e", margin: 12, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, color: "white", fontSize: 14 },

  statsRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 15, paddingBottom: 8,
  },
  statsText: { color: "#666", fontSize: 13 },
  playAllBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  playAllText: { color: "#9b59b6", fontWeight: "600" },

  trackItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 15, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
  },
  trackItemActive: { backgroundColor: "#1a1228" },

  thumbnail: { width: 52, height: 52, borderRadius: 8, marginRight: 12 },

  trackInfo: { flex: 1, marginRight: 6 },
  trackName: { color: "white", fontSize: 14, fontWeight: "500" },
  trackNameActive: { color: "#9b59b6" },
  trackArtist: { color: "#888", fontSize: 12, marginTop: 2 },
  trackDuration: { color: "#555", fontSize: 11, marginTop: 1 },

  progressBar: {
    height: 3, backgroundColor: "#333",
    borderRadius: 2, marginTop: 5, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#9b59b6", borderRadius: 2 },

  actions: { flexDirection: "row", alignItems: "center", gap: 8 },

  emptyContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    padding: 40, gap: 12,
  },
  emptyText: { color: "#444", fontSize: 16 },

  // Mini player
  miniPlayer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1e1e2e", padding: 10,
    borderTopWidth: 1, borderTopColor: "#2a2a3a",
  },
  miniArt: { width: 44, height: 44, borderRadius: 8 },
  miniTrackName: { color: "white", fontWeight: "600", fontSize: 13 },
  miniArtist: { color: "#888", fontSize: 11 },

  // Options modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  optionsSheet: {
    backgroundColor: "#1e1e1e", borderTopLeftRadius: 20,
    borderTopRightRadius: 20, paddingBottom: 30, paddingTop: 10,
  },
  optionsHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 15, gap: 12,
  },
  optionsArt: { width: 50, height: 50, borderRadius: 8 },
  optionsTrackName: { color: "white", fontWeight: "600", fontSize: 15 },
  optionsArtist: { color: "#888", fontSize: 13 },
  optionsDivider: { height: 1, backgroundColor: "#333", marginHorizontal: 20, marginBottom: 8 },

  optionRow: {
    flexDirection: "row", alignItems: "center", gap: 15,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  optionText: { color: "white", fontSize: 15 },
  cancelRow: {
    borderTopWidth: 1, borderTopColor: "#333",
    marginTop: 5, justifyContent: "center",
  },
});