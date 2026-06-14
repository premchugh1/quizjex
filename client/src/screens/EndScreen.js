import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, R, GRAD, g } from '../theme';
import socket from '../socket';

export default function EndScreen({ navigation, route }) {
  const { players = [], totalQuestions = 0, nickname, avatar } = route.params;
  const top3     = players.slice(0, 3);
  const rest     = players.slice(3);
  const isHost   = socket.data?.isHost ?? false;
  const roomCode = socket.data?.roomCode;
  const podiumHeights = [110, 80, 60];
  const podiumColors  = [C.gold, C.sub, '#B45309'];
  const medals        = ['🥇', '🥈', '🥉'];

  function playAgain() {
    socket.emit('playAgain', { code: roomCode });
    navigation.replace('Lobby', { isHost, roomCode, nickname, avatar, players });
  }

  function goHome() {
    socket.disconnect();
    navigation.replace('Home');
  }

  return (
    <LinearGradient colors={GRAD.bg} style={g.fill}>
      <SafeAreaView style={g.fill}>
        <ScrollView contentContainerStyle={[g.scroll, { alignItems: 'center' }]}>
          <Text style={[g.h1, { textAlign: 'center' }]}>🏆 Game Over!</Text>
          <Text style={[g.muted, { marginBottom: S.xl }]}>Total Questions: {totalQuestions} ⭐</Text>

          <View style={styles.podium}>
            {[1, 0, 2].map((pos) => top3[pos] && (
              <View key={pos} style={styles.podiumSlot}>
                <Text style={styles.podiumAvatar}>{top3[pos].avatar}</Text>
                <Text style={styles.podiumMedal}>{medals[pos]}</Text>
                <Text style={styles.podiumName}>{top3[pos].nickname}</Text>
                <View style={[styles.podiumBlock, { height: podiumHeights[pos], backgroundColor: podiumColors[pos] }]}>
                  <Text style={styles.podiumScore}>{top3[pos].score}pts</Text>
                </View>
              </View>
            ))}
          </View>

          {rest.length > 0 && (
            <>
              <Text style={[g.h3, { alignSelf: 'flex-start', marginBottom: S.sm }]}>Other players</Text>
              {rest.map((p, i) => (
                <View key={i} style={[g.card, styles.restRow]}>
                  <Text style={[g.muted, { width: 28 }]}>{i + 4}.</Text>
                  <Text style={styles.restAvatar}>{p.avatar}</Text>
                  <Text style={[g.h3, { flex: 1 }]}>{p.nickname}</Text>
                  <Text style={styles.restScore}>{p.score}pts</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.btnRow}>
            {isHost && (
              <TouchableOpacity style={[g.btn, { flex: 1, backgroundColor: C.purple }]} onPress={playAgain} activeOpacity={0.85}>
                <Text style={g.btnText}>🔄 Play Again</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[g.btn, { flex: 1, backgroundColor: C.orange }]} onPress={goHome} activeOpacity={0.85}>
              <Text style={g.btnText}>🏠 Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  podium:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: S.sm, marginBottom: S.xl },
  podiumSlot:   { alignItems: 'center', width: 100 },
  podiumAvatar: { fontSize: 36, marginBottom: S.xs },
  podiumMedal:  { fontSize: 28, marginBottom: 2 },
  podiumName:   { color: C.white, fontWeight: '800', fontSize: F.sm, textAlign: 'center', marginBottom: S.sm },
  podiumBlock:  { width: '100%', borderRadius: R.sm, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: S.sm },
  podiumScore:  { color: C.white, fontWeight: '900', fontSize: F.md },
  restRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: S.sm, width: '100%', gap: S.sm },
  restAvatar:   { fontSize: 24 },
  restScore:    { color: C.gold, fontWeight: '900', fontSize: F.lg },
  btnRow:       { flexDirection: 'row', gap: S.md, marginTop: S.xl, width: '100%' },
});
