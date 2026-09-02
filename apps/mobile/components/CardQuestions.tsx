import { useState } from "react";
import { View } from "react-native";
import type { ReactElement } from "react";
import { useAskQuestion, useQuestions } from "@interestled/api";
import {
  Button,
  Disclosure,
  ErrorState,
  Input,
  Markdown,
  SectionTitle,
  Sheet,
} from "@interestled/ui";
import { QUESTION_MAX } from "@interestled/schemas";
import { messageOf } from "../lib/errors";

/**
 * Asking about a card, in two halves that live in two places.
 *
 * The list belongs in the card's own scroll, under the writing it is about. The
 * sheet belongs to the screen, because the button that opens it is in the top
 * bar — and a sheet rendered inside the card is a sheet that does not exist
 * while the card is still being written, which is a bar button that silently
 * does nothing for the twenty seconds a first open takes, and then opens by
 * itself once the card lands.
 *
 * Both read the same query, so they are one thing to the cache and two only on
 * the screen.
 */

/** What was asked on this card, each answer folded behind the question that got it. */
export function QuestionList({
  nodeId,
  /** The one just asked, which opens on arrival. */
  latestId,
}: {
  nodeId: string;
  latestId: string | null;
}): ReactElement | null {
  const questions = useQuestions(nodeId);
  const asked = questions.data ?? [];
  if (asked.length === 0) {
    return null;
  }
  return (
    <View className="gap-2">
      <SectionTitle>What you asked</SectionTitle>
      {asked.map((entry) => (
        <Disclosure key={entry.id} title={entry.question} defaultOpen={entry.id === latestId}>
          <Markdown text={entry.answer} />
        </Disclosure>
      ))}
    </View>
  );
}

/**
 * The box that asks the next one. Answered against the card the node has, so it
 * works while the card is still being written — the server writes that card
 * once and answers against it, rather than the press being refused for arriving
 * during the wait.
 */
export function AskSheet({
  nodeId,
  visible,
  onClose,
  onAnswered,
}: {
  nodeId: string;
  visible: boolean;
  onClose: () => void;
  onAnswered: (id: string) => void;
}): ReactElement {
  const ask = useAskQuestion(nodeId);
  const [question, setQuestion] = useState("");

  return (
    <Sheet
      visible={visible}
      title="Ask about this card"
      body="One paragraph back, written the way this card is. It is kept here with the card."
      onClose={() => (ask.isPending ? undefined : onClose())}
    >
      <Input
        label="Your question"
        value={question}
        onChangeText={setQuestion}
        multiline
        autoFocus
        maxLength={QUESTION_MAX}
        placeholder={"Why does that happen?\nWhat if the other case is true?"}
      />
      {ask.isError ? <ErrorState message={messageOf(ask.error)} /> : null}
      <Button
        label={ask.isPending ? "Answering…" : "Ask"}
        busy={ask.isPending}
        // Refused here rather than by the server: an empty box comes back as a
        // validation failure whose body the client cannot read, so the reader
        // would be told "Request failed (400)" instead of what to do about it.
        disabled={question.trim() === ""}
        onPress={() =>
          ask.mutate(question, {
            onSuccess: (answered) => {
              setQuestion("");
              onAnswered(answered.id);
              onClose();
            },
          })
        }
      />
    </Sheet>
  );
}
