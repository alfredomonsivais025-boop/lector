import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Package, Calendar, Clock, User, Filter, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { ScanRecord } from '@/lib/types';
import { getISOWeek, getISOYear, getWeekLabel } from '@/lib/week';

export default function RecordsScreen() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekFilter, setWeekFilter] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<{ year: number; week: number }[]>([]);
  const [showWeekPicker, setShowWeekPicker] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentWeek = getISOWeek(now);
      const currentYear = getISOYear(now);

      let query = supabase
        .from('scan_records')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(500);

      if (weekFilter) {
        query = query.eq('week_number', weekFilter);
      } else {
        query = query.eq('year_number', currentYear).eq('week_number', currentWeek);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);

      const { data: weeksData } = await supabase
        .from('scan_records')
        .select('year_number, week_number')
        .order('year_number', { ascending: false })
        .order('week_number', { ascending: false });

      if (weeksData) {
        const unique = weeksData.reduce((acc, item) => {
          const key = `${item.year_number}-${item.week_number}`;
          if (!acc[key]) acc[key] = { year: item.year_number, week: item.week_number };
          return acc;
        }, {} as Record<string, { year: number; week: number }>);
        setAvailableWeeks(Object.values(unique));
      }
    } catch (e) {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const renderItem = ({ item }: { item: ScanRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordIcon}>
        <Package size={20} color="#0066B1" />
      </View>
      <View style={styles.recordBody}>
        <Text style={styles.recordProduct}>{item.product_code}</Text>
        <View style={styles.recordMeta}>
          <View style={styles.metaRow}>
            <User size={12} color="#888" />
            <Text style={styles.metaText}>{item.employee_name}</Text>
          </View>
        </View>
        <View style={styles.recordMeta}>
          <View style={styles.metaRow}>
            <Calendar size={12} color="#888" />
            <Text style={styles.metaText}>{formatDate(item.scanned_at)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Clock size={12} color="#888" />
            <Text style={styles.metaText}>{formatTime(item.scanned_at)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Registros</Text>
          <Text style={styles.subtitle}>
            {weekFilter
              ? getWeekLabel(getISOYear(new Date()), weekFilter)
              : getWeekLabel(getISOYear(new Date()), getISOWeek(new Date()))}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowWeekPicker(!showWeekPicker)}
        >
          <Filter size={16} color="#fff" />
          <Text style={styles.filterText}>Filtrar</Text>
          <ChevronDown size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {showWeekPicker && (
        <View style={styles.weekPicker}>
          <TouchableOpacity
            style={[styles.weekOption, !weekFilter && styles.weekOptionActive]}
            onPress={() => {
              setWeekFilter(null);
              setShowWeekPicker(false);
            }}
          >
            <Text style={[styles.weekOptionText, !weekFilter && styles.weekOptionTextActive]}>
              Semana actual
            </Text>
          </TouchableOpacity>
          {availableWeeks.map((w) => (
            <TouchableOpacity
              key={`${w.year}-${w.week}`}
              style={[styles.weekOption, weekFilter === w.week && styles.weekOptionActive]}
              onPress={() => {
                setWeekFilter(w.week);
                setShowWeekPicker(false);
              }}
            >
              <Text style={[styles.weekOptionText, weekFilter === w.week && styles.weekOptionTextActive]}>
                {getWeekLabel(w.year, w.week)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{records.length}</Text>
          <Text style={styles.statLabel}>Total registros</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {new Set(records.map((r) => r.employee_code)).size}
          </Text>
          <Text style={styles.statLabel}>Empleados</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {new Set(records.map((r) => r.product_code)).size}
          </Text>
          <Text style={styles.statLabel}>Productos</Text>
        </View>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color="#CCC" />
            <Text style={styles.emptyText}>
              {loading ? 'Cargando...' : 'No hay registros para esta semana'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E5EC',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0066B1' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0066B1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  weekPicker: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E5EC',
    maxHeight: 220,
  },
  weekOption: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  weekOptionActive: { backgroundColor: '#E8F1FA' },
  weekOptionText: { fontSize: 14, color: '#555' },
  weekOptionTextActive: { color: '#0066B1', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#0066B1' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8F1FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordBody: { flex: 1 },
  recordProduct: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 6 },
  recordMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#777' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12 },
});
