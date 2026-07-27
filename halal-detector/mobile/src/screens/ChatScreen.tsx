import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Card, DisclaimerBanner, Field, LargeButton, Screen } from '../components/ui';
import { chatAsk } from '../services/api';
import { useApp, useSchool } from '../store/AppContext';

type Msg = { role: 'user' | 'assistant'; content: string };

export function ChatScreen() {
  const { colors, scale } = useApp();
  const school = useSchool();
  const [input, setInput] = useState('Why is gelatin haram?');
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: 'Ask about ingredients, foods, or rulings differences. I will note when answers depend on source or school.',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const res = await chatAsk(question, school);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `${res.answer}\n\n${res.disclaimer}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="AI Chat" subtitle="Educational answers in simple language.">
      <DisclaimerBanner />
      {messages.map((m, idx) => (
        <Card key={idx} style={{ backgroundColor: m.role === 'user' ? colors.primarySoft : colors.surface }}>
          <Text style={{ color: colors.tabInactive, fontSize: scale(13), marginBottom: 4 }}>
            {m.role === 'user' ? 'You' : 'Halal Detector'}
          </Text>
          <Text style={{ color: colors.text, fontSize: scale(17), lineHeight: 26 }}>{m.content}</Text>
        </Card>
      ))}
      <Field value={input} onChangeText={setInput} placeholder="Ask a question" />
      <LargeButton label={loading ? 'Thinking…' : 'Ask'} onPress={send} disabled={loading} />
      <View style={{ gap: 0 }}>
        {['Can Muslims eat microbial rennet?', 'What foods contain shellac?', 'What is E471?'].map((q) => (
          <LargeButton key={q} label={q} variant="secondary" onPress={() => setInput(q)} />
        ))}
      </View>
    </Screen>
  );
}
