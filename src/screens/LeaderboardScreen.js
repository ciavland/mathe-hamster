import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTopEntries, formatAvgTime } from '../utils/leaderboard';
import { COLORS, DIFFICULTY } from '../utils/theme';

const FILTERS = [
  { key: null,         label: 'Alle' },
  { key: 'SCHLUESSEL', label: '🗝️ Schlüssel' },
  { key: 'EASY',       label: '🌟 Leicht' },
  { key: 'MEDIUM',     label: '⭐ Mittel' },
  { key: 'HARD',       label: '🔥 Schwer' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function RankBadge({ rank }) {
  if (rank < 3) return <Text style={styles.medal}>{MEDALS[rank]}</Text>;
  return (
    <View style={styles.rankCircle}>
      <Text style={styles.rankText}>{rank + 1}</Text>
    </View>
  );
}

function EntryRow({ item, rank }) {
  const diff = DIFFICULTY[item.difficultyKey];
  return (
    <View style={styles.row}>
      <RankBadge rank={rank} />

      <View style={styles.rowMain}>
        {/* Name + Hauptmetrik */}
        <View style={styles.rowTop}>
          {item.playerName && item.playerName !== '—' && (
            <Text style={styles.playerName}>{item.playerName}</Text>
          )}
          <Text style={styles.avgTime}>{formatAvgTime(item.avgTime)}<Text style={styles.perQ}> / Aufgabe</Text></Text>
        </View>

        <View style={styles.rowMeta}>
          {/* Schwierigkeit */}
          <View style={[styles.diffBadge, { backgroundColor: diff?.color ?? '#888' }]}>
            <Text style={styles.diffText}>{item.difficultyLabel}</Text>
          </View>
          {/* Richtige */}
          <Text style={styles.metaText}>{item.correct} richtig</Text>
          {/* Datum */}
          <Text style={styles.metaText}>{item.date}</Text>
        </View>
      </View>
    </View>
  );
}

export default function LeaderboardScreen({ navigation }) {
  const [filter, setFilter]   = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getTopEntries(filter, 50);
    setEntries(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 Bestenliste</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter-Tabs */}
      <View style={styles.tabs}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.key)}
            style={[styles.tab, filter === f.key && styles.tabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.tabText, filter === f.key && styles.tabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hinweis */}
      <Text style={styles.hint}>Weniger Sekunden pro Aufgabe = besser</Text>

      {/* Liste */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>Noch keine Einträge.</Text>
          <Text style={styles.emptyHint}>Spiel eine Runde und komm zurück!</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => <EntryRow item={item} rank={index} />}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  backBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, color: COLORS.primary, fontWeight: '300', lineHeight: 34 },
  title:    { fontSize: 20, fontWeight: '900', color: COLORS.text },

  tabs: {
    flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 4,
  },
  tab: {
    flex: 1, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.white, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText:   { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },

  hint: {
    fontSize: 12, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: 4,
  },

  /* Zeile */
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  medal:       { fontSize: 28 },
  rankCircle:  {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },

  rowMain: { flex: 1 },
  rowTop:  { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  playerName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  avgTime: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  perQ:    { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  diffBadge: {
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
  },
  diffText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  metaText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  /* Leer */
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText:  { fontSize: 18, fontWeight: '800', color: COLORS.text },
  emptyHint:  { fontSize: 14, color: COLORS.textSecondary },
});
