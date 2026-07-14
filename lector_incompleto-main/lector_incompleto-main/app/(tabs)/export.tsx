import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Download, FileText, Calendar, Trash2, RefreshCw, Info } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { ScanRecord } from '@/lib/types';
import { getISOWeek, getISOYear, getWeekLabel, getNextSundayEarlyMorning } from '@/lib/week';
import { generateCSV, getCSVFilename, downloadCSV } from '@/lib/csv';

export default function ExportScreen() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [nextReset, setNextReset] = useState('');

  const currentYear = getISOYear(new Date());
  const currentWeek = getISOWeek(new Date());

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scan_records')
        .select('*')
        .eq('year_number', currentYear)
        .eq('week_number', currentWeek)
        .order('scanned_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (e) {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentWeek]);

  useEffect(() => {
    fetchRecords();
    const next = getNextSundayEarlyMorning();
    setNextReset(
      next.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }) +
        ' a las 03:00'
    );
  }, [fetchRecords]);

  const handleExport = async () => {
    if (records.length === 0) {
      Alert.alert('Sin datos', 'No hay registros para exportar esta semana.');
      return;
    }
    setExporting(true);
    try {
      const csv = generateCSV(records);
      const filename = getCSVFilename(currentYear, currentWeek);
      if (Platform.OS === 'web') {
        downloadCSV(csv, filename);
      } else {
        Alert.alert('Exportacion', `CSV generado con ${records.length} registros.`);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleWeeklyReset = async () => {
    Alert.alert(
      'Reiniciar semana',
      `Esto eliminara los registros de la semana ${currentWeek} y generara un backup CSV. Desea continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              const { data: allRecords, error: fetchError } = await supabase
                .from('scan_records')
                .select('*')
                .eq('year_number', currentYear)
                .eq('week_number', currentWeek)
                .order('scanned_at', { ascending: true });

              if (fetchError) throw fetchError;

              if (allRecords && allRecords.length > 0) {
                const csv = generateCSV(allRecords);
                if (Platform.OS === 'web') {
                  downloadCSV(csv, getCSVFilename(currentYear, currentWeek));
                }
              }

              const { error: deleteError } = await supabase
                .from('scan_records')
                .delete()
                .eq('year_number', currentYear)
                .eq('week_number', currentWeek);

              if (deleteError) throw deleteError;

              Alert.alert('Completado', 'Backup generado y registros reiniciados.');
              fetchRecords();
            } catch (e) {
              Alert.alert('Error', 'No se pudo completar el reinicio.');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('scan_records')
        .select('*')
        .order('scanned_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        Alert.alert('Sin datos', 'No hay registros para exportar.');
        return;
      }

      const csv = generateCSV(data);
      const filename = `registros_completos_${new Date().toISOString().slice(0, 10)}.csv`;
      if (Platform.OS === 'web') {
        downloadCSV(csv, filename);
      } else {
        Alert.alert('Exportacion', `CSV generado con ${data.length} registros.`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Exportacion y Backup</Text>
      <Text style={styles.subtitle}>{getWeekLabel(currentYear, currentWeek)}</Text>

      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Info size={18} color="#0066B1" />
          <Text style={styles.infoTitle}>Reinicio automatico</Text>
        </View>
        <Text style={styles.infoText}>
          El sistema genera un backup CSV y reinicia los registros cada domingo a las 03:00 AM.
        </Text>
        <View style={styles.nextResetBox}>
          <Calendar size={16} color="#009639" />
          <Text style={styles.nextResetText}>Proximo reinicio: {nextReset}</Text>
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{loading ? '...' : records.length}</Text>
          <Text style={styles.statLabel}>Registros esta semana</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={handleExport}
        disabled={exporting || loading}
      >
        <View style={styles.actionIconGreen}>
          <Download size={22} color="#fff" />
        </View>
        <View style={styles.actionBody}>
          <Text style={styles.actionTitle}>Exportar semana actual (CSV)</Text>
          <Text style={styles.actionDesc}>
            Descarga los registros de la semana {currentWeek} en formato CSV
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={handleExportAll}
        disabled={exporting}
      >
        <View style={styles.actionIconBlue}>
          <FileText size={22} color="#fff" />
        </View>
        <View style={styles.actionBody}>
          <Text style={styles.actionTitle}>Exportar todo (CSV)</Text>
          <Text style={styles.actionDesc}>Descarga todos los registros historicos</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={handleWeeklyReset}
        disabled={resetting}
      >
        <View style={styles.actionIconRed}>
          {resetting ? <RefreshCw size={22} color="#fff" /> : <Trash2 size={22} color="#fff" />}
        </View>
        <View style={styles.actionBody}>
          <Text style={styles.actionTitle}>Reiniciar semana (Backup + Borrado)</Text>
          <Text style={styles.actionDesc}>
            Genera backup CSV y elimina los registros de la semana actual
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.tablePreview}>
        <Text style={styles.previewTitle}>Vista previa de la tabla CSV</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Nombre</Text>
          <Text style={styles.tableHeaderCell}>Codigo</Text>
          <Text style={styles.tableHeaderCell}>Fecha</Text>
          <Text style={styles.tableHeaderCell}>Hora</Text>
        </View>
        {records.slice(0, 5).map((r) => (
          <View key={r.id} style={styles.tableRow}>
            <Text style={styles.tableCell} numberOfLines={1}>{r.employee_name}</Text>
            <Text style={styles.tableCell} numberOfLines={1}>{r.product_code}</Text>
            <Text style={styles.tableCell}>
              {new Date(r.scanned_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
            </Text>
            <Text style={styles.tableCell}>
              {new Date(r.scanned_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
        {records.length === 0 && (
          <Text style={styles.emptyPreview}>
            {loading ? 'Cargando...' : 'No hay registros esta semana'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#0066B1' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  infoCard: {
    backgroundColor: '#E8F1FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#0066B1' },
  infoText: { fontSize: 13, color: '#555', lineHeight: 20 },
  nextResetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nextResetText: { fontSize: 13, color: '#009639', fontWeight: '600' },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '700', color: '#0066B1' },
  statLabel: { fontSize: 13, color: '#888', marginTop: 4 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  actionIconGreen: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#009639',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIconBlue: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0066B1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIconRed: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D93025',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionBody: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  actionDesc: { fontSize: 12, color: '#888', marginTop: 3 },
  tablePreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  previewTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 10 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: '#0066B1', paddingBottom: 8, marginBottom: 6 },
  tableHeaderCell: { flex: 1, fontSize: 11, fontWeight: '700', color: '#0066B1' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  tableCell: { flex: 1, fontSize: 11, color: '#333' },
  emptyPreview: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 20 },
});
