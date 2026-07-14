import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Vibration,
  Platform,
  TouchableOpacity,
  TextInput,
  ScrollView,
  AppState,
} from 'react-native';
import {
  CheckCircle2,
  XCircle,
  User,
  Package,
  RefreshCw,
  Trash2,
  ScanLine,
  Circle,
  AlertTriangle,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { ScanPhase } from '@/lib/types';
import { getISOWeek, getISOYear } from '@/lib/week';

type StepStatus = 'pending' | 'ok' | 'error';

interface ScanStep {
  label: string;
  value: string;
  status: StepStatus;
}

function extractEmployeeNumber(raw: string): string {
  const match = raw.match(/#\s*:\s*(\d+)/i);
  if (match) return match[1];
  const numOnly = raw.match(/^(\d+)$/);
  if (numOnly) return numOnly[1];
  return raw.trim();
}

export default function ScannerScreen() {
  const [phase, setPhase] = useState<ScanPhase>('employee');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [employeeRaw, setEmployeeRaw] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [steps, setSteps] = useState<ScanStep[]>([
    { label: 'Empleado', value: '', status: 'pending' },
    { label: 'Referencia', value: '', status: 'pending' },
    { label: 'Verificacion', value: '', status: 'pending' },
  ]);

  const inputRef = useRef<TextInput>(null);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    focusInput();
  }, [phase, focusInput]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') focusInput();
    });
    return () => sub.remove();
  }, [focusInput]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 2500);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 3500);
      return () => clearTimeout(t);
    }
  }, [error]);

  const updateStep = (index: number, value: string, status: StepStatus) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, value, status } : s))
    );
  };

  const resetProductSteps = () => {
    setSteps((prev) =>
      prev.map((s, i) => (i === 0 ? s : { ...s, value: '', status: 'pending' }))
    );
    setReferenceCode('');
  };

  const processScan = async (code: string) => {
    setError(null);
    const raw = code.trim();
    if (!raw) return;

    if (Platform.OS !== 'web') Vibration.vibrate(80);

    if (phase === 'employee') {
      const num = extractEmployeeNumber(raw);
      setEmployeeNumber(num);
      setEmployeeRaw(raw);
      updateStep(0, num, 'ok');
      setPhase('reference');
      setSuccess(`Empleado #${num} identificado`);
      return;
    }

    if (phase === 'reference') {
      setReferenceCode(raw);
      updateStep(1, raw, 'ok');
      setPhase('verify');
      setSuccess('Referencia capturada. Escanee de nuevo para verificar.');
      return;
    }

    if (phase === 'verify') {
      if (raw !== referenceCode) {
        updateStep(1, referenceCode, 'error');
        updateStep(2, raw, 'error');
        setError(`Codigos no coinciden. Reintentando desde referencia.`);
        if (Platform.OS !== 'web') Vibration.vibrate([0, 200, 100, 200]);
        setTimeout(() => {
          resetProductSteps();
          setPhase('reference');
        }, 1500);
        return;
      }
      updateStep(2, raw, 'ok');
      setPhase('confirm');
      await saveRecord(referenceCode);
      return;
    }
  };

  const saveRecord = async (productCode: string) => {
    setSaving(true);
    try {
      const now = new Date();
      const week = getISOWeek(now);
      const year = getISOYear(now);

      const { error: insertError } = await supabase.from('scan_records').insert({
        employee_code: employeeNumber,
        employee_name: employeeNumber,
        product_code: productCode,
        scanned_at: now.toISOString(),
        week_number: week,
        year_number: year,
      });

      if (insertError) throw insertError;

      setScanCount((c) => c + 1);
      setRecentScans((prev) =>
        [`#${employeeNumber} | ${productCode} | ${now.toLocaleTimeString('es-ES')}`, ...prev].slice(0, 6)
      );
      setSuccess('Registro guardado.');
      resetProductSteps();
      setPhase('reference');
    } catch {
      setError('Error al guardar el registro.');
      resetProductSteps();
      setPhase('reference');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setPhase('employee');
    setEmployeeNumber('');
    setEmployeeRaw('');
    setReferenceCode('');
    setError(null);
    setSuccess(null);
    setScanCount(0);
    setRecentScans([]);
    setSteps([
      { label: 'Empleado', value: '', status: 'pending' },
      { label: 'Referencia', value: '', status: 'pending' },
      { label: 'Verificacion', value: '', status: 'pending' },
    ]);
  };

  const handleSubmit = () => {
    const val = inputValue.trim();
    setInputValue('');
    if (val) processScan(val);
  };

  const phaseColors: Record<ScanPhase, string> = {
    employee: '#0066B1',
    reference: '#009639',
    verify: '#F5A623',
    confirm: '#009639',
  };

  const phaseLabels: Record<ScanPhase, string> = {
    employee: 'Escanear empleado',
    reference: 'Escanear codigo de producto',
    verify: 'Verificar: escanee el mismo producto',
    confirm: 'Guardando...',
  };

  const activeColor = phaseColors[phase];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="always">
        <View style={styles.header}>
          <View>
            <Text style={styles.brandText}>PARKER</Text>
            <Text style={styles.brandSubtext}>HANNIFIN</Text>
          </View>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{scanCount}</Text>
            <Text style={styles.counterLabel}>registros</Text>
          </View>
        </View>

        {employeeNumber ? (
          <View style={styles.employeeBadge}>
            <User size={16} color="#fff" />
            <Text style={styles.employeeBadgeText}>Empleado #{employeeNumber}</Text>
          </View>
        ) : null}

        {/* Indicadores de paso */}
        <View style={styles.stepsRow}>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepItem}>
              <StepIndicator step={step} isActive={
                (i === 0 && phase === 'employee') ||
                (i === 1 && (phase === 'reference' || (phase === 'verify' && step.status !== 'error'))) ||
                (i === 2 && (phase === 'verify' || phase === 'confirm'))
              } />
              <Text style={styles.stepLabel}>{step.label}</Text>
              {step.value ? (
                <Text style={styles.stepValue} numberOfLines={1}>{step.value}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Zona de escaneo principal */}
        <TouchableOpacity
          style={[styles.scanZone, { borderColor: activeColor }]}
          onPress={focusInput}
          activeOpacity={0.9}
        >
          <ScanLine size={56} color={activeColor} strokeWidth={1.5} />
          <Text style={[styles.scanZonePhase, { color: activeColor }]}>
            {phaseLabels[phase]}
          </Text>
          <Text style={styles.scanZoneHint}>
            Apunte el laser y presione el gatillo
          </Text>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleSubmit}
            autoCapitalize="none"
            autoCorrect={false}
            showSoftInputOnFocus={false}
            caretHidden
            blurOnSubmit={false}
          />

          <View style={[styles.readyIndicator, { backgroundColor: activeColor + '22', borderColor: activeColor }]}>
            <View style={[styles.readyDot, { backgroundColor: activeColor }]} />
            <Text style={[styles.readyText, { color: activeColor }]}>Listo para escanear</Text>
          </View>
        </TouchableOpacity>

        {/* Cuadros de estado de escaneos */}
        <View style={styles.scanBoxesRow}>
          <ScanBox
            number={1}
            label="Cod. Referencia"
            value={steps[1].value}
            status={steps[1].status}
          />
          <View style={styles.scanBoxDivider} />
          <ScanBox
            number={2}
            label="Verificacion"
            value={steps[2].value}
            status={steps[2].status}
          />
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={20} color="#fff" />
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={20} color="#fff" />
            <Text style={styles.bannerText}>{success}</Text>
          </View>
        )}

        {saving && (
          <View style={styles.savingBanner}>
            <RefreshCw size={18} color="#fff" />
            <Text style={styles.bannerText}>Guardando...</Text>
          </View>
        )}

        {recentScans.length > 0 && (
          <View style={styles.recentContainer}>
            <Text style={styles.recentTitle}>Ultimos registros</Text>
            {recentScans.map((s, i) => (
              <View key={i} style={styles.recentItem}>
                <CheckCircle2 size={13} color="#009639" />
                <Text style={styles.recentText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.resetButton} onPress={resetAll}>
          <Trash2 size={16} color="#fff" />
          <Text style={styles.resetButtonText}>Reiniciar sesion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function StepIndicator({ step, isActive }: { step: ScanStep; isActive: boolean }) {
  if (step.status === 'ok') {
    return (
      <View style={[stepStyles.box, stepStyles.ok]}>
        <CheckCircle2 size={20} color="#009639" />
      </View>
    );
  }
  if (step.status === 'error') {
    return (
      <View style={[stepStyles.box, stepStyles.error]}>
        <XCircle size={20} color="#D93025" />
      </View>
    );
  }
  if (isActive) {
    return (
      <View style={[stepStyles.box, stepStyles.active]}>
        <ScanLine size={20} color="#0066B1" />
      </View>
    );
  }
  return (
    <View style={[stepStyles.box, stepStyles.pending]}>
      <Circle size={20} color="#CCC" />
    </View>
  );
}

function ScanBox({
  number,
  label,
  value,
  status,
}: {
  number: number;
  label: string;
  value: string;
  status: StepStatus;
}) {
  const borderColor =
    status === 'ok' ? '#009639' : status === 'error' ? '#D93025' : '#D0D5DD';
  const bg =
    status === 'ok' ? '#F0FBF4' : status === 'error' ? '#FDF2F2' : '#FAFAFA';

  return (
    <View style={[scanBoxStyles.box, { borderColor, backgroundColor: bg }]}>
      <View style={scanBoxStyles.header}>
        <Text style={scanBoxStyles.number}>Escaneo {number}</Text>
        {status === 'ok' && <CheckCircle2 size={16} color="#009639" />}
        {status === 'error' && <XCircle size={16} color="#D93025" />}
        {status === 'pending' && <Circle size={16} color="#CCC" />}
      </View>
      <Text style={scanBoxStyles.label}>{label}</Text>
      <Text style={[scanBoxStyles.value, { color: status === 'error' ? '#D93025' : '#222' }]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  box: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  ok: { backgroundColor: '#F0FBF4', borderWidth: 1.5, borderColor: '#009639' },
  error: { backgroundColor: '#FDF2F2', borderWidth: 1.5, borderColor: '#D93025' },
  active: { backgroundColor: '#E8F1FA', borderWidth: 1.5, borderColor: '#0066B1' },
  pending: { backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#DDD' },
});

const scanBoxStyles = StyleSheet.create({
  box: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    minHeight: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  number: { fontSize: 12, fontWeight: '700', color: '#555' },
  label: { fontSize: 11, color: '#888', marginBottom: 6 },
  value: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandText: { fontSize: 22, fontWeight: '700', color: '#0066B1', letterSpacing: 2 },
  brandSubtext: { fontSize: 12, fontWeight: '600', color: '#0066B1', letterSpacing: 1 },
  counterBadge: {
    backgroundColor: '#0066B1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  counterText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  counterLabel: { fontSize: 9, color: '#E0E9F2', marginTop: -2 },
  employeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066B1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  employeeBadgeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  stepItem: { flex: 1, alignItems: 'center' },
  stepLabel: { fontSize: 11, color: '#666', fontWeight: '600', textAlign: 'center' },
  stepValue: { fontSize: 10, color: '#009639', marginTop: 2, maxWidth: 80, textAlign: 'center' },
  scanZone: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  scanZonePhase: { fontSize: 16, fontWeight: '700', marginTop: 14, marginBottom: 6, textAlign: 'center' },
  scanZoneHint: { fontSize: 13, color: '#888', marginBottom: 16, textAlign: 'center' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  readyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  readyDot: { width: 8, height: 8, borderRadius: 4 },
  readyText: { fontSize: 13, fontWeight: '600' },
  scanBoxesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  scanBoxDivider: { width: 1, backgroundColor: '#E0E5EC' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D93025',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#009639',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  savingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5A623',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  bannerText: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  recentContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  recentTitle: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  recentText: { fontSize: 12, color: '#444' },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D93025',
    paddingVertical: 14,
    borderRadius: 12,
  },
  resetButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
