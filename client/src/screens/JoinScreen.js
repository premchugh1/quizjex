import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, R, GRAD, g } from '../theme';

export default function JoinScreen({ navigation }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function goToAvatar() {
    if (code.trim().length !== 4 || isNaN(code.trim())) {
      setError('Please enter a valid 4-digit room code! 🔑');
      return;
    }
    setError('');
    navigation.navigate('Avatar', { isHost: false, roomCode: code.trim() });
  }

  return (
    <LinearGradient colors={GRAD.bg} style={g.fill}>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={g.back}>
          <Text style={g.backTxt}>← Back</Text>
        </TouchableOpacity>

        <Text style={g.h1}>🎮 Join a Game</Text>
        <Text style={[g.muted, styles.hint]}>Ask the host for their room code! 🔑</Text>

        <Text style={g.label}>Enter Room Code</Text>
        <TextInput
          style={styles.codeInput}
          placeholder="e.g. 7429"
          placeholderTextColor={C.sub}
          value={code}
          onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 4))}
          keyboardType="numeric"
          maxLength={4}
          textAlign="center"
        />

        {error ? <Text style={g.error}>{error}</Text> : null}

        <TouchableOpacity style={[g.btn, { backgroundColor: C.teal }]} onPress={goToAvatar} activeOpacity={0.85}>
          <Text style={g.btnText}>Next: Pick Your Avatar 🧍 →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: S.lg },
  hint:      { marginBottom: S.xl },
  codeInput: {
    backgroundColor: C.card, color: C.white, borderRadius: R.lg, padding: S.lg,
    fontSize: 42, fontWeight: '900', letterSpacing: 12, borderWidth: 2, borderColor: C.purple,
    alignSelf: 'center', width: 220, textAlign: 'center',
  },
});
