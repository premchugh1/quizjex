import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ROOM_DECORATIONS } from '../data/gameData';
import { C, F, S, R, GRAD, g } from '../theme';

const STEPS = 5;

export default function HostSetupScreen({ navigation }) {
  const [step, setStep]                         = useState(1);
  const [topic, setTopic]                       = useState('');
  const [nickname, setNickname]                 = useState('');
  const [questionCount, setQuestionCount]       = useState(10);
  const [leaderboardStyle, setLeaderboardStyle] = useState('each');
  const [selectedDecorations, setSelectedDecorations] = useState([]);
  const [error, setError]                       = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;

  function animateNext() {
    slideAnim.setValue(40);
    Animated.spring(slideAnim, { toValue: 0, tension: 120, friction: 10, useNativeDriver: true }).start();
  }

  function goBack() {
    if (step === 1) { navigation.goBack(); return; }
    setError('');
    animateNext();
    setStep(step - 1);
  }

  function goNext() {
    setError('');
    if (step === 1 && !topic.trim()) { setError('What should the quiz be about? 🤔'); return; }
    if (step === 2 && !nickname.trim()) { setError('Enter your nickname first! 🎭'); return; }
    if (step < STEPS) { animateNext(); setStep(step + 1); return; }
    // Step 5 → go to avatar
    navigation.navigate('Avatar', {
      isHost: true,
      setupParams: {
        topic: topic.trim(),
        questionCount,
        leaderboardStyle,
        decoration: selectedDecorations,
        nickname: nickname.trim(),
      },
    });
  }

  function toggleDecoration(id) {
    setSelectedDecorations((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  const progress = step / STEPS;

  return (
    <LinearGradient colors={GRAD.bg} style={g.fill}>
      <SafeAreaView style={styles.root}>

        {/* ── Header bar ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepCount}>Step {step} of {STEPS}</Text>
          <TouchableOpacity onPress={() => navigation.replace('Home')} style={styles.homeBtn}>
            <Text style={styles.homeTxt}>🏠</Text>
          </TouchableOpacity>
        </View>

        {/* ── Progress bar ── */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {/* ── Step content ── */}
        <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>

          {step === 1 && (
            <>
              <Text style={styles.stepEmoji}>🎯</Text>
              <Text style={styles.stepQuestion}>What's the quiz about?</Text>
              <Text style={styles.stepHint}>e.g. FIFA World Cup, Animals, Space, Harry Potter…</Text>
              <TextInput
                style={styles.bigInput}
                placeholder="Type your topic here..."
                placeholderTextColor={C.sub}
                value={topic}
                onChangeText={setTopic}
                maxLength={80}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={goNext}
              />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.stepEmoji}>🎭</Text>
              <Text style={styles.stepQuestion}>What's your name?</Text>
              <Text style={styles.stepHint}>This is what other players will see</Text>
              <TextInput
                style={styles.bigInput}
                placeholder="Your nickname..."
                placeholderTextColor={C.sub}
                value={nickname}
                onChangeText={setNickname}
                maxLength={20}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={goNext}
              />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.stepEmoji}>📝</Text>
              <Text style={styles.stepQuestion}>How many questions?</Text>
              <Text style={styles.stepHint}>More questions = longer game!</Text>
              <View style={styles.chipRow}>
                {[5, 6, 7, 8, 9, 10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.numChip, questionCount === n && styles.numChipActive]}
                    onPress={() => setQuestionCount(n)}
                  >
                    <Text style={[styles.numChipTxt, questionCount === n && styles.numChipTxtActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 4 && (
            <>
              <Text style={styles.stepEmoji}>📊</Text>
              <Text style={styles.stepQuestion}>When do you see scores?</Text>
              <Text style={styles.stepHint}>Pick what works for your group</Text>
              <TouchableOpacity
                style={[styles.optionCard, leaderboardStyle === 'each' && styles.optionCardActive]}
                onPress={() => setLeaderboardStyle('each')}
              >
                <Text style={styles.optionEmoji}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>After every question</Text>
                  <Text style={styles.optionSub}>Keeps everyone on their toes!</Text>
                </View>
                {leaderboardStyle === 'each' && <Text style={styles.optionCheck}>✅</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionCard, leaderboardStyle === 'end' && styles.optionCardActive]}
                onPress={() => setLeaderboardStyle('end')}
              >
                <Text style={styles.optionEmoji}>🏆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Only at the end</Text>
                  <Text style={styles.optionSub}>Big reveal at the finish!</Text>
                </View>
                {leaderboardStyle === 'end' && <Text style={styles.optionCheck}>✅</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 5 && (
            <>
              <Text style={styles.stepEmoji}>🎨</Text>
              <Text style={styles.stepQuestion}>Decorate your room!</Text>
              <Text style={styles.stepHint}>Optional — pick as many as you like</Text>
              <View style={styles.decorGrid}>
                {ROOM_DECORATIONS.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.decorChip, selectedDecorations.includes(d.id) && styles.decorChipActive]}
                    onPress={() => toggleDecoration(d.id)}
                  >
                    <Text style={styles.decorTxt}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {error ? <Text style={[g.error, { marginTop: S.md }]}>{error}</Text> : null}
        </Animated.View>

        {/* ── Bottom CTA ── */}
        <View style={styles.footer}>
          {step === 5 && selectedDecorations.length === 0 && (
            <TouchableOpacity onPress={goNext} style={styles.skipBtn}>
              <Text style={styles.skipTxt}>Skip decorations →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
            <Text style={styles.nextTxt}>
              {step === STEPS ? '🧍 Pick Your Avatar →' : 'Continue →'}
            </Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, alignItems: 'center' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, width: '100%', maxWidth: 560 },
  backBtn:          { padding: S.xs },
  backTxt:          { color: C.sub, fontSize: F.md, fontWeight: '700' },
  stepCount:        { color: C.sub, fontSize: F.sm, fontWeight: '700' },
  homeBtn:          { padding: S.xs },
  homeTxt:          { fontSize: F.lg },

  progressTrack:    { height: 6, backgroundColor: C.card, marginHorizontal: S.lg, borderRadius: R.full, marginBottom: S.xl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  progressFill:     { height: 6, backgroundColor: C.purple, borderRadius: R.full },

  content:          { flex: 1, paddingHorizontal: S.lg, paddingTop: S.sm, width: '100%', maxWidth: 560, alignSelf: 'center' },
  stepEmoji:        { fontSize: 64, textAlign: 'center', marginBottom: S.md },
  stepQuestion:     { fontSize: 32, fontWeight: '900', color: C.white, textAlign: 'center', marginBottom: S.sm, lineHeight: 40 },
  stepHint:         { fontSize: F.md, color: C.sub, textAlign: 'center', marginBottom: S.xl },
  bigInput:         { backgroundColor: C.card, color: C.white, borderRadius: R.lg, padding: S.lg, fontSize: F.xl, fontWeight: '700', borderWidth: 2, borderColor: C.purple, textAlign: 'center' },

  chipRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  numChip:          { width: 72, height: 72, borderRadius: R.lg, backgroundColor: C.card, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  numChipActive:    { backgroundColor: C.purple, borderColor: C.purpleL },
  numChipTxt:       { fontSize: F.xl, fontWeight: '900', color: C.sub },
  numChipTxtActive: { color: C.white },

  optionCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.lg, borderWidth: 2, borderColor: C.border, padding: S.md, marginBottom: S.md, gap: S.md },
  optionCardActive: { borderColor: C.purple, backgroundColor: '#1e1060' },
  optionEmoji:      { fontSize: 32 },
  optionTitle:      { color: C.white, fontSize: F.lg, fontWeight: '800' },
  optionSub:        { color: C.sub, fontSize: F.sm, marginTop: 2 },
  optionCheck:      { fontSize: F.lg },

  decorGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  decorChip:        { paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: C.card, borderRadius: R.full, borderWidth: 2, borderColor: C.border },
  decorChipActive:  { backgroundColor: C.orange, borderColor: C.orange },
  decorTxt:         { color: C.white, fontSize: F.sm, fontWeight: '700' },

  footer:           { padding: S.lg, paddingBottom: S.xl, gap: S.sm, width: '100%', maxWidth: 560, alignSelf: 'center' },
  skipBtn:          { alignItems: 'center', paddingVertical: S.sm },
  skipTxt:          { color: C.sub, fontSize: F.md, fontWeight: '700' },
  nextBtn:          { backgroundColor: C.orange, borderRadius: R.full, paddingVertical: 20, alignItems: 'center' },
  nextTxt:          { color: C.white, fontSize: F.xl, fontWeight: '900' },
});
