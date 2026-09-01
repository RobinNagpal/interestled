import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Input } from "@interestled/ui";

/**
 * A box of instruction lines that the settings above it write, until the learner
 * writes in it themselves.
 *
 * Both halves of the product work this way — the map's shape seeds the lines the
 * map is built from, and the paragraph length seeds the lines a card is written
 * to — so the rule lives once. It is a rule with two easy ways to get it subtly
 * wrong, which is the other reason not to have two copies of it: re-seeding over
 * something somebody typed, and leaving the box showing a sentence the model is
 * no longer being sent.
 *
 * `input` is whatever the seed is rendered from. It is compared by value, so a
 * parent that rebuilds the object every render still asks only when a setting
 * actually moves.
 */
export function SeededInstructions<TInput>({
  input,
  seed,
  value,
  onChange,
  label,
  hint,
  maxLength,
}: {
  input: TInput;
  /** Renders the seed server-side, from the same prompt file the model is sent. */
  seed: (input: TInput, onSeeded: (text: string) => void) => void;
  value: string;
  onChange: (text: string) => void;
  label: string;
  hint: string;
  maxLength: number;
}): ReactElement {
  const seeded = useSeededText(input, seed);
  // Whether the learner has typed in here. Once true the settings never write to
  // it again — they can only say the things somebody thought to make a setting
  // for, and whatever was written instead is worth more than the seed.
  const edited = useRef(value.trim() !== "");

  useEffect(() => {
    if (!edited.current && seeded !== "") {
      onChange(seeded);
    }
    // On the seed alone: onChange is a new function every render, and depending
    // on it would write back on every keystroke.
  }, [seeded]);

  return (
    <Input
      label={label}
      value={value}
      onChangeText={(text) => {
        edited.current = true;
        onChange(text);
      }}
      multiline
      maxLength={maxLength}
      hint={hint}
    />
  );
}

/**
 * The seed for these settings, re-asked when they move and not before.
 *
 * Separate from the box because one screen pre-fills with it and the other shows
 * it beside an empty box as "the default, in force now". Both need the same two
 * things to be right: ask once per setting, and never apply the answer to a
 * question that is no longer being asked.
 */
export function useSeededText<TInput>(
  input: TInput,
  seed: (input: TInput, onSeeded: (text: string) => void) => void,
): string {
  const [text, setText] = useState("");
  // What the last seed was asked for, so a re-render does not re-ask for it.
  const asked = useRef<string>("");

  const key = JSON.stringify(input);
  useEffect(() => {
    if (asked.current === key) {
      return;
    }
    asked.current = key;
    seed(input, (next) => {
      // Two quick changes are two calls, and the second can land first. Taking
      // only the one still being asked for is what stops the text settling on a
      // sentence for a setting the learner has already moved past.
      if (asked.current === key) {
        setText(next);
      }
    });
    // Keyed on the settings alone: `seed` is a new function on every render.
  }, [key]);

  return text;
}
