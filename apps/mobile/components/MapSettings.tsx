import { Text, View } from "react-native";
import type { ReactElement } from "react";
import { useSeedMapInstructions } from "@interestled/api";
import { Disclosure, mapShapeRows, mapShapeSummary } from "@interestled/ui";
import { mapShapeOf } from "@interestled/schemas";
import type { MapShapeT, TopicT } from "@interestled/schemas";
import { useSeededText } from "./SeededInstructions";

/**
 * What this map was built to, folded away above the map itself.
 *
 * The shape settings and the instruction lines are saved before every build, so
 * these are the answers this map came from rather than a guess at them — and
 * they are the one part of a generated map that says why it looks the way it
 * does. Someone reading a map that is nearly right needs them before they can
 * say what to change, and the alternative is opening the rebuild sheet to find
 * out, which is the sheet that replaces the map.
 *
 * Closed by default, with the shape on the closed row: the map is what the
 * screen is for, and a settings panel sitting open above it pushes the thing
 * being edited off the top.
 */
export function MapSettings({ topic }: { topic: TopicT }): ReactElement {
  const shape = mapShapeOf(topic);

  return (
    <Disclosure title="What this map was built to" summary={mapShapeSummary(shape)}>
      <View className="gap-3">
        {mapShapeRows(shape).map((row) => (
          <View key={row.label} className="gap-0.5">
            <View className="flex-row items-baseline justify-between gap-3">
              <Text className="text-sm text-ink-soft">{row.label}</Text>
              <Text className="text-sm font-medium text-ink">{row.value}</Text>
            </View>
            {row.body === undefined ? null : (
              <Text className="text-xs text-ink-faint">{row.body}</Text>
            )}
          </View>
        ))}
      </View>

      <View className="gap-2 rounded-card border border-line bg-surface-raised p-3">
        <Text className="text-sm font-medium text-ink-soft">The lines the model was given</Text>
        <MapInstructions topic={topic} shape={shape} />
      </View>

      <Text className="text-xs text-ink-faint">
        These change when the map is built again, and nothing else on this screen touches them. The
        goal, what you already knew, and how it is written are read by a build too — those are on
        the other two edit screens.
      </Text>
    </Disclosure>
  );
}

/**
 * The instructions this map was built from: what the learner wrote, or the
 * lines the shape seeds when they wrote nothing.
 *
 * `mapInstructions` is "" until the learner edits it, so the stored column shown
 * raw would be blank on most topics — and blank is the one thing that is not
 * true, because the seed is what the build actually sent. The seed is rendered
 * server-side from the same prompt file the model is given, which is why it is a
 * request rather than a string built here.
 *
 * Split in two so the request happens only where it is needed: a topic whose
 * lines were written by hand asks for nothing, and neither does a closed
 * disclosure, which never mounts either of these.
 */
function MapInstructions({ topic, shape }: { topic: TopicT; shape: MapShapeT }): ReactElement {
  if (topic.mapInstructions.trim() !== "") {
    return <Lines text={topic.mapInstructions} note="You wrote these." />;
  }
  return <SeededLines shape={shape} />;
}

function SeededLines({ shape }: { shape: MapShapeT }): ReactElement {
  const seed = useSeedMapInstructions();
  const seeded = useSeededText(shape, (next, onSeeded) =>
    seed.mutate(next, { onSuccess: onSeeded }),
  );

  if (seeded === "") {
    return (
      <Text className="text-sm text-ink-faint">
        {seed.isError ? "These could not be loaded." : "Reading them…"}
      </Text>
    );
  }
  return <Lines text={seeded} note="Written from the settings above. Rebuild to change them." />;
}

function Lines({ text, note }: { text: string; note: string }): ReactElement {
  return (
    <>
      <Text className="text-sm text-ink-soft">{text}</Text>
      <Text className="text-xs text-ink-faint">{note}</Text>
    </>
  );
}
