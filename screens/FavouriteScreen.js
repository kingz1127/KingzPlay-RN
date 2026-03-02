
// import React, { useState } from "react";
// import {
//   View, Text, FlatList, TouchableOpacity, Image,
//   StyleSheet, Share, ActivityIndicator,
// } from "react-native";
// import { useAudio } from "../context/AudioContext";
// import { Ionicons, MaterialIcons, Entypo, AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
// import CustomHeader from "../components/ui/CustomHeader";

// export default function FavouriteScreen() {
//   const {
//     audioFiles, favoriteFiles, currentTrackIndex, isPlaying,
//     durationMillis, positionMillis, isLoading,
//     defaultImage, playPauseHandler, playNextTrack, playPreviousTrack,
//     toggleRepeat, toggleShuffle, repeatMode, shuffleMode,
//     toggleFavorite, isFavorite, getAlbumArt,
//     setCurrentTrackIndex, setIsPlaying,
//   } = useAudio();

//   const [activeTab, setActiveTab] = useState("list"); // 'list' | 'player'

//   const playFromFavorites = (trackId) => {
//     const indexInAll = audioFiles.findIndex((f) => f.id === trackId);
//     if (indexInAll !== -1) {
//       setCurrentTrackIndex(indexInAll);
//       setIsPlaying(true);
//       setActiveTab("player");
//     }
//   };

//   const shareTrack = async (track) => {
//     try {
//       await Share.share({ message: `Check out this song: ${track.filename}` });
//     } catch (error) {
//       console.error("Error sharing:", error);
//     }
//   };

//   const currentTrack = audioFiles[currentTrackIndex];
//   const currentIsInFavorites = currentTrack && isFavorite(currentTrack.id);
//   const progress = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

//   const getRepeatIcon = () => {
//     switch (repeatMode) {
//       case "one":
//         return <MaterialCommunityIcons name="repeat-once" size={22} color="#7db659" />;
//       case "all":
//         return <Ionicons name="repeat" size={22} color="#09f03b" />;
//       default:
//         return <Ionicons name="repeat-outline" size={22} color="rgba(255,255,255,0.6)" />;
//     }
//   };

//   if (favoriteFiles.length === 0) {
//     return (
//       <View style={styles.emptyContainer}>
//         <MaterialIcons name="favorite-outline" size={80} color="#e74c3c" />
//         <Text style={styles.emptyTitle}>No Favourites Yet</Text>
//         <Text style={styles.emptySubtitle}>
//           Tap the ♥ icon on any song to add it here
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//        <ImageBackground
//               source={albumArtSource}
//               style={styles.backgroundImage}
//               blurRadius={5}
//             >
      
//       {/* Header */}
//       <View style={styles.header}>
//         <View style={styles.headerLeft}>
//           <View>
//       <CustomHeader  />
      
//     </View>
//           <MaterialIcons name="favorite" size={24} color="#e74c3c" />
//           <Text style={styles.headerTitle}>Favourites</Text>
//         </View>
//         <Text style={styles.headerCount}>{favoriteFiles.length} songs</Text>
//       </View>

//       {/* Tab Switch */}
//       <View style={styles.tabRow}>
//         <TouchableOpacity
//           style={[styles.tab, activeTab === "list" && styles.tabActive]}
//           onPress={() => setActiveTab("list")}
//         >
//           <Text style={[styles.tabText, activeTab === "list" && styles.tabTextActive]}>
//             Playlist
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.tab, activeTab === "player" && styles.tabActive]}
//           onPress={() => setActiveTab("player")}
//         >
//           <Text style={[styles.tabText, activeTab === "player" && styles.tabTextActive]}>
//             Now Playing
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {activeTab === "list" ? (
//         <>
//           {/* Stats bar */}
//           <View style={styles.statsBar}>
//             <Text style={styles.statsText}>
//               {favoriteFiles.length} songs • {formatTotalDuration(favoriteFiles)}
//             </Text>
//             {/* Play all favorites */}
//             <TouchableOpacity
//               style={styles.playAllBtn}
//               onPress={() => {
//                 if (favoriteFiles.length > 0) {
//                   playFromFavorites(favoriteFiles[0].id);
//                 }
//               }}
//             >
//               <Ionicons name="play-circle" size={18} color="#9b59b6" />
//               <Text style={styles.playAllText}>Play All</Text>
//             </TouchableOpacity>
//           </View>

//           <FlatList
//             data={favoriteFiles}
//             keyExtractor={(item) => item.id}
//             contentContainerStyle={{ paddingBottom: 20 }}
//             renderItem={({ item }) => {
//               const actualIndex = audioFiles.findIndex((f) => f.id === item.id);
//               const isCurrentTrack = actualIndex === currentTrackIndex;
//               const itemProgress =
//                 isCurrentTrack && durationMillis > 0
//                   ? (positionMillis / durationMillis) * 100
//                   : 0;
//               const art = getAlbumArt(item);

//               return (
//                 <TouchableOpacity
//                   style={[styles.trackItem, isCurrentTrack && styles.trackItemActive]}
//                   onPress={() => playFromFavorites(item.id)}
//                 >
//                   {/* Thumbnail - Album art only, no color fallback */}
//                   <Image
//                     source={art || defaultImage}
//                     style={styles.thumbnail}
//                     defaultSource={defaultImage}
//                   />

//                   {/* Info */}
//                   <View style={styles.trackInfo}>
//                     <Text
//                       style={[styles.trackName, isCurrentTrack && styles.trackNameActive]}
//                       numberOfLines={1}
//                     >
//                       {item.filename.replace(/\.[^/.]+$/, "")}
//                     </Text>
//                     <Text style={styles.trackArtist} numberOfLines={1}>
//                       {item.artist || "Unknown Artist"}
//                     </Text>
//                     {isCurrentTrack && (
//                       <View style={styles.progressBar}>
//                         <View style={[styles.progressFill, { width: `${itemProgress}%` }]} />
//                       </View>
//                     )}
//                   </View>

//                   {/* Actions */}
//                   <View style={styles.actions}>
//                     {isCurrentTrack && (
//                       <TouchableOpacity onPress={playPauseHandler}>
//                         <Ionicons
//                           name={isPlaying ? "pause-circle" : "play-circle"}
//                           size={28} color="#9b59b6"
//                         />
//                       </TouchableOpacity>
//                     )}
//                     <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
//                       <MaterialIcons name="favorite" size={22} color="#e74c3c" />
//                     </TouchableOpacity>
//                     <TouchableOpacity onPress={() => shareTrack(item)}>
//                       <Entypo name="share" size={20} color="#999" />
//                     </TouchableOpacity>
//                   </View>
//                 </TouchableOpacity>
//               );
//             }}
//           />
//         </>
//       ) : (
//         /* Mini Player View */
//         <View style={styles.playerContainer}>
//           {!currentIsInFavorites && currentTrack ? (
//             <View style={styles.notFavContainer}>
//               <Ionicons name="musical-notes" size={50} color="#555" />
//               <Text style={styles.notFavText}>
//                 Currently playing song is not in your favourites
//               </Text>
//               <Text style={styles.notFavSub}>
//                 Select a song from the Playlist tab to play a favourite
//               </Text>
//             </View>
//           ) : currentTrack ? (
//             <>
//               {/* Album Art - No color fallback */}
//               <View style={styles.artContainer}>
//                 <Image
//                   source={getAlbumArt(currentTrack) || defaultImage}
//                   style={styles.albumArt}
//                   defaultSource={defaultImage}
//                 />
//               </View>

//               {/* Track name + fav button */}
//               <View style={styles.playerTrackRow}>
//                 <View style={{ flex: 1 }}>
//                   <Text style={styles.playerTrackName} numberOfLines={1}>
//                     {currentTrack.filename.replace(/\.[^/.]+$/, "")}
//                   </Text>
//                   <Text style={styles.playerArtist} numberOfLines={1}>
//                     {currentTrack.artist || "Unknown Artist"}
//                   </Text>
//                 </View>
//                 <TouchableOpacity onPress={() => toggleFavorite()}>
//                   <MaterialIcons name="favorite" size={26} color="#e74c3c" />
//                 </TouchableOpacity>
//               </View>

//               {/* Progress bar */}
//               <View style={styles.fullProgressContainer}>
//                 <View style={[styles.fullProgressFill, { width: `${progress}%` }]} />
//               </View>
//               <View style={styles.timeRow}>
//                 <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
//                 <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
//               </View>

//               {/* Controls */}
//               <View style={styles.controls}>
//                 <TouchableOpacity onPress={toggleShuffle}>
//                   <Ionicons
//                     name="shuffle-outline" size={22}
//                     color={shuffleMode ? "#f808d4" : "rgba(255,255,255,0.6)"}
//                   />
//                 </TouchableOpacity>

//                 <TouchableOpacity onPress={() => playPreviousTrack(favoriteFiles)}>
//                   <AntDesign name="step-backward" size={26} color="white" />
//                 </TouchableOpacity>

//                 <TouchableOpacity onPress={playPauseHandler} disabled={isLoading}>
//                   {isLoading ? (
//                     <ActivityIndicator size="large" color="white" />
//                   ) : (
//                     <Ionicons
//                       name={isPlaying ? "pause-circle" : "play-circle"}
//                       size={70} color="white"
//                     />
//                   )}
//                 </TouchableOpacity>

//                 <TouchableOpacity onPress={() => playNextTrack(favoriteFiles)}>
//                   <AntDesign name="step-forward" size={26} color="white" />
//                 </TouchableOpacity>

//                 <TouchableOpacity onPress={toggleRepeat}>
//                   {getRepeatIcon()}
//                 </TouchableOpacity>
//               </View>
//             </>
//           ) : (
//             <View style={styles.notFavContainer}>
//               <Text style={styles.notFavText}>No track selected</Text>
//             </View>
//           )}
//         </View>
//       )}
//       </ImageBackground>
//     </View>
//   );
// }

// function formatTime(millis) {
//   if (!millis) return "00:00";
//   const totalSeconds = Math.floor(millis / 1000);
//   const minutes = Math.floor(totalSeconds / 60);
//   const seconds = totalSeconds % 60;
//   return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
// }

// function formatTotalDuration(files) {
//   const totalSeconds = files.reduce((acc, file) => acc + (file.duration || 0), 0);
//   const hours = Math.floor(totalSeconds / 3600);
//   const minutes = Math.floor((totalSeconds % 3600) / 60);
//   if (hours > 0) return `${hours} hr ${minutes} min`;
//   return `${minutes} min`;
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#121212" },

//   emptyContainer: {
//     flex: 1, backgroundColor: "#121212",
//     justifyContent: "center", alignItems: "center", padding: 30,
//   },
//   emptyTitle: {
//     color: "white", fontSize: 22, fontWeight: "bold",
//     marginTop: 20, marginBottom: 10,
//   },
//   emptySubtitle: { color: "#888", fontSize: 15, textAlign: "center" },

//   header: {
//     flexDirection: "row", justifyContent: "space-between",
//     alignItems: "center", padding: 20, paddingTop: 50,
//     borderBottomWidth: 1, borderBottomColor: "#222",
//   },
//   headerLeft: { flexDirection: "row", alignItems: "center",  },
//   headerTitle: { color: "white", fontSize: 22, fontWeight: "bold" },
//   headerCount: { color: "#888", fontSize: 14 },

//   tabRow: {
//     flexDirection: "row", margin: 15, backgroundColor: "#1e1e1e",
//     borderRadius: 12, overflow: "hidden",
//   },
//   tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
//   tabActive: { backgroundColor: "#9b59b6" },
//   tabText: { color: "#888", fontWeight: "600" },
//   tabTextActive: { color: "white" },

//   statsBar: {
//     flexDirection: "row", justifyContent: "space-between",
//     alignItems: "center", paddingHorizontal: 15, paddingBottom: 10,
//   },
//   statsText: { color: "#888", fontSize: 13 },
//   playAllBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
//   playAllText: { color: "#9b59b6", fontWeight: "600" },

//   trackItem: {
//     flexDirection: "row", alignItems: "center",
//     paddingHorizontal: 15, paddingVertical: 10,
//     borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
//   },
//   trackItemActive: { backgroundColor: "#1e1e2e" },

//   thumbnail: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },

//   trackInfo: { flex: 1, marginRight: 8 },
//   trackName: { color: "white", fontSize: 14, fontWeight: "500" },
//   trackNameActive: { color: "#9b59b6" },
//   trackArtist: { color: "#888", fontSize: 12, marginTop: 2 },

//   progressBar: {
//     height: 3, backgroundColor: "#333",
//     borderRadius: 2, marginTop: 5, overflow: "hidden",
//   },
//   progressFill: { height: "100%", backgroundColor: "#9b59b6", borderRadius: 2 },

//   actions: { flexDirection: "row", alignItems: "center", gap: 10 },

//   // Player tab styles
//   playerContainer: {
//     flex: 1, paddingHorizontal: 25, paddingTop: 20,
//     alignItems: "center",
//   },
//   notFavContainer: {
//     flex: 1, justifyContent: "center", alignItems: "center", gap: 12,
//   },
//   notFavText: {
//     color: "#888", fontSize: 16, textAlign: "center", fontWeight: "500",
//   },
//   notFavSub: { color: "#555", fontSize: 13, textAlign: "center" },

//   artContainer: { marginVertical: 20 },
//   albumArt: { width: 220, height: 220, borderRadius: 110 },

//   playerTrackRow: {
//     flexDirection: "row", alignItems: "center",
//     width: "100%", marginBottom: 15,
//   },
//   playerTrackName: {
//     color: "white", fontSize: 18, fontWeight: "bold",
//   },
//   playerArtist: { color: "#888", fontSize: 14, marginTop: 3 },

//   fullProgressContainer: {
//     width: "100%", height: 4, backgroundColor: "#333",
//     borderRadius: 2, overflow: "hidden",
//   },
//   fullProgressFill: {
//     height: "100%", backgroundColor: "#9b59b6", borderRadius: 2,
//   },
//   timeRow: {
//     flexDirection: "row", justifyContent: "space-between",
//     width: "100%", marginTop: 6, marginBottom: 20,
//   },
//   timeText: { color: "#888", fontSize: 12 },

//   controls: {
//     flexDirection: "row", alignItems: "center",
//     justifyContent: "space-between", width: "100%",
//   },
// });




import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image,
  ImageBackground, StyleSheet, Share, ActivityIndicator,
} from "react-native";
import { useAudio } from "../context/AudioContext";
import {
  Ionicons, MaterialIcons, Entypo,
  AntDesign, MaterialCommunityIcons,
} from "@expo/vector-icons";
import CustomHeader from "../components/ui/CustomHeader";

export default function FavouriteScreen() {
  const {
    audioFiles, favoriteFiles, currentTrackIndex, isPlaying,
    durationMillis, positionMillis, isLoading, defaultImage,
    playPauseHandler, playNextTrack, playPreviousTrack,
    toggleRepeat, toggleShuffle, repeatMode, shuffleMode,
    toggleFavorite, isFavorite, getAlbumArt,
    setCurrentTrackIndex, setIsPlaying,
  } = useAudio();

  const [activeTab, setActiveTab] = useState("list"); // 'list' | 'player'

  const currentTrack    = audioFiles[currentTrackIndex] ?? null;
  const albumArtSource  = getAlbumArt(currentTrack ?? {});
  const currentIsInFavs = currentTrack ? isFavorite(currentTrack.id) : false;
  const progress        = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

  const playFromFavorites = (trackId) => {
    const indexInAll = audioFiles.findIndex((f) => f.id === trackId);
    if (indexInAll !== -1) {
      setCurrentTrackIndex(indexInAll);
      setIsPlaying(true);
      setActiveTab("player");
    }
  };

  const shareTrack = async (track) => {
    try {
      await Share.share({ message: `Check out this song: ${track.filename}` });
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
        source={albumArtSource}
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
                  const isCurrentTrack = actualIndex === currentTrackIndex;
                  const itemProgress =
                    isCurrentTrack && durationMillis > 0
                      ? (positionMillis / durationMillis) * 100
                      : 0;
                  const art = getAlbumArt(item);

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
                        {item.artist ? (
                          <Text style={styles.trackArtist} numberOfLines={1}>
                            {item.artist}
                          </Text>
                        ) : null}
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
                    <Image
                      source={albumArtSource}
                      style={styles.albumArt}
                      defaultSource={defaultImage}
                    />
                  </View>

                  <View style={styles.playerTrackRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playerTrackName} numberOfLines={1}>
                        {currentTrack.filename.replace(/\.[^/.]+$/, "")}
                      </Text>
                      {currentTrack.artist ? (
                        <Text style={styles.playerArtist} numberOfLines={1}>
                          {currentTrack.artist}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => toggleFavorite()}>
                      <MaterialIcons name="favorite" size={26} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fullProgressContainer}>
                    <View style={[styles.fullProgressFill, { width: `${progress}%` }]} />
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
                    <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
                  </View>

                  <View style={styles.controls}>
                    <TouchableOpacity onPress={toggleShuffle}>
                      <Ionicons
                        name="shuffle-outline"
                        size={22}
                        color={shuffleMode ? "#f808d4" : "rgba(255,255,255,0.6)"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => playPreviousTrack(favoriteFiles)}>
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
                    <TouchableOpacity onPress={() => playNextTrack(favoriteFiles)}>
                      <AntDesign name="step-forward" size={26} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleRepeat}>
                      {getRepeatIcon()}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.notFavContainer}>
                  <Text style={styles.notFavText}>No track selected</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(millis) {
  if (!millis) return "00:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatTotalDuration(files) {
  const totalSeconds = files.reduce((acc, file) => acc + (file.duration || 0), 0);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#121212" },
  backgroundImage: { flex: 1 },
  overlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },

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
  headerLeft:  { flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "bold" },
  headerCount: { color: "#aaa", fontSize: 14 },

  tabRow: {
    flexDirection: "row", margin: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12, overflow: "hidden",
  },
  tab:          { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive:    { backgroundColor: "#9b59b6" },
  tabText:      { color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "white" },

  statsBar: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 15, paddingBottom: 10,
  },
  statsText:   { color: "#aaa", fontSize: 13 },
  playAllBtn:  { flexDirection: "row", alignItems: "center", gap: 5 },
  playAllText: { color: "#9b59b6", fontWeight: "600" },

  trackItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 15, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
  },
  trackItemActive: { backgroundColor: "rgba(155,89,182,0.15)" },

  thumbnail: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: "#1a1a2e" },

  trackInfo:      { flex: 1, marginRight: 8 },
  trackName:      { color: "white", fontSize: 14, fontWeight: "500" },
  trackNameActive: { color: "#9b59b6" },
  trackArtist:    { color: "#888", fontSize: 12, marginTop: 2 },

  progressBar: {
    height: 3, backgroundColor: "#444",
    borderRadius: 2, marginTop: 5, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#9b59b6", borderRadius: 2 },

  actions: { flexDirection: "row", alignItems: "center", gap: 10 },

  playerContainer: {
    flex: 1, paddingHorizontal: 25, paddingTop: 20, alignItems: "center",
  },
  notFavContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", gap: 12,
  },
  notFavText: { color: "#888", fontSize: 16, textAlign: "center", fontWeight: "500" },
  notFavSub:  { color: "#555", fontSize: 13, textAlign: "center" },

  artContainer:    { marginVertical: 20 },
  albumArt:        { width: 220, height: 220, borderRadius: 110, backgroundColor: "#1a1a2e" },

  playerTrackRow: {
    flexDirection: "row", alignItems: "center",
    width: "100%", marginBottom: 15,
  },
  playerTrackName: { color: "white", fontSize: 18, fontWeight: "bold" },
  playerArtist:    { color: "#888", fontSize: 14, marginTop: 3 },

  fullProgressContainer: {
    width: "100%", height: 4, backgroundColor: "#444",
    borderRadius: 2, overflow: "hidden",
  },
  fullProgressFill: { height: "100%", backgroundColor: "#9b59b6", borderRadius: 2 },

  timeRow: {
    flexDirection: "row", justifyContent: "space-between",
    width: "100%", marginTop: 6, marginBottom: 20,
  },
  timeText: { color: "#888", fontSize: 12 },

  controls: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", width: "100%",
  },
});