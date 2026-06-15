import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, GRAD, g } from '../theme';

export default function HomeScreen({ navigation }) {
  return (
    <LinearGradient colors={GRAD.bg} style={styles.root}>
      <Text style={styles.logo}>🎮</Text>
      <Text style={styles.title}>QuizJex</Text>
      <Text style={[g.muted, styles.sub]}>The ultimate kids quiz game! 🌈</Text>
      <Text style={styles.credit}>Made by Reyaan 💛 to play with Goraansh</Text>

      <TouchableOpacity
        style={[g.btn, styles.btn, { backgroundColor: C.orange }]}
        onPress={() => navigation.navigate('HostSetup')}
        activeOpacity={0.85}
      >
        <Text style={g.btnText}>👑 Host a Game</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[g.btn, styles.btn, { backgroundColor: C.teal }]}
        onPress={() => navigation.navigate('Join')}
        activeOpacity={0.85}
      >
        <Text style={g.btnText}>🎮 Join a Game</Text>
      </TouchableOpacity>

      <Text style={styles.tagline}>Powered by AI 🤖 · Play anywhere! 🌍</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.lg },
  logo:    { fontSize: F.huge, marginBottom: S.sm },
  title:   { fontSize: 60, fontWeight: '900', color: C.white, letterSpacing: 2, marginBottom: S.xs },
  sub:     { fontSize: F.md, marginBottom: S.xs },
  credit:  { fontSize: F.sm, color: C.purpleL, fontWeight: '700', marginBottom: S.xl, textAlign: 'center' },
  btn:     { width: '100%', maxWidth: 400, marginTop: S.md },
  tagline: { position: 'absolute', bottom: 32, fontSize: F.xs, color: C.sub, textAlign: 'center' },
});
