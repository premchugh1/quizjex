import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPORTS, OUTFIT_CATEGORIES, ONESIE_OPTIONS } from '../data/gameData';
import { C, F, S, R, GRAD, g } from '../theme';
import socket from '../socket';

const SKIN_TONES = ['🧑', '🧑🏻', '🧑🏼', '🧑🏽', '🧑🏾', '🧑🏿'];

export default function AvatarScreen({ navigation, route }) {
  const { isHost, setupParams, roomCode } = route.params;

  const [nickname, setNickname] = useState(setupParams?.nickname || '');
  const [skin, setSkin] = useState('🧑');
  const [outfitCategory, setOutfitCategory] = useState(null);
  const [selectedSport, setSelectedSport] = useState(null);
  const [selectedNation, setSelectedNation] = useState(null);
  const [selectedOnesie, setSelectedOnesie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      navigation.replace('Lobby', {
        isHost: true,
        roomCode: code,
        nickname: setupParams.nickname,
        avatar: getAvatarSummary(),
      });
    });
    socket.on('joinSuccess', ({ code, players, decoration, topic }) => {
      setLoading(false);
      navigation.replace('Lobby', {
        isHost: false,
        roomCode: code,
        nickname,
        avatar: getAvatarSummary(),
        players,
        decoration,
        topic,
      });
    });
    socket.on('joinError', ({ message }) => {
      setLoading(false);
      setError(message);
    });
    socket.on('serverError', ({ message }) => {
      setLoading(false);
      setError(message);
    });
    return () => {
      socket.off('roomCreated');
      socket.off('joinSuccess');
      socket.off('joinError');
      socket.off('serverError');
    };
  }, [skin, outfitCategory, selectedNation, selectedOnesie]);

  function proceed() {
    if (!isHost && !nickname.trim()) { setError('Enter your nickname! 🎭'); return; }
    setError('');
    setLoading(true);
    const avatar = getAvatarSummary();
    if (isHost) {
      socket.emit('createRoom', { ...setupParams, avatar });
    } else {
      socket.emit('joinRoom', { code: roomCode, nickname: nickname.trim(), avatar });
    }
  }

  const currentSport = SPORTS.find((s) => s.id === selectedSport);

  return (
    <LinearGradient colors={GRAD.bg} style={g.fill}>
      <SafeAreaView style={g.fill}>
        <ScrollView contentContainerStyle={g.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={g.back}>
            <Text style={g.backTxt}>← Back</Text>
          </TouchableOpacity>

          <Text style={g.h1}>🧍 Build Your Avatar</Text>

          <View style={[g.card, styles.preview]}>
            <Text style={styles.previewEmoji}>{getAvatarSummary()}</Text>
          </View>

          {!isHost && (
            <>
              <Text style={g.label}>🎭 Your Nickname</Text>
              <TextInput
                style={g.input}
                placeholder="Pick a fun nickname..."
                placeholderTextColor={C.sub}
                value={nickname}
                onChangeText={setNickname}
                maxLength={20}
              />
            </>
          )}

          <Text style={g.label}>🎨 Pick your character</Text>
          <View style={styles.skinRow}>
            {SKIN_TONES.map((s) => (
              <TouchableOpacity key={s} style={[styles.skinBtn, skin === s && styles.skinBtnActive]} onPress={() => setSkin(s)}>
                <Text style={styles.skinEmoji}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={g.label}>👕 Pick your outfit</Text>
          <View style={g.wrap}>
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

          {outfitCategory === 'sports' && (
            <>
              <Text style={g.label}>🏅 Pick a sport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {SPORTS.map((s) => (
                  <TouchableOpacity key={s.id} style={[styles.pill, selectedSport === s.id && styles.pillActive]} onPress={() => { setSelectedSport(s.id); setSelectedNation(null); }}>
                    <Text style={styles.pillTxt}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {outfitCategory === 'sports' && currentSport && (
            <>
              <Text style={g.label}>🌍 Pick your country</Text>
              <View style={g.wrap}>
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
            </>
          )}

          {outfitCategory === 'onesie' && (
            <>
              <Text style={g.label}>🦁 Pick your onesie</Text>
              <View style={g.wrap}>
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

          {error ? <Text style={g.error}>{error}</Text> : null}

          <TouchableOpacity style={[g.btn, { backgroundColor: C.purple }]} onPress={proceed} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={g.btnText}>{isHost ? '🚀 Create Room!' : '🎮 Join Game!'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  preview:         { alignItems: 'center', marginBottom: S.md, marginTop: S.sm },
  previewEmoji:    { fontSize: 80 },
  skinRow:         { flexDirection: 'row', gap: 10 },
  skinBtn:         { width: 52, height: 52, borderRadius: R.md, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  skinBtnActive:   { borderColor: C.purpleL },
  skinEmoji:       { fontSize: 28 },
  catBtn:          { width: '47%', padding: 14, borderRadius: R.lg, backgroundColor: C.card, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  catBtnActive:    { backgroundColor: C.purple, borderColor: C.purpleL },
  catIcon:         { fontSize: 28, marginBottom: 4 },
  catLbl:          { color: C.white, fontSize: F.xs, fontWeight: '600', textAlign: 'center' },
  pill:            { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.full, backgroundColor: C.card, marginRight: 10, borderWidth: 1, borderColor: C.border },
  pillActive:      { backgroundColor: C.orange, borderColor: '#FB923C' },
  pillTxt:         { color: C.white, fontWeight: '700' },
  nationBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  nationBtnActive: { backgroundColor: C.purple, borderColor: C.purpleL },
  nationFlag:      { fontSize: 20 },
  nationName:      { color: C.white, fontSize: F.xs, fontWeight: '600' },
  onesieBtn:       { width: 72, alignItems: 'center', padding: 10, borderRadius: R.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  onesieBtnActive: { backgroundColor: C.purple, borderColor: C.purpleL },
  onesieEmoji:     { fontSize: 32 },
  onesieName:      { color: C.white, fontSize: F.xs, marginTop: 4 },
});
