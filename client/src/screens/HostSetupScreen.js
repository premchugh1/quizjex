import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ROOM_DECORATIONS } from '../data/gameData';
import { C, F, S, R, GRAD, g } from '../theme';
import socket from '../socket';

export default function HostSetupScreen({ navigation }) {
  const [topic, setTopic] = useState('');
  const [nickname, setNickname] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [leaderboardStyle, setLeaderboardStyle] = useState('each');
  const [selectedDecorations, setSelectedDecorations] = useState([]);
  const [error, setError] = useState('');

  function toggleDecoration(id) {
    setSelectedDecorations((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  function goToAvatar() {
    if (!topic.trim()) { setError('Please enter a quiz topic! 📝'); return; }
    if (!nickname.trim()) { setError('Please enter your nickname! 🎭'); return; }
    setError('');
    // Pass setup params to Avatar screen; actual room creation happens after avatar picked
    navigation.navigate('Avatar', {
      isHost: true,
      setupParams: { topic: topic.trim(), questionCount, leaderboardStyle, decoration: selectedDecorations, nickname: nickname.trim() },
    });
  }

  return (
    <LinearGradient colors={GRAD.bg} style={g.fill}>
      <SafeAreaView style={g.fill}>
        <ScrollView contentContainerStyle={g.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={g.back}>
            <Text style={g.backTxt}>← Back</Text>
          </TouchableOpacity>

          <Text style={g.h1}>👑 Host Setup</Text>
          <Text style={[g.muted, { marginBottom: S.lg }]}>Tell the AI what quiz you want! 🤖</Text>

          <Text style={g.label}>🎯 What's the quiz about?</Text>
          <TextInput
            style={g.input}
            placeholder="e.g. FIFA World Cup, Animals, Space..."
            placeholderTextColor={C.sub}
            value={topic}
            onChangeText={setTopic}
            maxLength={100}
          />

          <Text style={g.label}>🎭 Your nickname</Text>
          <TextInput
            style={g.input}
            placeholder="Pick a fun nickname..."
            placeholderTextColor={C.sub}
            value={nickname}
            onChangeText={setNickname}
            maxLength={20}
          />

          <Text style={g.label}>📝 Number of questions: {questionCount}</Text>
          <View style={styles.row}>
            {[5, 6, 7, 8, 9, 10].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.chip, questionCount === n && styles.chipActive]}
                onPress={() => setQuestionCount(n)}
              >
                <Text style={[styles.chipTxt, questionCount === n && { color: C.white }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={g.label}>📊 Show leaderboard...</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.toggle, leaderboardStyle === 'each' && styles.toggleActive]}
              onPress={() => setLeaderboardStyle('each')}
            >
              <Text style={styles.toggleTxt}>After every question</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggle, leaderboardStyle === 'end' && styles.toggleActive]}
              onPress={() => setLeaderboardStyle('end')}
            >
              <Text style={styles.toggleTxt}>At the end only</Text>
            </TouchableOpacity>
          </View>

          <Text style={g.label}>🏠 Decorate your room!</Text>
          <View style={g.wrap}>
            {ROOM_DECORATIONS.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.chip, styles.chipWide, selectedDecorations.includes(d.id) && styles.chipOrange]}
                onPress={() => toggleDecoration(d.id)}
              >
                <Text style={styles.chipTxt}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={g.error}>{error}</Text> : null}

          <TouchableOpacity style={[g.btn, { backgroundColor: C.orange }]} onPress={goToAvatar} activeOpacity={0.85}>
            <Text style={g.btnText}>Next: Pick Your Avatar 🧍 →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  row:         { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip:        { width: 48, height: 48, borderRadius: R.md, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  chipActive:  { backgroundColor: C.purple, borderColor: C.purpleL },
  chipWide:    { width: 'auto', paddingHorizontal: 14, height: 'auto', paddingVertical: 10 },
  chipOrange:  { backgroundColor: C.orange, borderColor: '#FB923C' },
  chipTxt:     { color: C.sub, fontWeight: '700', fontSize: F.md },
  toggle:      { flex: 1, padding: 12, borderRadius: R.md, backgroundColor: C.card, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  toggleActive:{ backgroundColor: C.purple, borderColor: C.purpleL },
  toggleTxt:   { color: C.white, fontWeight: '600', fontSize: F.sm, textAlign: 'center' },
});
