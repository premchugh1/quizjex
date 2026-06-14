import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, S, R, GRAD, g } from '../theme';
import socket from '../socket';

const OPT_COLORS = [C.optA, C.optB, C.optC, C.optD];
const OPT_LABELS = ['A', 'B', 'C', 'D'];

export default function GameScreen({ navigation, route }) {
  const { isHost, roomCode, nickname, avatar } = route.params;

  const [phase, setPhase] = useState('waiting'); // waiting | question | feedback | leaderboard
  const [question, setQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null); // { isCorrect, correctAnswer, explanation }
  const [leaderboard, setLeaderboard] = useState([]);
  const [isFinalLeaderboard, setIsFinalLeaderboard] = useState(false);

  const bounceAnim = useRef(new Animated.Value(0)).current;

  function playBounce() {
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 0, friction: 3, useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => {
    socket.on('newQuestion', ({ questionIndex: qi, totalQuestions: tq, question: q, options }) => {
      setQuestion({ text: q, options });
      setQuestionIndex(qi);
      setTotalQuestions(tq);
      setSelectedAnswer(null);
      setFeedback(null);
      setPhase('question');
    });

    socket.on('answerFeedback', (data) => {
      setFeedback(data);
      setPhase('feedback');
      playBounce();
    });

    socket.on('revealAnswer', ({ correctAnswer, explanation, scores }) => {
      setLeaderboard(scores);
    });

    socket.on('showLeaderboard', ({ players, isFinal, nextQuestionIndex }) => {
      setLeaderboard(players);
      setIsFinalLeaderboard(isFinal);
      setPhase('leaderboard');
    });

    socket.on('gameEnded', ({ players, totalQuestions: tq }) => {
      navigation.replace('End', { players, totalQuestions: tq, nickname, avatar });
    });

    return () => {
      socket.off('newQuestion');
      socket.off('answerFeedback');
      socket.off('revealAnswer');
      socket.off('showLeaderboard');
      socket.off('gameEnded');
    };
  }, []);

  function submitAnswer(answer) {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    socket.emit('submitAnswer', { code: roomCode, answer });
  }

  // ── QUESTION PHASE ──────────────────────────────────────────────────────────
  if (phase === 'question' && question) {
    return (
      <LinearGradient colors={GRAD.bg} style={g.fill}>
        <SafeAreaView style={styles.screen}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((questionIndex + 1) / totalQuestions) * 100}%` }]} />
          </View>
          <Text style={[g.muted, { textAlign: 'right', marginBottom: S.md }]}>
            Question {questionIndex + 1} / {totalQuestions}
          </Text>

          <View style={[g.card, styles.questionBox]}>
            <Text style={styles.questionTxt}>{question.text}</Text>
          </View>

          <View style={styles.optionsGrid}>
            {question.options.map((opt, i) => {
              const letter = OPT_LABELS[i];
              const isSelected = selectedAnswer === letter;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.optBtn,
                    { backgroundColor: OPT_COLORS[i] },
                    isSelected && styles.optSelected,
                    selectedAnswer && !isSelected && styles.optDimmed,
                  ]}
                  onPress={() => submitAnswer(letter)}
                  disabled={!!selectedAnswer}
                  activeOpacity={0.82}
                >
                  <View style={styles.optLetterBadge}>
                    <Text style={styles.optLetter}>{letter}</Text>
                  </View>
                  <Text style={styles.optTxt} numberOfLines={3}>{opt.replace(/^[A-D]\.\s?/, '')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedAnswer && !feedback && (
            <Text style={[g.muted, { textAlign: 'center', marginTop: S.md }]}>⏳ Waiting for others...</Text>
          )}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── FEEDBACK PHASE ──────────────────────────────────────────────────────────
  if (phase === 'feedback' && feedback) {
    return (
      <LinearGradient colors={feedback.isCorrect ? GRAD.correct : GRAD.wrong} style={g.fill}>
        <SafeAreaView style={g.center}>
          <Animated.Text style={[styles.reactionEmoji, { transform: [{ translateY: bounceAnim }] }]}>
            {feedback.isCorrect ? '🕺' : '💩'}
          </Animated.Text>
          <Text style={[g.h2, { textAlign: 'center', marginBottom: S.sm }]}>
            {feedback.isCorrect ? '🎉 Correct! +1 point!' : '😂 Wrong answer!'}
          </Text>
          <Text style={[g.muted, { textAlign: 'center', paddingHorizontal: S.lg, marginBottom: S.md }]}>
            {feedback.explanation}
          </Text>
          <Text style={[g.muted, { marginBottom: S.xl }]}>
            Correct answer:{' '}
            <Text style={{ color: C.white, fontWeight: '900', fontSize: F.lg }}>{feedback.correctAnswer}</Text>
          </Text>
          {isHost && (
            <TouchableOpacity
              style={[g.btn, { backgroundColor: C.orange, paddingHorizontal: S.xl }]}
              onPress={() => socket.emit('nextQuestion', { code: roomCode })}
              activeOpacity={0.85}
            >
              <Text style={g.btnText}>Next Question →</Text>
            </TouchableOpacity>
          )}
          {!isHost && <Text style={[g.muted, { textAlign: 'center' }]}>⏳ Waiting for host...</Text>}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── LEADERBOARD PHASE ───────────────────────────────────────────────────────
  if (phase === 'leaderboard') {
    const medals = ['🥇', '🥈', '🥉'];
    return (
      <LinearGradient colors={GRAD.bg} style={g.fill}>
        <SafeAreaView style={g.fill}>
          <ScrollView contentContainerStyle={g.scroll}>
            <Text style={[g.h1, { textAlign: 'center', marginBottom: S.lg }]}>📊 Leaderboard</Text>
            {leaderboard.map((p, i) => (
              <View key={i} style={[g.card, styles.leaderRow, i === 0 && styles.leaderFirst]}>
                <Text style={styles.leaderRank}>{medals[i] || `${i + 1}.`}</Text>
                <Text style={styles.leaderAvatar}>{p.avatar}</Text>
                <Text style={[g.h3, { flex: 1 }]}>{p.nickname}</Text>
                <Text style={styles.leaderScore}>{p.score} pt{p.score !== 1 ? 's' : ''}</Text>
              </View>
            ))}
            {isHost && (
              <TouchableOpacity
                style={[g.btn, { backgroundColor: C.orange }]}
                onPress={() => socket.emit('continueGame', { code: roomCode })}
                activeOpacity={0.85}
              >
                <Text style={g.btnText}>▶ Continue</Text>
              </TouchableOpacity>
            )}
            {!isHost && <Text style={[g.muted, { textAlign: 'center', marginTop: S.lg }]}>⏳ Waiting for host...</Text>}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── WAITING ─────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={GRAD.bg} style={g.center}>
      <Text style={styles.reactionEmoji}>🎮</Text>
      <Text style={g.h2}>Game starting...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen:         { flex: 1, padding: S.md },
  progressBar:    { height: 10, backgroundColor: C.card, borderRadius: R.full, marginBottom: S.xs },
  progressFill:   { height: 10, backgroundColor: C.purple, borderRadius: R.full },
  questionBox:    { marginBottom: S.lg, paddingVertical: S.lg, justifyContent: 'center' },
  questionTxt:    { color: C.white, fontSize: F.xl, fontWeight: '800', textAlign: 'center', lineHeight: 34 },
  optionsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: S.md },
  optBtn:         { width: '48%', minHeight: 110, borderRadius: R.lg, padding: S.md, justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
  optLetterBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  optSelected:    { borderWidth: 4, borderColor: C.white },
  optDimmed:      { opacity: 0.35 },
  optLetter:      { fontSize: F.sm, fontWeight: '900', color: C.white },
  optTxt:         { color: C.white, fontSize: F.md, fontWeight: '800', lineHeight: 22, marginTop: S.xs },
  reactionEmoji:{ fontSize: 100, marginBottom: S.md },
  leaderRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: S.sm, gap: S.sm },
  leaderFirst:  { backgroundColor: '#3d2b00', borderColor: C.orange },
  leaderRank:   { fontSize: F.xl, width: 36 },
  leaderAvatar: { fontSize: 28 },
  leaderScore:  { color: C.gold, fontWeight: '900', fontSize: F.lg },
});
