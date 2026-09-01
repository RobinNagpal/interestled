import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import type { ReactElement } from "react";
import { useSeedMapInstructions } from "@interestled/api";
import { Input } from "@interestled/ui";
import {
  MAIN_HEADINGS_MAX,
  MAIN_HEADINGS_MIN,
  MAP_INSTRUCTIONS_MAX,
  MapDepth,
  MinutesPerDay,
  SUB_HEADINGS_MAX,
  SUB_HEADINGS_MIN,
  StudyDays,
} from "@interestled/schemas";
import type { MapShapeT } from "@interestled/schemas";
import { ChipRow } from "./ChipRow";

/** The numeric enums in order, for the chips. A numeric enum carries its names back too. */
function ladder<T extends number>(values: Record<string, string | number>): T[] {
  return Object.values(values)
    .filter((value): value is T => typeof value === "number")
    .sort((a, b) => a - b);
}

const MINUTES = ladder<MinutesPerDay>(MinutesPerDay);
const DAYS = ladder<StudyDays>(StudyDays);

const DEPTHS: { value: MapDepth; label: string }[] = [
  { value: MapDepth.Orientation, label: "Orientation" },
  { value: MapDepth.Working, label: "Working" },
  { value: MapDepth.Mechanism, label: "Mechanism" },
  { value: MapDepth.Internals, label: "Internals" },
  { value: MapDepth.Expert, label: "Expert" },
];

const DEPTH_BODY: Record<MapDepth, string> = {
  [MapDepth.Orientation]: "What it is, and when you would reach for it.",
  [MapDepth.Working]: "Enough to use it for the everyday cases.",
  [MapDepth.Mechanism]: "The mechanism underneath, in the field's own terms.",
  [MapDepth.Internals]: "The layer below that — internals, protocols, the maths.",
  [MapDepth.Expert]: "Edge cases, failure modes, and where the standard account is wrong.",
};

function counts(min: number, max: number): { value: string; label: string }[] {
  return Array.from({ length: max - min + 1 }, (_value, index) => ({
    value: String(min + index),
    label: String(min + index),
  }));
}

const DAY_LABEL: Record<StudyDays, string> = {
  [StudyDays.One]: "1 day",
  [StudyDays.Three]: "3 days",
  [StudyDays.Week]: "A week",
  [StudyDays.Fortnight]: "2 weeks",
  [StudyDays.Month]: "A month",
  [StudyDays.Quarter]: "3 months",
};

/**
 * How the map should be shaped, and the instruction lines those settings seed.
 *
 * The lines are the point of the screen. A pair of number chips is a setting
 * somebody has to imagine the effect of; "Use 5 main headings, and 4
 * sub-headings under each one" is a sentence they can disagree with, and the
 * sentence is what the model is actually sent. So the chips write the lines, and
 * the moment the learner edits the lines the chips stop touching them — the
 * settings can only say the things somebody thought to make a setting for, and
 * whatever they wrote instead is worth more than the seed.
 *
 * Same component on the create screen and in the rebuild sheet, because a
 * rebuild is the same decision made again with the last answers in the box.
 */
export function MapShapeFields({
  shape,
  onShape,
  instructions,
  onInstructions,
}: {
  shape: MapShapeT;
  onShape: (shape: MapShapeT) => void;
  instructions: string;
  onInstructions: (instructions: string) => void;
}): ReactElement {
  const seed = useSeedMapInstructions();
  // Whether the learner has typed in the box. Once true the chips never write to
  // it again, which is the whole of "text wins once edited".
  const edited = useRef(instructions.trim() !== "");
  // What the last seed was asked for, so a re-render does not re-ask for it.
  const asked = useRef<string>("");

  const key = JSON.stringify(shape);
  useEffect(() => {
    if (edited.current || asked.current === key) {
      return;
    }
    asked.current = key;
    // Keyed on the settings alone: the mutation and the callback are new objects
    // on every render, so depending on them would re-ask on every keystroke. A
    // failure is left alone — the box still holds the previous seed and the
    // settings are sent regardless, so the cost is a stale sentence.
    seed.mutate(shape, { onSuccess: onInstructions });
  }, [key]);

  const set = (patch: Partial<MapShapeT>): void => onShape({ ...shape, ...patch });

  return (
    <View className="gap-5">
      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-soft">How many main headings?</Text>
        <ChipRow
          options={counts(MAIN_HEADINGS_MIN, MAIN_HEADINGS_MAX)}
          selected={String(shape.mainHeadings)}
          onSelect={(value) => set({ mainHeadings: Number(value) })}
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-soft">And under each one?</Text>
        <ChipRow
          options={counts(SUB_HEADINGS_MIN, SUB_HEADINGS_MAX)}
          selected={String(shape.subHeadings)}
          onSelect={(value) => set({ subHeadings: Number(value) })}
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-soft">How long a sitting?</Text>
        <ChipRow
          options={MINUTES.map((value) => ({ value: String(value), label: `${value} min` }))}
          selected={String(shape.minutesPerDay)}
          onSelect={(value) => set({ minutesPerDay: Number(value) as MinutesPerDay })}
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-soft">Over how long?</Text>
        <ChipRow
          options={DAYS.map((value) => ({ value: String(value), label: DAY_LABEL[value] }))}
          selected={String(shape.days)}
          onSelect={(value) => set({ days: Number(value) as StudyDays })}
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-soft">How far into it?</Text>
        <ChipRow
          options={DEPTHS.map((entry) => ({ value: String(entry.value), label: entry.label }))}
          selected={String(shape.depth)}
          onSelect={(value) => set({ depth: Number(value) as MapDepth })}
        />
        <Text className="text-sm text-ink-soft">{DEPTH_BODY[shape.depth]}</Text>
      </View>

      <Input
        label="What the map will be built to"
        value={instructions}
        onChangeText={(text) => {
          edited.current = true;
          onInstructions(text);
        }}
        multiline
        maxLength={MAP_INSTRUCTIONS_MAX}
        hint="These are the words the model is given. Change any of them."
      />
    </View>
  );
}
