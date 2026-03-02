import React, { useState, useEffect, useRef } from "react";
import {
  Image, ImageBackground, Text, View, TouchableOpacity,
  FlatList, Modal, ActivityIndicator, TextInput, Animated,
  Easing, Share, Alert, Platform, ToastAndroid,
} from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { useAudio } from "../context/AudioContext";
import styles from "../styles/PlayerScreen.styles";
import SeekBar from "../components/ui/SeekBar";
import {
  AntDesign, Entypo, Ionicons,
  MaterialCommunityIcons, MaterialIcons,
} from "@expo/vector-icons";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import DownloadListScreen from "./DownloadListSreeen";
import LocalTracksListScreen from "./LocalTracksListSreen";
import FavouriteScreen from "./FavouriteScreen";

const Drawer = createDrawerNavigator();

// ─── Share audio file ─────────────────────────────────────────────────────────
async function shareAudioFile(track) {
  try {
    const uri = track.localUri || track.uri;
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: "audio/*",
        dialogTitle: `Share: ${track.filename}`,
        UTI: "public.audio",
      });
    } else {
      await Share.share({ message: `Check out: ${track.filename}` });
    }
  } catch (e) {
    if (e.message !== "User did not share") console.error("Share error:", e);
  }
}

// ─── Set as Ringtone (Android only) ──────────────────────────────────────────
async function setAsRingtone(track) {
  if (Platform.OS !== "android") {
    Alert.alert("Not supported", "Setting a ringtone is only supported on Android.");
    return;
  }
  try {
    const uri = track.localUri || track.uri;
    await IntentLauncher.startActivityAsync("android.intent.action.RINGTONE_PICKER", {
      extra: {
        "android.intent.extra.ringtone.TYPE": 1,
        "android.intent.extra.ringtone.SHOW_DEFAULT": true,
        "android.intent.extra.ringtone.SHOW_SILENT": true,
        "android.intent.extra.ringtone.EXISTING_URI": uri,
        "android.intent.extra.ringtone.TITLE": "Choose Ringtone",
      },
    });
  } catch (e) {
    try {
      await IntentLauncher.startActivityAsync("android.settings.SOUND_SETTINGS");
      ToastAndroid.show("Navigate to Phone Ringtone and select your file.", ToastAndroid.LONG);
    } catch (e2) {
      Alert.alert("Error", "Could not open ringtone settings.");
    }
  }
}

// ─── PlayerContent ────────────────────────────────────────────────────────────
function PlayerContent() {
  const size = 200;
  const flatListRef = useRef(null);
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  const {
    audioFiles, filteredAudioFiles, setFilteredAudioFiles,
    currentTrackIndex,
    isPlaying, durationMillis, positionMillis, sliderValue,
    isLoading, totalAudioCount, repeatMode, shuffleMode,
    hasPermissions, defaultImage,
    playPauseHandler, playNextTrack, playPreviousTrack,
    toggleShuffle, toggleRepeat, seekHandler,
    toggleFavorite, isFavorite, getAlbumArt,
    getPermissionsAndLoadAudio,
    playTrack, // ← use playTrack from context
  } = useAudio();

  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [menuTrack, setMenuTrack] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const currentTrack = audioFiles[currentTrackIndex] ?? null;
  const albumArtSource = getAlbumArt(currentTrack ?? {});

  const artKey =
    currentTrack?.embeddedArtwork ||
    currentTrack?.folderArtwork ||
    currentTrack?.onlineArtwork ||
    `default-${currentTrack?.id ?? "none"}`;

  // ── Rotation animation ──────────────────────────────────────────────────
  useEffect(() => {
    let anim;
    if (isPlaying) {
      anim = Animated.loop(
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 5000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
    } else {
      rotateAnimation.stopAnimation();
    }
    return () => { if (anim) anim.stop(); };
  }, [isPlaying]);

  const spin = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // ── Filter ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioFiles.length > 0) {
      setFilteredAudioFiles(
        audioFiles.filter(
          (item) =>
            item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.artist && item.artist.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      );
    }
  }, [searchQuery, audioFiles]);

  // ── Scroll to current track ──────────────────────────────────────────────
  useEffect(() => {
    if (showPlaylist && filteredAudioFiles.length > 0) {
      const idx = filteredAudioFiles.findIndex(
        (item) => item.id === audioFiles[currentTrackIndex]?.id
      );
      if (idx !== -1 && flatListRef.current) {
        setTimeout(
          () =>
            flatListRef.current.scrollToIndex({
              index: idx,
              animated: true,
              viewPosition: 0.5,
            }),
          300
        );
      }
    }
  }, [showPlaylist]);

  const onScrollToIndexFailed = (info) => {
    setTimeout(
      () =>
        flatListRef.current?.scrollToIndex({
          index: info.index,
          animated: true,
          viewPosition: 0.5,
        }),
      500
    );
  };

  const getRepeatIcon = () => {
    if (repeatMode === "one")
      return <MaterialCommunityIcons name="repeat-once" size={24} color="#7db659" />;
    if (repeatMode === "all")
      return <Ionicons name="repeat" size={24} color="#09f03b" />;
    return <Ionicons name="repeat-outline" size={24} color="white" />;
  };

  const getCurrentTrackName = () =>
    currentTrack?.filename?.replace(/\.[^/.]+$/, "") || "No track selected";

  const getCurrentArtist = () => currentTrack?.artist || null;

  // ── Fixed: use playTrack so isPlayingRef is set before loadAudio runs ────
  const playTrackFromList = (index) => {
    const actualIndex = audioFiles.findIndex(
      (file) => file.id === filteredAudioFiles[index].id
    );
    if (actualIndex !== -1) {
      playTrack(actualIndex); // ← was: setCurrentTrackIndex + setIsPlaying
      setShowPlaylist(false);
    }
  };

  const openTrackMenu = (track) => {
    setMenuTrack(track);
    setShowTrackMenu(true);
  };

  return (
    <View style={styles.playScreenBody}>

      {/* ── Background image ── */}
      <ImageBackground
        source={albumArtSource}
        style={styles.backgroundImage}
        blurRadius={5}
      >
        <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
          <View style={styles.contentContainer}>

            {/* ── Header ── */}
            <View style={styles.headerIcons}>
              <TouchableOpacity onPress={() => navigation.openDrawer()}>
                <Ionicons name="menu" size={35} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerText}>Now Playing</Text>
              <TouchableOpacity onPress={() => currentTrack && openTrackMenu(currentTrack)}>
                <Entypo name="dots-three-vertical" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* ── Album Art disc ── */}
            <Animated.View style={[styles.playImage, { transform: [{ rotate: spin }] }]}>
              <Image
                key={artKey}
                source={albumArtSource}
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: "#1a1a2e",
                }}
              />
            </Animated.View>

            {/* ── Track Info ── */}
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {getCurrentTrackName()}
              </Text>
              {getCurrentArtist() ? (
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {getCurrentArtist()}
                </Text>
              ) : null}
            </View>

            {/* ── Progress + Controls ── */}
            <View style={styles.ah}>
              <View style={styles.musicMinutes}>
                <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
                <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
              </View>

              <SeekBar
                durationMillis={durationMillis}
                positionMillis={positionMillis}
                sliderValue={sliderValue}
                onSlidingComplete={seekHandler}
              />

              <View style={styles.playerControls}>
                <TouchableOpacity onPress={toggleShuffle}>
                  <Ionicons
                    name="shuffle-outline"
                    size={24}
                    color={shuffleMode ? "#f808d4" : "white"}
                  />
                </TouchableOpacity>

                <View style={styles.plays}>
                  <TouchableOpacity
                    onPress={() => playPreviousTrack()}
                    disabled={!audioFiles.length}
                  >
                    <AntDesign
                      name="step-backward"
                      size={28}
                      color={audioFiles.length ? "white" : "#666"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={playPauseHandler}
                    disabled={isLoading || !audioFiles.length}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="large" color="white" />
                    ) : (
                      <Ionicons
                        name={isPlaying ? "pause-circle" : "play-circle"}
                        size={80}
                        color={audioFiles.length ? "white" : "#eae6e6"}
                      />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => playNextTrack()}
                    disabled={!audioFiles.length}
                  >
                    <AntDesign
                      name="step-forward"
                      size={28}
                      color={audioFiles.length ? "white" : "#fcf8f8"}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={toggleRepeat}>{getRepeatIcon()}</TouchableOpacity>
              </View>

              {/* ── Bottom Icons ── */}
              <View style={styles.bottomIcons}>
                <TouchableOpacity onPress={() => setShowPlaylist(true)}>
                  <MaterialIcons name="queue-music" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity>
                  <MaterialIcons name="download" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => toggleFavorite()}
                  disabled={!audioFiles.length}
                >
                  <MaterialIcons
                    name={isFavorite() ? "favorite" : "favorite-outline"}
                    size={24}
                    color={isFavorite() ? "#e74c3c" : "white"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => currentTrack && shareAudioFile(currentTrack)}
                >
                  <Entypo name="share" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </ImageBackground>
      {/* ✅ ImageBackground closed HERE — before the Modals */}

      {/* ── Playlist Modal ── */}
      <Modal
        visible={showPlaylist}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPlaylist(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {hasPermissions
                  ? `Playlist (${filteredAudioFiles.length}/${totalAudioCount})`
                  : "No Permission"}
              </Text>
              <TouchableOpacity onPress={() => setShowPlaylist(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search songs or artists..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {!hasPermissions ? (
              <View style={styles.noPermissionContainer}>
                <Text style={styles.noPermissionText}>
                  Please grant media library permission
                </Text>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={getPermissionsAndLoadAudio}
                >
                  <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={filteredAudioFiles}
                keyExtractor={(item) => item.id}
                getItemLayout={(_, index) => ({
                  length: 80,
                  offset: 80 * index,
                  index,
                })}
                onScrollToIndexFailed={onScrollToIndexFailed}
                ListHeaderComponent={
                  <View style={styles.playlistStats}>
                    <Text style={styles.statsText}>
                      {filteredAudioFiles.length} songs •{" "}
                      {formatTotalDuration(filteredAudioFiles)}
                    </Text>
                  </View>
                }
                ListEmptyComponent={
                  <View style={styles.emptyListContainer}>
                    <Text style={styles.emptyListText}>No audio files found</Text>
                  </View>
                }
                renderItem={({ item, index }) => {
                  const actualIndex = audioFiles.findIndex((f) => f.id === item.id);
                  const isCurrentTrack = actualIndex === currentTrackIndex;
                  const progress =
                    isCurrentTrack && durationMillis > 0
                      ? (positionMillis / durationMillis) * 100
                      : 0;
                  const art = getAlbumArt(item);

                  return (
                    <TouchableOpacity
                      style={[
                        styles.playlistItem,
                        isCurrentTrack && styles.playlistItemActive,
                      ]}
                      onPress={() => playTrackFromList(index)}
                      onLongPress={() => openTrackMenu(item)}
                    >
                      <Image
                        key={
                          item.embeddedArtwork ||
                          item.folderArtwork ||
                          item.onlineArtwork ||
                          `default-${item.id}`
                        }
                        source={art}
                        style={styles.playlistImage}
                      />

                      <View style={styles.playlistInfo}>
                        <Text
                          style={[
                            styles.playlistTitle,
                            isCurrentTrack && { color: "#9b59b6" },
                          ]}
                          numberOfLines={1}
                        >
                          {item.filename.replace(/\.[^/.]+$/, "")}
                        </Text>

                        {item.artist ? (
                          <Text style={styles.playlistArtist} numberOfLines={1}>
                            {item.artist}
                          </Text>
                        ) : null}

                        {isCurrentTrack && (
                          <View style={styles.playlistProgressContainer}>
                            <View
                              style={[
                                styles.playlistProgress,
                                { width: `${progress}%` },
                              ]}
                            />
                          </View>
                        )}
                      </View>

                      <View style={styles.playlistActions}>
                        {isCurrentTrack && (
                          <TouchableOpacity
                            onPress={playPauseHandler}
                            style={styles.playPauseButton}
                          >
                            <Ionicons
                              name={isPlaying ? "pause-circle" : "play-circle"}
                              size={30}
                              color="#9b59b6"
                            />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => toggleFavorite(item.id)}
                          style={styles.shareButton}
                        >
                          <MaterialIcons
                            name={isFavorite(item.id) ? "favorite" : "favorite-outline"}
                            size={20}
                            color={isFavorite(item.id) ? "#e74c3c" : "#999"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openTrackMenu(item)}
                          style={styles.shareButton}
                        >
                          <Entypo name="dots-three-vertical" size={18} color="#999" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Track Context Menu Modal ── */}
      <Modal
        visible={showTrackMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setShowTrackMenu(false)}
      >
        <TouchableOpacity
          style={contextMenuStyles.backdrop}
          activeOpacity={1}
          onPress={() => setShowTrackMenu(false)}
        >
          <View style={contextMenuStyles.menu}>
            <Text style={contextMenuStyles.menuTitle} numberOfLines={1}>
              {menuTrack?.filename?.replace(/\.[^/.]+$/, "")}
            </Text>

            <TouchableOpacity
              style={contextMenuStyles.menuItem}
              onPress={async () => {
                setShowTrackMenu(false);
                if (menuTrack) await shareAudioFile(menuTrack);
              }}
            >
              <Entypo name="share" size={20} color="white" />
              <Text style={contextMenuStyles.menuText}>Share Audio File</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={contextMenuStyles.menuItem}
              onPress={async () => {
                setShowTrackMenu(false);
                if (menuTrack) await setAsRingtone(menuTrack);
              }}
            >
              <MaterialIcons name="ring-volume" size={20} color="white" />
              <Text style={contextMenuStyles.menuText}>Set as Ringtone</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={contextMenuStyles.menuItem}
              onPress={() => {
                if (menuTrack) toggleFavorite(menuTrack.id);
                setShowTrackMenu(false);
              }}
            >
              <MaterialIcons
                name={menuTrack && isFavorite(menuTrack.id) ? "favorite" : "favorite-outline"}
                size={20}
                color={menuTrack && isFavorite(menuTrack.id) ? "#e74c3c" : "white"}
              />
              <Text style={contextMenuStyles.menuText}>
                {menuTrack && isFavorite(menuTrack.id)
                  ? "Remove from Favourites"
                  : "Add to Favourites"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[contextMenuStyles.menuItem, { marginTop: 8 }]}
              onPress={() => setShowTrackMenu(false)}
            >
              <Ionicons name="close" size={20} color="#aaa" />
              <Text style={[contextMenuStyles.menuText, { color: "#aaa" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
    // ✅ Outer View closed last
  );
}

// ─── Context menu styles ──────────────────────────────────────────────────────
const contextMenuStyles = {
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    paddingBottom: 30,
  },
  menu: {
    backgroundColor: "#1e1e2e",
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  menuTitle: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 16,
  },
  menuText: {
    color: "white",
    fontSize: 16,
  },
};

// ─── Drawer wrapper ───────────────────────────────────────────────────────────
export default function PlayerScreen() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: "rgba(82, 45, 106, 0.45)", width: 280 },
        drawerLabelStyle: { color: "white" },
      }}
    >
      <Drawer.Screen
        name="Now Playing"
        component={PlayerContent}
        options={{
          drawerIcon: () => (
            <Ionicons name="musical-notes" size={22} color="white" />
          ),
        }}
      />
      <Drawer.Screen
        name="Downloads"
        component={DownloadListScreen}
        options={{
          drawerIcon: () => (
            <Ionicons name="download" size={22} color="white" />
          ),
        }}
      />
      <Drawer.Screen
        name="Favourites"
        component={FavouriteScreen}
        options={{
          drawerIcon: () => <Ionicons name="heart" size={22} color="white" />,
        }}
      />
      <Drawer.Screen
        name="Local Files"
        component={LocalTracksListScreen}
        options={{
          drawerIcon: () => <Ionicons name="folder" size={22} color="white" />,
        }}
      />
    </Drawer.Navigator>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(millis) {
  if (!millis) return "00:00";
  const s = Math.floor(millis / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function formatTotalDuration(files) {
  const s = files.reduce((a, f) => a + (f.duration || 0), 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}