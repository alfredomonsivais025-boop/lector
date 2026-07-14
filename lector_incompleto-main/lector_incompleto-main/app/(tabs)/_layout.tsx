import { Tabs } from 'expo-router';
import { ScanLine, ClipboardList, Download } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0066B1',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E0E5EC',
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Escanear',
          tabBarIcon: ({ size, color }) => <ScanLine size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Registros',
          tabBarIcon: ({ size, color }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Exportar',
          tabBarIcon: ({ size, color }) => <Download size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
