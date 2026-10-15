import type { Icon } from "phosphor-react-native";
import { MoonIcon } from "phosphor-react-native/src/icons/Moon";
import { SunIcon } from "phosphor-react-native/src/icons/Sun";
import { SunHorizonIcon } from "phosphor-react-native/src/icons/SunHorizon";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/button";
import { tapHaptic } from "@/lib/haptics";
import { useThemeColors } from "@/theme/colors";

import {
  quranAmounts,
  quranReadingOptions,
  suggestedAmount,
  translations,
} from "../data";
import { useFlow } from "../flow";
import { StepLayout } from "../shell";
import type { QuranGoal, QuranKnown, QuranReading, QuranTime } from "../types";
import { Chips, OptionList } from "../ui/options";

export function QuranReadingStep() {
  const { answers, set, next } = useFlow();
  return (
    <StepLayout
      cue={{
        expression: answers.quranReading ? "gentle" : "listening",
        say: "How comfortable are you reading the Quran in Arabic?",
        hint: "Wherever you are is a good place to start.",
      }}
      footer={
        <Button
          label="Continue"
          onPress={next}
          disabled={!answers.quranReading}
        />
      }
    >
      <OptionList<QuranReading>
        tone="quran"
        value={answers.quranReading}
        onChange={(quranReading) => set({ quranReading })}
        options={quranReadingOptions.map((o) => ({
          id: o.id,
          label: o.label,
          detail: o.detail,
        }))}
      />
    </StepLayout>
  );
}

export function Translation() {
  const { answers, set, next } = useFlow();
  return (
    <StepLayout
      cue={{
        expression: "happy",
        say: "Which English translation would you like?",
        hint: "It shows alongside the Arabic. Switch any time while reading.",
      }}
      footer={<Button label="Continue" onPress={next} />}
    >
      <OptionList
        tone="quran"
        suggested="saheeh"
        value={answers.translation}
        onChange={(translation) => set({ translation })}
        options={translations.map((t) => ({
          id: t.id,
          label: t.name,
          detail: "by" in t ? `${t.by}. ${t.style}` : t.style,
        }))}
      />
    </StepLayout>
  );
}

export function QuranGoals() {
  const { answers, set, next } = useFlow();
  return (
    <StepLayout
      cue={{
        expression: answers.quranGoals.length ? "delighted" : "curious",
        say: "What would you like to do with the Quran?",
        hint: "Pick any. I’ll ask a little more about the ones you choose.",
      }}
      footer={
        <Button
          label={answers.quranGoals.length ? "Continue" : "Decide later"}
          onPress={next}
        />
      }
    >
      <Chips<QuranGoal>
        tone="quran"
        value={answers.quranGoals}
        onChange={(quranGoals) => set({ quranGoals })}
        options={[
          { id: "read", label: "Read regularly" },
          { id: "memorise", label: "Memorise" },
          { id: "revise", label: "Revise what I know" },
          { id: "understand", label: "Understand the meaning" },
        ]}
      />
    </StepLayout>
  );
}

export function QuranAmount() {
  const { answers, set, next } = useFlow();
  const suggested = suggestedAmount(answers.practice);
  return (
    <StepLayout
      cue={{
        expression: answers.quranAmount ? "happy" : "thinking",
        say: "How much would you like to read each day?",
        hint: "A little you keep up beats a lot you don’t.",
      }}
      footer={
        <Button
          label="Continue"
          onPress={next}
          disabled={!answers.quranAmount}
        />
      }
    >
      <OptionList
        tone="quran"
        suggested={suggested}
        value={answers.quranAmount}
        onChange={(quranAmount) => set({ quranAmount })}
        options={quranAmounts}
      />
    </StepLayout>
  );
}

export function QuranKnownStep() {
  const { answers, set, next } = useFlow();
  return (
    <StepLayout
      cue={{
        expression: answers.quranKnown ? "happy" : "curious",
        say: "What do you already know by heart?",
        hint: "Just a starting point. You’ll pick exact surahs later.",
      }}
      footer={
        <Button
          label="Continue"
          onPress={next}
          disabled={!answers.quranKnown}
        />
      }
    >
      <OptionList<QuranKnown>
        tone="quran"
        value={answers.quranKnown}
        onChange={(quranKnown) => set({ quranKnown })}
        options={[
          { id: "nothing", label: "Nothing yet" },
          { id: "short-surahs", label: "A few short surahs" },
          { id: "juz-amma", label: "Most of Juz Amma" },
          { id: "several-juz", label: "Several juz" },
          { id: "whole", label: "The whole Quran" },
        ]}
      />
    </StepLayout>
  );
}

const TIMES: { id: QuranTime; label: string; icon: Icon }[] = [
  { id: "after-fajr", label: "After Fajr", icon: SunHorizonIcon },
  { id: "day", label: "During the day", icon: SunIcon },
  { id: "after-maghrib", label: "After Maghrib", icon: SunHorizonIcon },
  { id: "before-sleep", label: "Before sleep", icon: MoonIcon },
];

export function QuranTimeStep() {
  const { answers, set, next } = useFlow();
  const colors = useThemeColors();
  const pick = (quranTime: QuranTime) => {
    tapHaptic();
    set({ quranTime });
  };
  return (
    <StepLayout
      fill={330}
      cue={{
        expression: answers.quranTime ? "happy" : "curious",
        say: "When suits you best for Quran?",
      }}
      footer={
        <Button label="Continue" onPress={next} disabled={!answers.quranTime} />
      }
    >
      <View accessibilityRole="radiogroup" className="flex-1 gap-3">
        {[TIMES.slice(0, 2), TIMES.slice(2)].map((row, r) => (
          <View key={r} className="flex-1 flex-row gap-3">
            {row.map(({ id, label, icon: TimeIcon }) => {
              const selected = answers.quranTime === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                  onPress={() => pick(id)}
                  className={`min-h-[96px] flex-1 items-center justify-center gap-3 rounded-card border-2 p-3 active:opacity-80 ${
                    selected
                      ? "border-quran bg-quran-soft"
                      : "border-transparent bg-surface"
                  }`}
                >
                  <TimeIcon
                    size={40}
                    weight="fill"
                    color={selected ? colors.quranText : colors.inkSubtle}
                  />
                  <Text
                    className={`text-center text-title ${selected ? "font-heading text-ink" : "font-medium text-ink-muted"}`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: answers.quranTime === "any" }}
        onPress={() => pick("any")}
        className={`mt-3 min-h-[56px] items-center justify-center rounded-full border-2 px-6 active:opacity-80 ${
          answers.quranTime === "any"
            ? "border-quran bg-quran-soft"
            : "border-line"
        }`}
      >
        <Text className="font-medium text-body text-ink">No fixed time</Text>
      </Pressable>
    </StepLayout>
  );
}
