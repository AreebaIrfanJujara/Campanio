import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'captions' | 'speak' | 'ocr' | 'settings'>('home');
  const [highContrast, setHighContrast] = useState(false);

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { rate: 1.0, pitch: 1.0 });
  };

  const colors = highContrast
    ? { bg: '#000000', surface: '#121212', text: '#FFFFFF', primary: '#FFD400', border: '#FFFFFF', subText: '#E0E0E0' }
    : { bg: '#0F172A', surface: '#1E293B', text: '#F8FAFC', primary: '#3B82F6', border: '#334155', subText: '#94A3B8' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Companio</Text>
        <TouchableOpacity
          onPress={() => {
            const next = !highContrast;
            setHighContrast(next);
            speak(next ? 'High contrast enabled' : 'Standard theme enabled');
          }}
          style={[styles.themeBtn, { borderColor: colors.border }]}
          accessibilityLabel="Toggle high contrast mode"
        >
          <Text style={{ color: colors.text, fontWeight: 'bold' }}>{highContrast ? 'Standard' : 'Contrast'}</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Body */}
      <ScrollView contentContainerStyle={styles.content}>
        {currentTab === 'home' && (
          <View style={styles.tabContent}>
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Welcome to Companio</Text>
              <Text style={[styles.heroSub, { color: colors.subText }]}>Your universal mobile accessibility companion</Text>
            </View>

            <View style={styles.grid}>
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setCurrentTab('ocr');
                  speak('Opening OCR text scanner');
                }}
              >
                <Text style={[styles.cardTitle, { color: colors.primary }]}>Read Text (OCR)</Text>
                <Text style={[styles.cardDesc, { color: colors.subText }]}>Point camera at street signs or labels</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setCurrentTab('captions');
                  speak('Opening Live Captions');
                }}
              >
                <Text style={[styles.cardTitle, { color: colors.primary }]}>Live Captions</Text>
                <Text style={[styles.cardDesc, { color: colors.subText }]}>Real-time speech to text transcription</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setCurrentTab('speak');
                  speak('Opening Speak For Me phrase board');
                }}
              >
                <Text style={[styles.cardTitle, { color: colors.primary }]}>Speak For Me</Text>
                <Text style={[styles.cardDesc, { color: colors.subText }]}>AAC phrases & type to speech</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentTab === 'captions' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Captions</Text>
            <View style={[styles.displayBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.captionText, { color: colors.text }]}>
                [Speaker]: Hello there! Companio is listening to live speech near your device.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => speak('Captions active. Speak clearly into the microphone.')}
            >
              <Text style={styles.btnText}>Start Listening</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentTab === 'speak' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Speak For Me</Text>
            <View style={styles.grid}>
              {['Yes', 'No', 'Thank you very much.', 'Please call for help.', 'Where is the restroom?', 'One moment, please.'].map((phrase, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.phraseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => speak(phrase)}
                >
                  <Text style={[styles.phraseText, { color: colors.text }]}>{phrase}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {currentTab === 'ocr' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Read Text (OCR)</Text>
            <View style={[styles.displayBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.captionText, { color: colors.text }]}>
                Pharmacy Label: Take 1 tablet daily with food in morning. Quantity 30.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => speak('Pharmacy Label: Take 1 tablet daily with food in morning. Quantity 30.')}
            >
              <Text style={styles.btnText}>Read Aloud</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentTab === 'settings' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Accessibility Settings</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, width: '100%' }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Offline Mode</Text>
              <Text style={[styles.cardDesc, { color: colors.subText }]}>Local speech and offline phrasebook enabled</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Nav Bar */}
      <View style={[styles.navBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {(['home', 'captions', 'speak', 'ocr', 'settings'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              setCurrentTab(tab);
              speak(`Navigated to ${tab}`);
            }}
            style={styles.navItem}
          >
            <Text style={[styles.navText, { color: currentTab === tab ? colors.primary : colors.subText }]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  themeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderRadius: 8 },
  content: { padding: 20, paddingBottom: 100 },
  tabContent: { width: '100%' },
  heroCard: { padding: 20, borderRadius: 16, borderWidth: 2, marginBottom: 20 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  heroSub: { fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', padding: 16, borderRadius: 16, borderWidth: 1.5, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  phraseCard: { width: '48%', padding: 18, borderRadius: 16, borderWidth: 1.5, marginBottom: 14, minHeight: 70, justifyContent: 'center' },
  phraseText: { fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  displayBox: { padding: 20, borderRadius: 16, borderWidth: 2, minHeight: 140, marginBottom: 20 },
  captionText: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  actionBtn: { height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.2 },
  btnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  navBar: { height: 75, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, position: 'absolute', bottom: 0, left: 0, right: 0 },
  navItem: { padding: 10 },
  navText: { fontSize: 12, fontWeight: 'bold' }
});
