import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import { router } from "expo-router";
import { useGradeReview, useReview } from "@learnloop/api";
import { Button, EmptyState, ErrorState, SectionTitle, Skeleton } from "@learnloop/ui";
import { ReviewGrade } from "@learnloop/schemas";
import type { AtomT } from "@learnloop/schemas";
import { messageOf } from "../lib/errors";

/**
 * Three items, self-graded, two buttons. This is the only part of the product
 * that fights forgetting — and it stays tiny because a queue of two hundred
 * overdue items is a wall people do not climb.
 */
export default function ReviewScreen(): ReactElement {
  const review = useReview();
  const grade = useGradeReview();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  /**
   * The batch is frozen when it arrives. Grading an item makes it no longer due,
   * so reading the live query would shrink the list under the index and skip
   * the item after every answer.
   */
  const [batch, setBatch] = useState<AtomT[] | null>(null);

  useEffect(() => {
    if (batch === null && review.data !== undefined) {
      setBatch(review.data.atoms);
    }
  }, [batch, review.data]);

  if (review.isPending || (batch === null && !review.isError)) {
    return <Skeleton lines={4} />;
  }
  if (review.isError) {
    return (
      <View className="p-4">
        <ErrorState message={messageOf(review.error)} />
      </View>
    );
  }

  const atoms = batch ?? [];
  const atom = atoms[index];

  if (atom === undefined) {
    return (
      <View className="gap-4 p-4">
        <EmptyState
          title={atoms.length === 0 ? "Nothing due" : "Done"}
          body={
            atoms.length === 0
              ? "Review items appear a day after you first pass a node."
              : "That is the batch. More will be due tomorrow."
          }
        />
        <Button label="Back" onPress={() => router.replace("/")} />
      </View>
    );
  }

  const answer = (chosen: ReviewGrade): void => {
    grade.mutate({ atomId: atom.id, grade: chosen });
    setRevealed(false);
    setIndex(index + 1);
  };

  return (
    <ScrollView contentContainerClassName="gap-6 p-4">
      <SectionTitle>{`${index + 1} of ${atoms.length}`}</SectionTitle>
      <Text className="text-xl leading-7 text-ink">{atom.prompt}</Text>

      {revealed ? (
        <View className="gap-4">
          <View className="rounded-card bg-surface p-4">
            <Text className="text-base text-ink">{atom.answer}</Text>
          </View>
          <Button label="I had it" onPress={() => answer(ReviewGrade.Recalled)} />
          {/* A miss reopens its node on the map, so forgetting becomes visible
              work rather than invisible decay. */}
          <Button label="I missed it" tone="secondary" onPress={() => answer(ReviewGrade.Missed)} />
        </View>
      ) : (
        <Button label="Show the answer" onPress={() => setRevealed(true)} />
      )}
    </ScrollView>
  );
}
