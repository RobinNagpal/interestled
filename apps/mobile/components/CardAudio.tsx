import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactElement } from "react";
import Slider from "@react-native-community/slider";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useNodeAudio, useReadCardAloud } from "@interestled/api";
import { isLoadedRecordingCurrent } from "@interestled/domain";
import type { LoadedRecording } from "@interestled/domain";
import { NarrationStatus } from "@interestled/schemas";
import type { CardSettingsT, NodeAudioReadyT } from "@interestled/schemas";
import { ErrorState } from "@interestled/ui";
import { messageOf } from "../lib/errors";

/** How far the two skip controls move. The podcast default, and it is muscle memory. */
const SKIP_SECONDS = 15;

/**
 * The speeds the one speed control cycles through, starting at normal.
 *
 * A cycle rather than a menu: a menu is a second surface to open on a control
 * most people press once, and five values fit in a button that says which one
 * it is on. Slower is in the list because this is an explanation — going back
 * over a dense minute at 0.75 is as real a need as skimming at 2.
 */
const RATES = [1, 1.25, 1.5, 2, 0.75] as const;

/** The palette's own colours. Slider takes props, not classes. */
const TRACK_DONE = "#059669";
const TRACK_LEFT = "#d1d5db";

/**
 * The card, read out.
 *
 * It sits under the claim rather than at the bottom, because listening instead
 * of reading is a decision somebody makes before they start rather than after
 * they have given up.
 *
 * The button says where the recording stands by its colour: accent when there
 * is none and pressing makes one, green when there is one to play, red when the
 * last attempt failed and the reason is underneath. Making one takes a minute or
 * two and happens on the server after the press is answered, so the app polls
 * until the row settles — see useNodeAudio.
 */
export function CardAudio({
  nodeId,
  settings,
}: {
  nodeId: string;
  /**
   * What the card on screen was written to. It is what names the recording:
   * a node has one per card, and the button is on exactly one of them.
   */
  settings: CardSettingsT;
}): ReactElement {
  const audio = useNodeAudio(nodeId, settings);
  const read = useReadCardAloud(nodeId, settings);
  // One player for the life of this card, fed by `replace` rather than by a
  // source prop. useAudioPlayer builds a new player whenever the source it is
  // given changes and releases the old one — so passing state into it and
  // calling replace() as well would tear down the player mid-press, and the
  // press that started the audio would be the one that stopped it.
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const [loaded, setLoaded] = useState<LoadedRecording | null>(null);
  // Where the thumb is while a finger is on it. The status keeps reporting the
  // real position four times a second, and letting that drive the slider during
  // a drag makes the thumb fight the finger.
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [rate, setRate] = useState<number>(RATES[0]);
  // Whether the press that started the run being waited on happened here. A
  // recording takes a minute or two, which is long enough to leave the card;
  // React Query still delivers the result, and playing through a player
  // expo-audio released on unmount is a native error.
  const started = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // The screen keeps the card on screen while the next one loads, so this can
  // be handed a different node without unmounting. The last node's recording
  // must not still be playing over this one's card.
  useEffect(() => {
    return () => {
      player.pause();
      setLoaded(null);
      setScrubbing(null);
      started.current = false;
    };
  }, [nodeId, player]);

  const recorded = audio.data ?? null;
  const ready = recorded?.status === NarrationStatus.Ready ? recorded : null;
  // Whether pressing play should resume what is loaded or fetch it again. The
  // rule is in the domain package rather than here because getting it wrong
  // reads the wrong card out at somebody — see isLoadedRecordingCurrent.
  const current = isLoadedRecordingCurrent(loaded, recorded);

  const load = (made: NodeAudioReadyT): void => {
    player.replace(made.url);
    // A new source starts at normal speed, so the choice has to be re-applied
    // or the control silently springs back on every reload.
    player.setPlaybackRate(rate, "high");
    player.play();
    setLoaded({ madeAt: made.madeAt.getTime(), expiresAt: made.expiresAt.getTime() });
  };

  // The run finished while this card was still on screen, and it was this press
  // that started it. Attempted rather than assumed: a browser may refuse to play
  // outside the gesture that asked, and the green button behind this is the
  // answer when it does.
  useEffect(() => {
    if (ready !== null && started.current && alive.current) {
      started.current = false;
      load(ready);
    }
    // Keyed on the recording's identity alone: this must run when one arrives
    // and never again for the same one, and every poll while it is being made
    // hands back a new object that is otherwise identical.
  }, [ready?.madeAt.getTime()]);

  const press = (): void => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (current && ready !== null) {
      // At the end the head is already past everything, and pressing play does
      // nothing at all — which reads as a broken button rather than a finished
      // one. So it starts again.
      if (status.didJustFinish || status.currentTime >= status.duration) {
        void player.seekTo(0);
      }
      player.play();
      return;
    }
    if (ready !== null) {
      load(ready);
      return;
    }
    started.current = true;
    read.mutate();
  };

  const skip = (by: number): void => {
    const to = Math.max(0, Math.min(status.currentTime + by, status.duration));
    void player.seekTo(to);
  };

  const cycleRate = (): void => {
    const next = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length] ?? 1;
    setRate(next);
    player.setPlaybackRate(next, "high");
  };

  const pending = recorded?.status === NarrationStatus.Pending;
  // The stored length until there is a file to ask, so the bar says how long the
  // recording runs before anything has been downloaded.
  const seconds = current && status.duration > 0 ? status.duration : (ready?.seconds ?? 0);
  const at = scrubbing ?? (current ? status.currentTime : 0);
  // Buffering is deliberately not in here. It goes true whenever the player is
  // waiting on the next stretch of an 11 MB file, which on mobile data is most
  // of the playback — and a disabled button then is a pause control that ignores
  // taps.
  const busy = read.isPending || pending || (loaded !== null && !status.isLoaded);

  return (
    <View className="gap-2">
      <View className="gap-3 rounded-card bg-surface-sunken p-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label(status.playing, recorded?.status)}
            disabled={busy || audio.isPending}
            onPress={press}
            className={`h-10 w-10 items-center justify-center rounded-full ${tone(recorded?.status)}`}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-base text-white">{status.playing ? "❚❚" : "▶"}</Text>
            )}
          </Pressable>
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-medium text-ink">
              {title(recorded?.status, status.playing)}
            </Text>
            <Text className="text-xs text-ink-soft">
              {note({
                status: recorded?.status,
                minutes: settings.minutes,
                seconds,
                playing: status.playing,
              })}
            </Text>
          </View>
        </View>

        {/* Only once there is something to move through. Before that the bar
            would be a control over nothing, and after a failure the row below
            is the error rather than a scrubber. */}
        {ready === null ? null : (
          <View className="gap-1">
            <Slider
              value={at}
              minimumValue={0}
              maximumValue={Math.max(seconds, 1)}
              // Nothing to seek in until the file is loaded. The bar is still
              // drawn, because "how long is this" is a question worth answering
              // before pressing play.
              disabled={!current}
              onSlidingStart={setScrubbing}
              onValueChange={(value) => (scrubbing === null ? undefined : setScrubbing(value))}
              onSlidingComplete={(value) => {
                void player.seekTo(value);
                setScrubbing(null);
              }}
              minimumTrackTintColor={TRACK_DONE}
              maximumTrackTintColor={TRACK_LEFT}
              thumbTintColor={TRACK_DONE}
              accessibilityLabel="Position in the recording"
              style={{ width: "100%", height: 28 }}
            />
            <View className="flex-row items-center justify-between">
              <Text className="text-xs tabular-nums text-ink-soft">{clock(at)}</Text>
              <Text className="text-xs tabular-nums text-ink-soft">{clock(seconds)}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <SmallButton
                label={`−${SKIP_SECONDS}s`}
                hint={`Back ${SKIP_SECONDS} seconds`}
                disabled={!current}
                onPress={() => skip(-SKIP_SECONDS)}
              />
              <SmallButton
                label={`+${SKIP_SECONDS}s`}
                hint={`Forward ${SKIP_SECONDS} seconds`}
                disabled={!current}
                onPress={() => skip(SKIP_SECONDS)}
              />
              <View className="flex-1" />
              <SmallButton
                label={`${rate}×`}
                hint={`Speed: ${rate} times. Press to change.`}
                onPress={cycleRate}
              />
            </View>
          </View>
        )}
      </View>

      {/* Two different failures, and they are not the same thing. One is the
          recording that stopped, which the row above is already red about; the
          other is the press itself not landing. */}
      {recorded?.status === NarrationStatus.Failed ? (
        <ErrorState message={recorded.error} />
      ) : null}
      {read.isError ? <ErrorState message={messageOf(read.error)} /> : null}
    </View>
  );
}

/** A control small enough to sit under the bar without competing with the button. */
function SmallButton({
  label,
  hint,
  disabled = false,
  onPress,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      disabled={disabled}
      onPress={onPress}
      className={`rounded-full border border-line-strong px-3 py-1 ${disabled ? "opacity-40" : ""}`}
    >
      <Text className="text-xs tabular-nums text-ink">{label}</Text>
    </Pressable>
  );
}

/**
 * The button's colour, which is the whole of what it says at a glance: accent
 * when pressing it makes a recording, green when there is one, red when the last
 * attempt stopped and the reason is underneath.
 */
function tone(status: NarrationStatus | undefined): string {
  switch (status) {
    case NarrationStatus.Ready:
      return "bg-good";
    case NarrationStatus.Failed:
      return "bg-bad";
    case NarrationStatus.Pending:
    case undefined:
      return "bg-accent";
  }
}

function label(playing: boolean, status: NarrationStatus | undefined): string {
  if (playing) {
    return "Pause";
  }
  switch (status) {
    case NarrationStatus.Ready:
      return "Play this card";
    case NarrationStatus.Pending:
      return "Still being read out";
    case NarrationStatus.Failed:
      return "Try reading this card out again";
    case undefined:
      return "Read this card out loud";
  }
}

function title(status: NarrationStatus | undefined, playing: boolean): string {
  if (status === NarrationStatus.Pending) {
    return "Reading it out…";
  }
  if (playing) {
    return "Playing";
  }
  switch (status) {
    case NarrationStatus.Ready:
      return "Listen to this card";
    case NarrationStatus.Failed:
      return "That did not finish";
    case undefined:
      return "Listen to this card";
  }
}

/** Minutes and seconds, the way a player writes them. */
function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Roughly how long making one takes, which is not a constant: the script is a
 * model call and the synthesis is minutes of speech, so a ten-minute card is a
 * long wait where a three-minute one is not. W3 only works while the estimates
 * are true, so this scales with the card rather than always saying half a
 * minute.
 */
function wait(minutes: number): string {
  return minutes <= 3 ? "about half a minute" : `a minute or two for a ${minutes}-minute card`;
}

/**
 * The line under the title. It says one thing at a time, and the thing it says
 * is whatever the reader has not been told yet: what the press will cost before
 * it is pressed, and how long the recording runs once there is one.
 */
function note(state: {
  status: NarrationStatus | undefined;
  minutes: number;
  seconds: number;
  playing: boolean;
}): string {
  switch (state.status) {
    case NarrationStatus.Pending:
      return `Writing what to say, then saying it. It keeps going if you read on — ${wait(state.minutes)}.`;
    case NarrationStatus.Failed:
      return "Nothing was kept. Pressing play starts it again.";
    case NarrationStatus.Ready:
      return state.playing ? "Someone explaining the card, not reading it out." : "Ready to play.";
    case undefined:
      return `Someone explaining the card, not reading it out. Made once, in ${wait(state.minutes)}.`;
  }
}
