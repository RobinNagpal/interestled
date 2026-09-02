import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactElement } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useNodeAudio, useReadCardAloud } from "@interestled/api";
import { isLoadedRecordingCurrent } from "@interestled/domain";
import type { LoadedRecording } from "@interestled/domain";
import type { NodeAudioT, CardSettingsT } from "@interestled/schemas";
import { ErrorState } from "@interestled/ui";
import { messageOf } from "../lib/errors";

/**
 * The card, read out.
 *
 * It sits under the claim rather than at the bottom, because listening instead
 * of reading is a decision somebody makes before they start rather than after
 * they have given up. Everything else about it is deliberately small: one
 * button, what it will cost beside it, and nothing that has to be understood
 * before it can be pressed.
 *
 * The first press is a model call and a synthesis, so the line under the button
 * says roughly how long before it is pressed. After that the recording is in the
 * bucket and a press is a download.
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
  // A recording takes half a minute to make, which is long enough to leave the
  // card. React Query still runs this call's onSuccess, and playing through a
  // player expo-audio released on unmount is a native error.
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
    };
  }, [nodeId, player]);

  const load = (made: NodeAudioT): void => {
    player.replace(made.url);
    player.play();
    setLoaded({ madeAt: made.madeAt.getTime(), expiresAt: made.expiresAt.getTime() });
  };

  const recorded = audio.data ?? null;
  // Whether pressing play should resume what is loaded or fetch it again. The
  // rule is in the domain package rather than here because getting it wrong
  // reads the wrong card out at somebody — see isLoadedRecordingCurrent.
  const current = isLoadedRecordingCurrent(loaded, recorded);

  const press = (): void => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (current) {
      // At the end the head is already past everything, and pressing play does
      // nothing at all — which reads as a broken button rather than a finished
      // one. So it starts again.
      if (status.didJustFinish || status.currentTime >= status.duration) {
        void player.seekTo(0);
      }
      player.play();
      return;
    }
    if (recorded !== null) {
      load(recorded);
      return;
    }
    read.mutate(undefined, {
      onSuccess: (made) => {
        if (alive.current) {
          load(made);
        }
      },
    });
  };

  // The stored length until there is a file to ask, because the button says how
  // long before anything has been downloaded.
  const seconds = current ? Math.round(status.duration) : (recorded?.seconds ?? 0);
  // Buffering is deliberately not in here. It goes true whenever the player is
  // waiting on the next stretch of an 11 MB file, which on mobile data is most
  // of the playback — and a disabled button then is a pause control that cannot
  // be pressed for the length of the recording.
  const busy = read.isPending || (loaded !== null && !status.isLoaded);

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3 rounded-card bg-surface-sunken p-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            status.playing
              ? "Pause"
              : recorded === null
                ? "Read this card out loud"
                : "Play this card"
          }
          disabled={busy || audio.isPending}
          onPress={press}
          className="h-10 w-10 items-center justify-center rounded-full bg-accent"
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-base text-white">{status.playing ? "❚❚" : "▶"}</Text>
          )}
        </Pressable>
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-medium text-ink">
            {title(recorded !== null, read.isPending, status.playing)}
          </Text>
          <Text className="text-xs text-ink-soft">
            {note({
              recorded: recorded !== null,
              making: read.isPending,
              minutes: settings.minutes,
              seconds,
              currentTime: status.currentTime,
              playing: status.playing,
            })}
          </Text>
        </View>
      </View>
      {read.isError ? <ErrorState message={messageOf(read.error)} /> : null}
    </View>
  );
}

function title(recorded: boolean, making: boolean, playing: boolean): string {
  if (making) {
    return "Reading it out…";
  }
  if (playing) {
    return "Playing";
  }
  return recorded ? "Listen again" : "Listen to this card";
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
  return minutes <= 3 ? "about half a minute" : `up to a minute or two for a ${minutes}-minute card`;
}

/**
 * The line under the button. It says one thing at a time, and the thing it says
 * is whatever the reader has not been told yet: what the press will cost before
 * it is pressed, how long the recording runs once there is one, and where it has
 * got to while it plays.
 */
function note(state: {
  recorded: boolean;
  making: boolean;
  minutes: number;
  seconds: number;
  currentTime: number;
  playing: boolean;
}): string {
  if (state.making) {
    return `Writing what to say, then saying it. ${sentenceCase(wait(state.minutes))}.`;
  }
  if (!state.recorded) {
    return `Someone explaining the card, not reading it out. Made once, in ${wait(state.minutes)}.`;
  }
  if (state.playing) {
    return `${clock(state.currentTime)} of ${clock(state.seconds)}`;
  }
  return state.seconds > 0 ? `${clock(state.seconds)} long` : "Ready to play";
}

function sentenceCase(text: string): string {
  return `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;
}
