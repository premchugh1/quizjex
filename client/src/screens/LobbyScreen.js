import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ROOM_DECORATIONS } from '../data/gameData';
import { C, F, S, R, GRAD, g } from '../theme';
import socket from '../socket';

export default function LobbyScreen({ navigation, route }) {
  const { isHost, roomCode, nickname, avatar, decoration = [] } = route.params;
  const [players, setPlayers] = useState(route.params.players || []);
  const [topic, setTopic] = useState(route.params.topic || '');
  const [hostLeft, setHostLeft] = useState(false);
  const [activity, setActivity] = useState([]);      // recent join messages
  const activityFadeAnim = useRef(new Animated.Value(0)).current;
  const activityTimer = useRef(null);

  function showActivity(msg) {
    setActivity((prev) => [{ msg, id: Date.now() }, ...prev].slice(0, 4));
    Animated.sequence([
      Animated.timing(activityFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(activityFadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }

  const decorItems = ROOM_DECORATIONS.filter((d) => decoration.includes(d.id));

  useEffect(() => {
    socket.on('lobbyUpdate', ({ players: p }) => setPlayers(p));
    socket.on('gameStarted', () => {
      navigation.replace('Game', { isHost, roomCode, nickname, avatar });
    });
    socket.on('hostLeft', ({ message }) => setHostLeft(message));
    socket.on('backToLobby', ({ players: p }) => setPlayers(p));
    socket.on('playerJoined', ({ nickname: n, avatar: a, totalPlayers }) => {
      const joinMsgs = [
        `${a} ${n} just joined the party! 🎉`,
        `${a} ${n} is ready to play! 🙌`,
        `${a} ${n} jumped in! 🎮`,
        `${a} ${n} is here! Let's go! 🚀`,
      ];
      const msg = joinMsgs[Math.floor(Math.random() * joinMsgs.length)];
      showActivity(msg);
    });
    return () => {
      socket.off('lobbyUpdate');
      socket.off('gameStarted');
      socket.off('hostLeft');
      socket.off('backToLobby');
      socket.off('playerJoined');
    };
  }, []);

  function startGame() {
    socket.emit('startGame', { code: roomCode });
  }

  if (hostLeft) {
    return (
      <LinearGradient colors={GRAD.bg} style={g.center}>
        <Text style={styles.bigEmoji}>😢</Text>
        <Text style={[g.h2, { textAlign: 'center', marginBottom: S.xl }]}>{hostLeft}</Text>
        <TouchableOpacity
          style={[g.btn, { backgroundColor: C.purple, paddingHorizontal: S.xl }]}
          onPress={() => { socket.disconnect(); navigation.replace('Home'); }}
        >
          <Text style={g.btnText}>🏠 Go Home</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRAD.bg} style={g.fill}>
      <SafeAreaView style={g.fill}>
        <ScrollView contentContainerStyle={g.scroll}>
          {/* Room code banner */}
          <View style={[g.card, styles.codeBanner]}>
            <Text style={styles.codeLabel}>🔑 Your Game Code</Text>
            <Text style={styles.codeText}>{roomCode}</Text>
          </View>

          {/* Kid-friendly step-by-step join instructions */}
          <View style={[g.card, styles.stepsCard]}>
            <Text style={styles.stepsTitle}>👋 Tell your friends to...</Text>
            <View style={styles.step}>
              <Text style={styles.stepNum}>1</Text>
              <Text style={styles.stepTxt}>Open <Text style={styles.stepBold}>localhost:8081</Text> on their device</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNum}>2</Text>
              <Text style={styles.stepTxt}>Tap <Text style={styles.stepBold}>🎮 Join a Game</Text></Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNum}>3</Text>
              <Text style={styles.stepTxt}>Type the code <Text style={styles.stepBold}>{roomCode}</Text></Text>
            </View>
          </View>

          {topic ? (
            <View style={[g.card, { marginBottom: S.md, alignItems: 'center' }]}>
              <Text style={g.h3}>📚 {topic}</Text>
            </View>
          ) : null}

          {decorItems.length > 0 && (
            <View style={[g.wrap, { marginBottom: S.md }]}>
              {decorItems.map((d) => (
                <Text key={d.id} style={styles.decorItem}>{d.label}</Text>
              ))}
            </View>
          )}

          {/* Activity feed — recent join toasts */}
          {activity.length > 0 && (
            <Animated.View style={[styles.activityFeed, { opacity: activityFadeAnim }]}>
              {activity.slice(0, 3).map((a) => (
                <Text key={a.id} style={styles.activityMsg}>{a.msg}</Text>
              ))}
            </Animated.View>
          )}

          <Text style={[g.h3, { marginBottom: S.sm }]}>👥 Who's here? ({players.length})</Text>
          {players.length === 0 && (
            <Text style={[g.muted, { textAlign: 'center', marginBottom: S.lg }]}>Nobody here yet... waiting for friends! 👀</Text>
          )}

          <View style={g.wrap}>
            {players.map((p) => (
              <View key={p.id} style={[g.card, styles.playerCard, p.isHost && styles.hostCard]}>
                <Text style={styles.playerAvatar}>{p.avatar}</Text>
                <Text style={styles.playerName}>{p.nickname}</Text>
                {p.isHost && <Text style={[g.muted, { color: C.purpleL, fontSize: F.xs }]}>👑 Host</Text>}
              </View>
            ))}
          </View>

          {isHost && (
            <TouchableOpacity
              style={[g.btn, { backgroundColor: players.length < 1 ? C.border : C.orange, opacity: players.length < 1 ? 0.5 : 1 }]}
              onPress={startGame}
              disabled={players.length < 1}
              activeOpacity={0.85}
            >
              <Text style={g.btnText}>
                {players.length < 1 ? '⏳ Waiting for players...' : '🚀 Everyone\'s in — Start!'}
              </Text>
            </TouchableOpacity>
          )}

          {!isHost && (
            <View style={[g.card, styles.waitingCard]}>
              <Text style={{ fontSize: 44 }}>
                {players.length >= 4 ? '🔥' : players.length >= 3 ? '😎' : players.length >= 2 ? '👀' : '⏳'}
              </Text>
              <Text style={[g.h3, { textAlign: 'center' }]}>You're in!</Text>
              <Text style={[g.muted, { textAlign: 'center' }]}>
                {players.length >= 4
                  ? `${players.length} players ready — this is gonna be epic!`
                  : players.length >= 3
                  ? `${players.length} players here — getting spicy 🌶️`
                  : players.length >= 2
                  ? 'More friends are joining...'
                  : 'Waiting for the host to start...'}
              </Text>
              {players.length > 1 && (
                <View style={styles.playerPips}>
                  {players.map((p) => (
                    <Text key={p.id} style={styles.pip}>{p.avatar}</Text>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.leaveBtn}
                onPress={() => { socket.disconnect(); navigation.replace('Home'); }}
              >
                <Text style={styles.leaveTxt}>🚪 Leave game</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  codeBanner:   { alignItems: 'center', marginBottom: S.md, padding: S.lg, borderColor: C.purple, borderWidth: 2 },
  codeLabel:    { color: C.purpleL, fontWeight: '800', fontSize: F.md, marginBottom: S.xs },
  codeText:     { fontSize: 64, fontWeight: '900', color: C.white, letterSpacing: 12 },
  stepsCard:    { marginBottom: S.md, gap: S.sm },
  stepsTitle:   { color: C.white, fontWeight: '800', fontSize: F.md, marginBottom: S.xs },
  step:         { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  stepNum:      { width: 28, height: 28, borderRadius: R.full, backgroundColor: C.purple, color: C.white, fontWeight: '900', fontSize: F.sm, textAlign: 'center', lineHeight: 28 },
  stepTxt:      { color: C.sub, fontSize: F.sm, flex: 1 },
  stepBold:     { color: C.white, fontWeight: '800' },
  decorItem:    { backgroundColor: C.card, padding: S.sm, borderRadius: R.sm, fontSize: F.md },
  playerCard:   { width: '47%', alignItems: 'center' },
  hostCard:     { borderColor: C.purpleL, borderWidth: 2 },
  playerAvatar: { fontSize: 36, marginBottom: S.xs },
  playerName:   { color: C.white, fontWeight: '700', fontSize: F.sm, textAlign: 'center' },
  bigEmoji:     { fontSize: 72, marginBottom: S.lg },
  activityFeed: { backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: R.md, borderWidth: 1, borderColor: C.purple, padding: S.sm, marginBottom: S.md, gap: S.xs },
  activityMsg:  { color: C.purpleL, fontSize: F.sm, fontWeight: '700', textAlign: 'center' },
  waitingCard:  { marginTop: S.lg, alignItems: 'center', gap: S.sm },
  playerPips:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: S.xs, marginTop: S.xs },
  pip:          { fontSize: 28 },
  leaveBtn:     { marginTop: S.md, paddingVertical: S.sm, paddingHorizontal: S.lg, borderRadius: R.full, borderWidth: 1, borderColor: C.border },
  leaveTxt:     { color: C.sub, fontSize: F.sm, fontWeight: '700' },
});
