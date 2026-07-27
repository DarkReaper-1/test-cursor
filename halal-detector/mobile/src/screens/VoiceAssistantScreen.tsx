import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Card, DisclaimerBanner, Field, LargeButton, Loading, Screen } from '../components/ui';
import { voiceAsk } from '../services/api';
import { useApp, useSchool } from '../store/AppContext';

const EXAMPLES = ['Can I eat marshmallows?', 'What is E471?', 'Is vanilla extract halal?'];

export function VoiceAssistantScreen() {
  const { colors, scale, profile } = useApp();
  const school = useSchool();
  const [transcript, setTranscript] = useState('Can I eat marshmallows?');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async (text: string) => {
    setLoading(true);
    try {
      const res = await voiceAsk(text, school);
      setAnswer(res.detailed_answer);
      if (profile.voice_reading) {
        Speech.speak(res.spoken_answer, { rate: 0.9 });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Voice Assistant" subtitle="Press the button and ask in simple words.">
      <DisclaimerBanner />
      <Card>
        <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginBottom: 10, lineHeight: 24 }}>
          On a phone, the microphone captures speech. Here you can type or use a sample question; the answer is spoken
          aloud.
        </Text>
        <Field value={transcript} onChangeText={setTranscript} placeholder="Your question" />
        {loading ? (
          <Loading label="Listening / answering…" />
        ) : (
          <LargeButton label="Ask Microphone Question" onPress={() => ask(transcript)} />
        )}
      </Card>
      {EXAMPLES.map((ex) => (
        <LargeButton
          key={ex}
          label={ex}
          variant="secondary"
          onPress={() => {
            setTranscript(ex);
            ask(ex);
          }}
        />
      ))}
      {!!answer && (
        <Card>
          <Text style={{ color: colors.text, fontSize: scale(18), fontWeight: '700', marginBottom: 8 }}>Answer</Text>
          <Text style={{ color: colors.textSecondary, fontSize: scale(17), lineHeight: 26 }}>{answer}</Text>
          <LargeButton label="Read Again" variant="secondary" onPress={() => Speech.speak(answer, { rate: 0.9 })} />
        </Card>
      )}
    </Screen>
  );
}
