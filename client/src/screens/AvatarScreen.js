import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPORTS, OUTFIT_CATEGORIES, ONESIE_OPTIONS } from '../data/gameData';
import { C, F, S, R, GRAD, g } from '../theme';
import socket from '../socket';

const SKIN_TONES = ['🧑', '🧑🏻', '🧑🏼', '🧑🏽', '🧑🏾', '🧑🏿'];

export default function AvatarScreen({ navigation, route }) {
  const { isHost, setupParams, roomCode } = route.params;

  // For host the nickname comes from setupParams; joiner types it on step 1
  const [nickname, setNickname]           = useState(setupParams?.nickname || '');
  const [skin, setSkin]                   = useState('🧑');
  const [outfitCategory, setOutfitCategory] = useState(null);
  const [selectedSport, setSelectedSport] = useState(null);
  const [selectedNation, setSelectedNation] = useState(null);
  const [selectedOnesie, setSelectedOnesie] = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  // Hosts skip the nickname step → start at step 1 (skin)
  // Joiners start at step 0 (nickname)
  const firstStep = isHost ? 1 : 0;
  const [step, setStep] = useState(firstStep);

  // Steps: 0=nickname(join only) 1=skin 2=outfit 3=sub-choice 4=confirm
  // step 3 only shown when outfit needs sub-selection (sports/onesie)
  const needsSub = outfitCategory === 'sports' || outfitCategory === 'onesie';
  const totalSteps = isHost
    ? (needsSub ? 4 : 3)   // skin, outfit, [sub], confirm
    : (needsSub ? 5 : 4);  // nickname, skin, outfit, [sub], confirm

  const slideAnim = useRef(new Animated.Value(0)).current;
  function animNext() {
    slideAnim.setValue(30);
    Animated.spring(slideAnim, { toValue: 0, tension: 140, friction: 10, useNativeDriver: true }).start();
  }

  function getAvatarSummary() {
    if (!outfitCategory) return skin;
    if (outfitCategory === 'sports' && selectedNation) return `${selectedNation.flag} ${skin}`;
    if (outfitCategory === 'onesie' && selectedOnesie) return `${selectedOnesie.emoji}`;
    const map = { superhero: '🦸', crown: '👑', glasses: '🕶️', space: '🚀', clown: '🤡', princess: '👸' };
    return map[outfitCategory] ? `${map[outfitCategory]} ${skin}` : skin;
  }

  useEffect(() => {
    socket.connect();
    socket.on('roomCreated', ({ code }) => {
      setLoading(false);
      navigation.replace('Lobby', { isHost: true, roomCode: code, nickname: setupParams.nickname, avatar: getAvatarSummary() });
    });
    socket.on('joinSuccess', ({ code, players, decoration, topic }) => {
      setLoading(false);
      navigation.replace('Lobby', { isHost: false, roomCode: code, nickname, avatar: getAvatarSummary(), players, decoration, topic });
    });
    socket.on('joinError',   ({ message }) => { setLoading(false); setError(message); });
    socket.on('serverError', ({ message }) => { setLoading(false); setError(message); });
    return () => {
      socket.off('roomCreated'); socket.off('joinSuccess');
      socket.off('joinError');   socket.off('serverError');
    };
  }, [skin, outfitCategory, selectedNation, selectedOnesie]);

  function goBack() {
    if (step <= firstStep) { navigation.goBack(); return; }
    setError('');
    animNext();
    setStep(step - 1);
  }

  function goNext() {
    setError('');
    // Validate current step
    if (step === 0 && !nickname.trim()) { setError('Enter your nickname first! 🎭'); return; }
    if (step === 2 && !outfitCategory)  { setError('Pick an outfit! 👕'); return; }
    if (step === 3 && outfitCategory === 'sports' && !selectedNation)  { setError('Pick your country! 🌍'); return; }
    if (step === 3 && outfitCategory === 'onesie' && !selectedOnesie)  { setError('Pick your onesie! 🦁'); return; }

    // Figure out what the "last" step index is before confirm
    const lastContentStep = isHost
      ? (needsSub ? 3 : 2)
      : (needsSub ? 4 : 3);

    // Skip step 3 (sub-choice) if outfit doesn't need it, jumping straight to confirm
    const nextStep = step === 2 && !needsSub ? lastContentStep + 1 : step + 1;

    if (nextStep > lastContentStep) {
      // Proceed/confirm
      setLoading(true);
      const avatar = getAvatarSummary();
      if (isHost) {
        socket.emit('createRoom', { ...setupParams, avatar });
      } else {
        socket.emit('joinRoom', { code: roomCode, nickname: nickname.trim(), avatar });
      }
      return;
    }
    animNext();
    setStep(nextStep);
  }

  const currentSport = SPORTS.find((s) => s.id === selectedSport);

  // Map step index → visual step number (1-based)
  const visualStep  = step - firstStep + 1;
  const visualTotal = totalSteps;
  const progress    = visualStep / visualTotal;

  return (
    <LinearGradient colors={GRAD.bg} style={g.fill}>
      <SafeAreaView style={styles.root}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepCount}>Step {visualStep} of {visualTotal}</Text>
          <TouchableOpacity onPress={() => navigation.replace('Home')} style={styles.homeBtn}>
            <Text style={styles.homeTxt}>🏠</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {/* Avatar preview — always visible */}
        <View style={styles.previewRow}>
          <Text style={styles.previewEmoji}>{getAvatarSummary()}</Text>
        </View>

        {/* Step content */}
        <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>

          {/* STEP 0 — Nickname (joiners only) */}
          {step === 0 && (
            <>
              <Text style={styles.stepEmoji}>🎭</Text>
              <Text style={styles.stepQ}>What's your name?</Text>
              <Text style={styles.stepHint}>This is what others will see</Text>
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

          {/* STEP 1 — Skin tone */}
          {step === 1 && (
            <>
              <Text style={styles.stepEmoji}>🎨</Text>
              <Text style={styles.stepQ}>Pick your skin tone</Text>
              <View style={styles.skinRow}>
                {SKIN_TONES.map((s) => (
                  <TouchableOpacity key={s} style={[styles.skinBtn, skin === s && styles.skinBtnActive]} onPress={() => setSkin(s)}>
                    <Text style={styles.skinEmoji}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* STEP 2 — Outfit category */}
          {step === 2 && (
            <>
              <Text style={styles.stepEmoji}>👕</Text>
              <Text style={styles.stepQ}>Pick your outfit</Text>
              <View style={styles.catGrid}>
                {OUTFIT_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catBtn, outfitCategory === c.id && styles.catBtnActive]}
                    onPress={() => { setOutfitCategory(c.id); setSelectedSport(null); setSelectedNation(null); setSelectedOnesie(null); }}
                  >
                    <Text style={styles.catIcon}>{c.icon}</Text>
                    <Text style={styles.catLbl}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* STEP 3 — Sub-choice (sports or onesie) */}
          {step === 3 && outfitCategory === 'sports' && (
            <>
              <Text style={styles.stepEmoji}>🌍</Text>
              <Text style={styles.stepQ}>Pick your sport & country</Text>
              {/* Sport selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
                {SPORTS.map((s) => (
                  <TouchableOpacity key={s.id} style={[styles.pill, selectedSport === s.id && styles.pillActive]} onPress={() => { setSelectedSport(s.id); setSelectedNation(null); }}>
                    <Text style={styles.pillTxt}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {currentSport && (
                <ScrollView style={styles.nationScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.nationGrid}>
                    {currentSport.nations.map((n) => (
                      <TouchableOpacity
                        key={n.name}
                        style={[styles.nationBtn, selectedNation?.name === n.name && styles.nationBtnActive]}
                        onPress={() => setSelectedNation(n)}
                      >
                        <Text style={styles.nationFlag}>{n.flag}</Text>
                        <Text style={styles.nationName}>{n.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </>
          )}

          {step === 3 && outfitCategory === 'onesie' && (
            <>
              <Text style={styles.stepEmoji}>🦁</Text>
              <Text style={styles.stepQ}>Pick your onesie</Text>
              <View style={styles.onesieGrid}>
                {ONESIE_OPTIONS.map((o) => (
                  <TouchableOpacity
                    key={o.name}
                    style={[styles.onesieBtn, selectedOnesie?.name === o.name && styles.onesieBtnActive]}
                    onPress={() => setSelectedOnesie(o)}
                  >
                    <Text style={styles.onesieEmoji}>{o.emoji}</Text>
                    <Text style={styles.onesieName}>{o.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {error ? <Text style={[g.error, { marginTop: S.md, textAlign: 'center' }]}>{error}</Text> : null}
        </Animated.View>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextBtn} onPress={goNext} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={C.white} size="large" />
              : <Text style={styles.nextTxt}>
                  {step === (isHost ? (needsSub ? 3 : 2) : (needsSub ? 4 : 3)) + 1 - 1
                    ? (isHost ? '🚀 Create Room!' : '🎮 Join Game!')
                    : 'Continue →'}
                </Text>
            }
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm },
  backBtn:        { padding: S.xs },
  backTxt:        { color: C.sub, fontSize: F.md, fontWeight: '700' },
  stepCount:      { color: C.sub, fontSize: F.sm, fontWeight: '700' },
  homeBtn:        { padding: S.xs },
  homeTxt:        { fontSize: F.lg },
  progressTrack:  { height: 6, backgroundColor: C.card, marginHorizontal: S.lg, borderRadius: R.full, marginBottom: S.sm },
  progressFill:   { height: 6, backgroundColor: C.purple, borderRadius: R.full },
  previewRow:     { alignItems: 'center', paddingVertical: S.md },
  previewEmoji:   { fontSize: 80 },
  content:        { flex: 1, paddingHorizontal: S.lg, paddingBottom: S.sm },
  stepEmoji:      { fontSize: 48, textAlign: 'center', marginBottom: S.sm },
  stepQ:          { fontSize: 28, fontWeight: '900', color: C.white, textAlign: 'center', marginBottom: S.xs },
  stepHint:       { fontSize: F.sm, color: C.sub, textAlign: 'center', marginBottom: S.lg },
  bigInput:       { backgroundColor: C.card, color: C.white, borderRadius: R.lg, padding: S.lg, fontSize: F.xl, fontWeight: '700', borderWidth: 2, borderColor: C.purple, textAlign: 'center' },
  skinRow:        { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: S.md },
  skinBtn:        { width: 60, height: 60, borderRadius: R.md, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  skinBtnActive:  { borderColor: C.purpleL, backgroundColor: '#1e1060' },
  skinEmoji:      { fontSize: 32 },
  catGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  catBtn:         { width: '45%', padding: S.md, borderRadius: R.lg, backgroundColor: C.card, alignItems: 'center', borderWidth: 2, borderColor: C.border },
  catBtnActive:   { backgroundColor: C.purple, borderColor: C.purpleL },
  catIcon:        { fontSize: 32, marginBottom: 4 },
  catLbl:         { color: C.white, fontSize: F.sm, fontWeight: '700', textAlign: 'center' },
  sportScroll:    { maxHeight: 52, marginBottom: S.sm },
  pill:           { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.full, backgroundColor: C.card, marginRight: 10, borderWidth: 1, borderColor: C.border },
  pillActive:     { backgroundColor: C.orange, borderColor: '#FB923C' },
  pillTxt:        { color: C.white, fontWeight: '700' },
  nationScroll:   { maxHeight: 220 },
  nationGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nationBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: R.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  nationBtnActive:{ backgroundColor: C.purple, borderColor: C.purpleL },
  nationFlag:     { fontSize: 18 },
  nationName:     { color: C.white, fontSize: F.xs, fontWeight: '600' },
  onesieGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  onesieBtn:      { width: 80, alignItems: 'center', padding: S.sm, borderRadius: R.md, backgroundColor: C.card, borderWidth: 2, borderColor: C.border },
  onesieBtnActive:{ backgroundColor: C.purple, borderColor: C.purpleL },
  onesieEmoji:    { fontSize: 36 },
  onesieName:     { color: C.white, fontSize: F.xs, marginTop: 4, textAlign: 'center' },
  footer:         { padding: S.lg, paddingBottom: S.xl },
  nextBtn:        { backgroundColor: C.purple, borderRadius: R.full, paddingVertical: 20, alignItems: 'center' },
  nextTxt:        { color: C.white, fontSize: F.xl, fontWeight: '900' },
});
