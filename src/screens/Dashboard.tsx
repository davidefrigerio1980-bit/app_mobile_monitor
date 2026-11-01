import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, Platform, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';

const getScoreColor = (score: number) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const hue = Math.round((clampedScore / 100) * 120);
  return `hsl(${hue}, 70%, 80%)`;
};

export default function Dashboard({ navigation }: any) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: portfolio } = await supabase
        .from('portfolio_assets')
        .select('symbol, name, pac')
        .eq('user_id', user.id);

      const { data: market } = await supabase
        .from('market_data')
        .select('*');

      if (portfolio && market) {
        const mergedData = portfolio.map(item => {
          const mData = market.find(m => m.symbol === item.symbol);
          return { ...item, ...mData };
        });
        
        mergedData.sort((a, b) => (b.score || 0) - (a.score || 0));
        setAssets(mergedData);
      }

      if (market && market.length > 0) {
        const latestString = market.reduce((a, b) => (new Date(a.updated_at) > new Date(b.updated_at) ? a : b)).updated_at;
        const latestDate = new Date(latestString);
        
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formattedDate = `${pad(latestDate.getDate())}/${pad(latestDate.getMonth() + 1)}/${latestDate.getFullYear()} alle ${pad(latestDate.getHours())}:${pad(latestDate.getMinutes())}`;
        
        setLastUpdate(formattedDate);
      }
    } catch (error) {
      console.log("Errore nel recupero dati:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'segnale': return '#2ecc71'; 
      case 'attesa': return '#f39c12';  
      case 'falso allarme': return '#e74c3c'; 
      default: return '#95a5a6'; 
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return 'N/A';
    if (status.toLowerCase() === 'falso allarme') return 'IGNORATO';
    return status.toUpperCase();
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExpanded = expandedSymbol === item.symbol;
    const hasMarketData = item.score !== undefined;

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        </View>

        {hasMarketData ? (
          <>
            <View style={styles.mainMetrics}>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>Score</Text>
                <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.score) }]}>
              <Text style={styles.scoreText}>{item.score}</Text>
            </View>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>Trend 50/200</Text>
                <Text style={[styles.metricValue, { color: item.trend_rialzista ? '#2ecc71' : '#e74c3c' }]}>
                  {item.trend_rialzista ? 'Rialzista' : 'Ribassista'}
                </Text>
              </View>
              
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>Weekly</Text>
                <Text style={[styles.metricBadge, { backgroundColor: getStatusColor(item.stato_weekly) }]}>
                  {formatStatus(item.stato_weekly)}
                </Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>Daily</Text>
                <Text style={[styles.metricBadge, { backgroundColor: getStatusColor(item.stato_daily) }]}>
                  {formatStatus(item.stato_daily)}
                </Text>
              </View>
            </View>

            {isExpanded && (
              <View style={styles.expandedSection}>
                <Text style={styles.expandedTitle}>Dettaglio Segnali</Text>
                <View style={styles.signalsGrid}>
                  <SignalBadge label="W" active={item.sig_w} />
                  <SignalBadge label="RSI" active={item.sig_rsi} />
                  <SignalBadge label="AO" active={item.sig_ao} />
                  <SignalBadge label="B%" active={item.sig_bb} />
                  <SignalBadge label="Price" active={item.sig_price} />
                  <SignalBadge label="SMA20" active={item.sig_sma20} />
                  <SignalBadge label="GC" active={item.sig_gc} />
                </View>

                <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.score) }]}>
        <Text style={styles.scoreText}>{item.score}</Text>
      </View>

              </View>
            )}
          </>
        ) : (
          <Text style={styles.noDataText}>Dati di mercato in attesa di sincronizzazione...</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.header}>
          <Image 
            source={require('/Users/d./Developer/app_mobile_monitor/assets/logo_pac_pro.png')} 
            style={styles.headerLogo} 

            resizeMode="contain"
          />
          <Text style={styles.subtitle}>
            {lastUpdate ? `Ultima sync: ${lastUpdate}` : 'In attesa di dati'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0f5c5c" style={{ flex: 1, marginTop: 20 }} />
        ) : (
          <FlatList
            data={assets}
            style={styles.list}
            keyExtractor={item => item.symbol}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nessun ETF monitorato. Vai in Configurazione.</Text>
            }
          />
        )}
        
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Config')}>
            <Text style={styles.buttonText}>Setup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const SignalBadge = ({ label, active }: { label: string, active: boolean }) => (
  <View style={styles.signalBadge}>
    <Text style={styles.signalLabel}>{label}</Text>
    <Text style={[styles.signalIcon, { color: active ? '#2ecc71' : '#e74c3c' }]}>
      {active ? '✓' : '✗'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { 
    padding: 12, 
    paddingTop: Platform.OS === 'android' ? 40 : 20, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderBottomColor: '#d9e0e7'
  },
  headerLogo: {
    width: 200,
    height: 52,
    marginBottom: 2,
    marginLeft: -13,
  },
  subtitle: { fontSize: 13, color: '#556', fontStyle: 'italic' },
  list: { flex: 1, padding: 16 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 10, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  scoreBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 45,
  },
  scoreText: {
    fontWeight: 'bold',
    color: '#14202b',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8 },
  symbol: { fontSize: 18, fontWeight: 'bold', color: '#14202b', width: 70 },
  name: { fontSize: 14, color: '#556', flex: 1 },
  mainMetrics: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricCol: { alignItems: 'center', flex: 1 },
  metricLabel: { fontSize: 11, color: '#8a96a3', marginBottom: 4, textTransform: 'uppercase' },
  metricValue: { fontSize: 13, fontWeight: 'bold', color: '#14202b' },
  metricBadge: { 
    width: 55,
    textAlign: 'center',
    fontSize: 9, 
    fontWeight: 'bold', 
    color: 'white', 
    paddingVertical: 4,
    borderRadius: 4, 
    overflow: 'hidden'
  },
  expandedSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  expandedTitle: { fontSize: 12, fontWeight: 'bold', color: '#556', marginBottom: 10 },
  signalsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  signalBadge: { alignItems: 'center', width: '13%', marginBottom: 10 },
  signalLabel: { fontSize: 10, color: '#8a96a3', marginBottom: 2 },
  signalIcon: { fontSize: 16, fontWeight: 'bold' },
  noDataText: { fontSize: 12, color: '#e74c3c', fontStyle: 'italic', marginTop: 10 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#8a96a3', fontSize: 16 },
  footer: { 
    padding: 20, 
    paddingBottom: Platform.OS === 'ios' ? 80 : 60, 
    backgroundColor: 'white', 
    borderTopWidth: 1, 
    borderTopColor: '#d9e0e7' 
  },
  button: { backgroundColor: '#0f5c5c', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});