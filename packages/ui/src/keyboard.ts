/**
 * Below this, an overlap is the browser's own chrome moving rather than a
 * keyboard. The URL bar collapsing and expanding resizes the visual viewport by
 * a few tens of pixels, and treating that as a keyboard would jump the form.
 */
const KEYBOARD_MIN = 120;

/**
 * How much of the page the on-screen keyboard is sitting on top of, from the
 * two heights a browser reports.
 *
 * Neither mobile browser makes the page smaller when the keyboard opens: the
 * layout viewport keeps its full height and the keys are drawn over the bottom
 * of it. Every screen here is one `ScrollView` filling that height, so the part
 * under the keyboard cannot be reached — scrolling can only bring content to
 * the bottom of the box, which is behind the keys. That is why the field being
 * typed into disappears.
 *
 * The visual viewport is the part still visible, so the difference between the
 * two is what the keyboard covers, and shrinking the scrolling box by it puts
 * the whole form back on screen. A browser that resizes the layout viewport
 * instead shrinks both heights together and so reports nothing here, which is
 * right: it has already made the room.
 */
export function keyboardOverlap(
  innerHeight: number,
  viewportHeight: number,
  offsetTop: number,
): number {
  const overlap = Math.round(innerHeight - viewportHeight - offsetTop);
  return overlap > KEYBOARD_MIN ? overlap : 0;
}
