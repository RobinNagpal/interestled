/** One place to turn a thrown value into something worth showing a learner. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}
