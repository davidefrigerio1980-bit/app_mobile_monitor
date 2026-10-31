import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Platform, Alert, ScrollView } from 'react-native';
import { supabase } from '../services/supabase';

export default function Config({ navigation }: any) {
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [catalogoFull, setCatalogoFull] = useState<any[]>([]);
  const [showCatalogo, setShowCatalogo] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  // 1. Recupera contemporaneamente i tuoi ETF e l'intero catalogo
  async function fetchAllData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ETF nel tuo perimetro
    const { data: portfolioData } = await supabase
      .from('portfolio_assets')
      .select('*')
      .eq('user_id', user.id);

    if (portfolioData) setMyAssets(portfolioData);

    // Tutto il catalogo disponibile
    const { data: catData } = await supabase
      .from('catalogo')
      .select('symbol, name')
      .order('symbol', { ascending: true }); // Li mette in ordine alfabetico

    if (catData) setCatalogoFull(catData);
  }

  // 2. Calcola al volo gli ETF ancora disponibili (Catalogo MENO i tuoi)
  const availableAssets = catalogoFull.filter(
    cat => !myAssets.some(my => my.symbol === cat.symbol)
  );

  // 3. Aggiungi un ETF al perimetro
async function addAsset(item: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    const { error } = await supabase
      .from('portfolio_assets')
      .insert({
        user_id: user.id,
        symbol: item.symbol,
        name: item.name
        // Abbiamo rimosso pac: true. Il DB inserirà il suo default (250) in automatico!
      });

    if (!error) {
      setShowCatalogo(false); // Chiude la tendina
      fetchAllData();         // Aggiorna le due liste in automatico
    } else {
      console.log("ERRORE DATABASE SUPABASE:", error);
      Alert.alert('Errore Database', error.message || error.details || "Errore sconosciuto");
    }
    setLoading(false);
  }

  // 4. Rimuovi un ETF dal perimetro
  async function removeAsset(symbol: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('portfolio_assets')
      .delete()
      .eq('user_id', user.id)
      .eq('symbol', symbol);

    if (!error) {
      fetchAllData();
    } else {
      Alert.alert('Errore', "Impossibile rimuovere l'ETF");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* INTESTAZIONE CUSTOM */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{'<'} Torna alla Dashboard</Text>
          </TouchableOpacity>
        </View>

        {/* SEZIONE MENU A TENDINA CATALOGO */}
        <View style={styles.addSection}>
          <TouchableOpacity 
            style={styles.addHeaderBtn} 
            onPress={() => setShowCatalogo(!showCatalogo)}
            activeOpacity={0.8}
          >
            <Text style={styles.addHeaderTitle}>+ Aggiungi dal Catalogo</Text>
            <Text style={styles.addHeaderIcon}>{showCatalogo ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showCatalogo && (
            <View style={styles.dropdownContainer}>
              {availableAssets.length > 0 ? (
                <ScrollView style={styles.catalogScroll} nestedScrollEnabled={true}>
                  {availableAssets.map((item) => (
                    <TouchableOpacity key={item.symbol} style={styles.catalogItem} onPress={() => addAsset(item)}>
                      <Text style={styles.catalogSymbol}>{item.symbol}</Text>
                      <Text style={styles.catalogName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.addIcon}>+</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.allAddedText}>Tutti gli ETF del catalogo sono già nel tuo perimetro!</Text>
              )}
            </View>
          )}
        </View>

        {/* LISTA DEGLI ETF NEL PERIMETRO */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>In Monitoraggio ({myAssets.length})</Text>
          
          <FlatList
            data={myAssets}
            keyExtractor={(item) => item.symbol}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.assetCard}>
                <View style={styles.assetInfo}>
                  <Text style={styles.assetSymbol}>{item.symbol}</Text>
                  <Text style={styles.assetName} numberOfLines={1}>{item.name}</Text>
                </View>
                
                <TouchableOpacity onPress={() => removeAsset(item.symbol)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>Elimina</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nessun ETF nel perimetro. Aggiungine uno dal catalogo qui sopra.</Text>
            }
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { 
    padding: 20, 
    paddingTop: Platform.OS === 'android' ? 40 : 20, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderBottomColor: '#d9e0e7' 
  },
  backButton: { paddingVertical: 5 },
  backText: { color: '#0f5c5c', fontSize: 16, fontWeight: 'bold' },
  
  addSection: { padding: 16, backgroundColor: 'white', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#d9e0e7' },
  addHeaderBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f4f6f8', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#d9e0e7' },
  addHeaderTitle: { fontWeight: 'bold', color: '#14202b', fontSize: 15 },
  addHeaderIcon: { color: '#8a96a3', fontSize: 14, fontWeight: 'bold' },
  
  dropdownContainer: { marginTop: 8, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#d9e0e7', overflow: 'hidden' },
  catalogScroll: { maxHeight: 280 }, // Altezza massima della tendina prima di scorrere
  catalogItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f4f6f8' },
  catalogSymbol: { fontWeight: 'bold', fontSize: 16, color: '#14202b', width: 70 },
  catalogName: { flex: 1, fontSize: 13, color: '#556' },
  addIcon: { fontSize: 20, fontWeight: 'bold', color: '#2ecc71', marginLeft: 10 },
  allAddedText: { padding: 16, textAlign: 'center', color: '#8a96a3', fontSize: 14, fontStyle: 'italic' },
  
  listSection: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#556', marginBottom: 10, textTransform: 'uppercase' },
  assetCard: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 10, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  assetInfo: { flex: 1 },
  assetSymbol: { fontSize: 18, fontWeight: 'bold', color: '#14202b' },
  assetName: { fontSize: 13, color: '#556', marginTop: 2 },
  
  removeBtn: { backgroundColor: '#ffeef0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  removeBtnText: { color: '#e74c3c', fontSize: 12, fontWeight: 'bold' },
  // AGGIUNGI QUESTA RIGA:
  emptyText: { textAlign: 'center', marginTop: 30, color: '#8a96a3', fontSize: 15 }
});