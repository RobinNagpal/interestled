# The app shell and caching

One Expo codebase serves the website (exported static and put behind CloudFront)
and the Android app. Somebody switches between them mid-topic, which is what the
cache policy exists to survive.

## Routing

`apps/mobile/app/`, on expo-router. Every screen has its own URL, so a link opens
straight into it.

```
index.tsx                        the topics list
profile.tsx                      the optional profile
review.tsx                       the three-item review batch
topic/new.tsx                    the create form and the seven questions
topic/[topic]/index.tsx          the map
topic/[topic]/[...path].tsx      a heading, a card, or a drill
topic/[topic]/edit/index.tsx     what the map holds
topic/[topic]/edit/map.tsx       the shape and the instruction lines
topic/[topic]/edit/goals.tsx     goal and starting point
topic/[topic]/edit/content.tsx   how it is written
```

`[...path].tsx` resolves three things because they share one lookup: the path is
the node's identity, and whether it is a group, a card or a drill is a fact the
map already carries. `drill` is in `RESERVED_SLUGS`, so no node can shadow it.

Href builders live in `packages/domain/src/tree.ts` (`topicHref`, `nodeHref`,
`drillHref`, `editHref` …), so no screen assembles a URL by hand.

Editing is three screens under one address rather than one screen with three
sections, because they are three different questions and a link should land on
the one being talked about.

## The API client

`packages/api/src/client.ts` is every call the app can make, in one interface, so
the surface stays visible. **Every response is parsed by a Zod schema from
`packages/schemas`** — an unrecognised value fails loudly at the boundary rather
than flowing through the app.

`ApiError` carries the status. A `401` calls `onUnauthorized`, which drops a
session the server has forgotten.

## The cache

`createAppQueryClient` in `packages/api/src/queryClient.ts`, pinned by
`packages/api/test/queryClient.test.ts`.

Two kinds of thing live in one cache:

| Kind | Keys | Policy | Why |
|---|---|---|---|
| Learner state | topics, the map, review, profile, questions, audio | `staleTime: 0`, refetch on mount and on focus | It is whatever the last device to touch it left. A node drilled on the website has to be right on the phone the moment it comes out of a pocket. |
| | `keys.audio` again | plus `refetchInterval` while pending | Making a recording outlives the press that asked for it, so this is how the app finds out it finished. It stops the moment the row settles. |
| Generated content | `keys.cards` | `CONTENT_STALE_MS` (5 min), no focus refetch | A card must not swap under the reader when the phone unlocks. |
| | `keys.drills` | `staleTime: Infinity`, no focus refetch | A drill must never change under a half-typed answer. |

The old answer stays on screen while the new one is fetched, so nothing blanks —
the map corrects itself. The content policies are set with `setQueryDefaults` on
the key *prefixes*, so a new card or drill hook inherits the policy by its key.

A phone has no tab to lose focus, so `useAppFocus` in `apps/mobile/lib/focus.ts`
feeds `AppState` to the cache's `focusManager`. Without that line the phone never
hears it was put away — which is exactly when the website was open.

Everything that changes generated content already writes into or invalidates the
cache by hand: a rewrite writes the new card under the settings the press asked
for (never the settings the controls are on when it lands), a content-settings
change invalidates the whole card prefix, and a map edit writes the whole
`TopicDetail` back.

## What is on disk

`PersistQueryClientProvider` with `queryPersister` (AsyncStorage, which is
localStorage on the web) paints the last topics, map and card at once, and the
refetch above makes them right. The signed-in user is stored beside the token for
the same reason: the app opens on the app, and the `me()` round trip confirms
them behind the first screen rather than in front of it.

Two rules:

- **One key is never written**: `shouldPersistQuery` drops `keys.audioOf` out of
  what is persisted. A card's recording is answered as a signed URL with an hour
  on it, so restoring it on the next launch paints a button pointing at a link
  the bucket has stopped honouring — exactly the press the persisted cache
  existed to make instant.
- **Bump `PERSISTED_CACHE_VERSION` when a response shape changes.** A restore
  does not re-parse what it reads back, so a field added to `TopicDetail` is
  `undefined` off a cache written by the previous build until the refetch lands.
  Moving the version discards the persisted cache on the next launch — the same
  idea as `CARD_PROMPT_REVISION`.

A sign-in starts from an empty cache and a sign-out empties the disk too:
`clearSession` calls `removeClient` on the persister rather than waiting for the
throttled write, and `adopt` clears before it stores the token, so a sign-out cut
off early never hands the next person the last one's map.

## The component set

**Every control is react-native-reusables underneath**, vendored into
`packages/ui/src/ui/` from the NativeWind registry — the shadcn model, where the
code is copied in and owned. `packages/ui/src/components/` holds only what this
product composes on top.

- **Theming is the token names, not the components.**
  `packages/config/tailwind-preset.js` names the palette a second time under
  shadcn's semantic names — `primary` is `accent`, `muted-foreground` is
  `ink-soft`, `border` is `line`, `destructive` is `bad`. The three state colours are
  `good` (earned, and a recording ready to play), `warn` (caution — a shaky node)
  and `bad` (something failed and will not fix itself). Editing colours into a vendored component is
  what makes the set impossible to update; add the mapping instead.
- **No `dark:` classes.** The app is `userInterfaceStyle: "light"`, and a dark
  variant with no dark palette behind it is a claim the app cannot honour.
- **A wrapper exists only where the composition is a product rule.** `Button`
  always carries its own label and busy state; `Card` is exported straight.
- Add one with
  `pnpm dlx @react-native-reusables/cli@latest add <name>`, then apply the three
  edits above.

`cn` has to be taught anything Tailwind did not ship — `rounded-card` is
registered on its border-radius theme, or `cn("rounded-md", "rounded-card")`
emits both and the winner is whichever the stylesheet wrote last.

## Keyboards and scrolling

Neither mobile browser shrinks the page when the keyboard opens, so a full-height
scrolling screen has a dead band at the bottom no amount of scrolling can lift a
field out of.

`KeyboardInset` wraps the navigator in `app/_layout.tsx` and shrinks the whole app
by `keyboardOverlap`, then puts what is focused back in the middle of what is
left. It reads the focused element off the document rather than being told where
to look, which is what lets one copy serve every screen. `Sheet` carries the
inset a second time, because a modal is mounted outside the root view on the web.

**Every screen is a `Screen`, never a bare `ScrollView`** — including the ones
with no field on them today, because that is what stops the question being asked
again when one is added. `no-restricted-imports` in
`packages/config/eslint.config.mjs` holds the rule; exactly three files disable
it and say why — `Screen` itself, `Sheet`, and the sideways scroller `Markdown`
puts a wide fenced block in.

`keyboardDismissMode="on-drag"` is native-only: react-native-web hangs it off
every scroll event rather than a drag, so on the web it blurs the field on the
very scroll that reveals it. A screenshot does not show it — it was found by
checking `document.activeElement` after the reveal.

## Rendering what the model wrote

Every string a model returns reaches the screen through `Markdown` /
`InlineMarkdown` in `packages/ui`, which parse the subset `system.md` asks for:
inline emphasis, code spans, links, and bullet, numbered and fenced blocks. A
plain `<Text>` shows the asterisks and backticks instead, and a list arrives as
one long line. **Titles are the exception** and are plain text, because they are
also button labels and screen titles.

## Where to look

```
apps/mobile/app/_layout.tsx        the navigator, the persister, the keyboard inset
apps/mobile/lib/auth.tsx           the session, and what a sign-in/out does to the cache
apps/mobile/lib/focus.ts           AppState → focusManager
packages/api/src/queryClient.ts    the whole cache policy
packages/api/src/keys.ts           every cache key, in one place
packages/api/src/hooks.ts          the hooks, and what each mutation invalidates
packages/ui/src/index.ts           what screens are allowed to import
packages/config/tailwind-preset.js the palette and the token mapping
```
