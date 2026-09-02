import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactElement } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useNodeAudio, useReadCardAloud } from "@interestled/api";
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
 * The first press is a model call and a synthesis — half a minute, and the most
 * expensive thing the product does — so the line under the button says so
 * before it is pressed. After that the recording is in the bucket and a press
 * is a download.
 */
export function CardAudio({ nodeId }: { nodeId: string }): ReactElement {
  const audio = useNodeAudio(nodeId);
  const read = useReadCardAloud(nodeId);
  // One player for the life of this card, fed by `replace` rather than by a
  // source prop. useAudioPlayer builds a new player whenever the source it is
  // given changes and releases the old one — so passing state into it and
  // calling replace() as well would tear down the player mid-press, and the
  // press that started the audio would be the one that stopped it.
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  // What is loaded, which is not simply the URL the query holds: that link is
  // signed and expires in an hour, so the query is asked again on every mount
  // and every return to the foreground and answers with a new one each time.
  // Reloading on each of those would lose the position on the very trip that
  // was meant to keep it.
  const [loaded, setLoaded] = useState<string | null>(null);

  // The screen keeps the card on screen while the next one loads, so this can
  // be handed a different node without unmounting. The last node's recording
  // must not still be playing over this one's card.
  useEffect(() => {
    return () => {
      player.pause();
      setLoaded(null);
    };
  }, [nodeId, player]);

  const play = (url: string): void => {
    player.replace(url);
    player.play();
    setLoaded(url);
  };

  const press = (): void => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (loaded !== null) {
      // At the end the head is already past everything, and pressing play does
      // nothing at all — which reads as a broken button rather than a finished
      // one. So it starts again.
      if (status.didJustFinish || status.currentTime >= status.duration) {
        void player.seekTo(0);
      }
      player.play();
      return;
    }
    const existing = audio.data ?? null;
    if (existing !== null) {
      play(existing.url);
      return;
    }
    read.mutate(undefined, { onSuccess: (made) => play(made.url) });
  };

  const recorded = audio.data ?? null;
  // The stored length until there is a file to ask, because the button says how
  // long before anything has been downloaded.
  const seconds = loaded === null ? (recorded?.seconds ?? 0) : Math.round(status.duration);
  // Downloading is a wait too, and a shorter one than making it — but a button
  // that does nothing for four seconds is the same button either way.
  const busy = read.isPending || (loaded !== null && !status.isLoaded) || status.isBuffering;

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
          <Text className="text-sm font-medium text-ink">{title(recorded !== null, read.isPending, status.playing)}</Text>
          <Text className="text-xs text-ink-soft">
            {note(recorded !== null, read.isPending, seconds, status.currentTime, status.playing)}
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
 * The line under the button. It says one thing at a time, and the thing it says
 * is whatever the reader has not been told yet: what the press will cost before
 * it is pressed, how long the recording runs once there is one, and where it has
 * got to while it plays.
 */
function note(
  recorded: boolean,
  making: boolean,
  seconds: number,
  currentTime: number,
  playing: boolean,
): string {
  if (making) {
    return "Writing what to say, then saying it. About half a minute.";
  }
  if (!recorded) {
    return "Someone explaining the card, not reading it out. Half a minute to make, once.";
  }
  if (playing) {
    return `${clock(currentTime)} of ${clock(seconds)}`;
  }
  return seconds > 0 ? `${clock(seconds)} long` : "Ready to play";
}
