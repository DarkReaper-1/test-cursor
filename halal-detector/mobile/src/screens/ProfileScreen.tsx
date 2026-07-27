import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, DisclaimerBanner, Screen, SectionTitle } from '../components/ui';
import { useApp } from '../store/AppContext';
import { SCHOOL_LABELS, type ScholarSchool } from '../types/halal';

const SCHOOLS = Object.keys(SCHOOL_LABELS) as ScholarSchool[];

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  const { colors, scale } = useApp();
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ color: colors.text, fontSize: scale(18), flex: 1 }}>{label}</Text>
      <View
        style={{
          minWidth: 64,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 14,
          backgroundColor: value ? colors.primary : colors.surfaceMuted,
        }}
      >
        <Text style={{ color: value ? '#fff' : colors.textSecondary, fontSize: scale(16), textAlign: 'center' }}>
          {value ? 'On' : 'Off'}
        </Text>
      </View>
    </Pressable>
  );
}

export function ProfileScreen() {
  const { colors, scale, profile, updateProfile } = useApp();

  return (
    <Screen title="Profile" subtitle="Accessibility and scholarly standard.">
      <DisclaimerBanner />
      <Card>
        <SectionTitle>Islamic Scholar Mode</SectionTitle>
        <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginBottom: 12, lineHeight: 24 }}>
          Opinions can differ. The app will show differing views without declaring one universally correct.
        </Text>
        {SCHOOLS.map((school) => {
          const active = profile.school === school;
          return (
            <Pressable
              key={school}
              onPress={() => updateProfile({ school })}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 12,
                borderRadius: 14,
                marginBottom: 8,
                backgroundColor: active ? colors.primarySoft : colors.surfaceMuted,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontSize: scale(18), fontWeight: active ? '800' : '600' }}>
                {SCHOOL_LABELS[school]}
              </Text>
            </Pressable>
          );
        })}
      </Card>

      <Card>
        <SectionTitle>Accessibility</SectionTitle>
        <ToggleRow
          label="Dark mode"
          value={profile.dark_mode}
          onToggle={() => updateProfile({ dark_mode: !profile.dark_mode })}
        />
        <ToggleRow
          label="Voice reading"
          value={profile.voice_reading}
          onToggle={() => updateProfile({ voice_reading: !profile.voice_reading })}
        />
        <ToggleRow
          label="Color-blind friendly marks"
          value={profile.color_blind_friendly}
          onToggle={() => updateProfile({ color_blind_friendly: !profile.color_blind_friendly })}
        />
        <Text style={{ color: colors.text, fontSize: scale(18), marginTop: 16, marginBottom: 8 }}>Text size</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 1.15, 1.3, 1.45].map((size) => (
            <Pressable
              key={size}
              onPress={() => updateProfile({ text_scale: size })}
              style={{
                flex: 1,
                minHeight: 56,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: profile.text_scale === size ? colors.primary : colors.surfaceMuted,
              }}
            >
              <Text
                style={{
                  color: profile.text_scale === size ? '#fff' : colors.text,
                  fontSize: 16 + (size - 1) * 20,
                  fontWeight: '700',
                }}
              >
                A
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>Account</SectionTitle>
        <Text style={{ color: colors.textSecondary, fontSize: scale(16), lineHeight: 24 }}>
          Guest mode is enabled. Firebase Authentication can be connected for synced history and favorites across
          devices. Local data stays encrypted at rest via platform secure storage where configured.
        </Text>
      </Card>
    </Screen>
  );
}
