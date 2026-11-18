# react-native-enriched-markdown: code block memory on iOS

Minimal repro: a fenced code block in `EnrichedMarkdownText` costs layer memory in proportion to the
whole block, not to what is on screen.

- Expo SDK 57, React Native 0.86.3 (New Architecture), `react-native-enriched-markdown` 1.2.0
- `flavor="github"`; math, code highlighting and video are off (`enriched-markdown` in `package.json`)

## Run

```sh
pnpm install
pnpm ios:release --device <simulator-udid>   # Release build, no Metro needed
```

## Measure

`App.tsx` picks a scenario from a URL, so nothing has to be tapped. `measure.sh` relaunches the app,
opens the scenario and reads `vmmap --summary`: the app's physical footprint and the `CoreAnimation`
region (layer backing stores).

```sh
./measure.sh <simulator-udid> none/0
./measure.sh <simulator-udid> lines/800     # 800 lines of ~42 characters
./measure.sh <simulator-udid> wide/400      # 400 lines of ~166 characters
./measure.sh <simulator-udid> stream/800    # grows by 4 lines every 50 ms, sampled every 0.5 s
```

The first URL may show the simulator's "Open in …?" prompt once; tap Open.

## Results

iPhone 16 simulator, iOS 18.1, Release build, 2026-11-18:

| Code block                  | Footprint | `CoreAnimation` |
| --------------------------- | --------- | --------------- |
| none                        | 42 MB     | 0.3 MB          |
| 50 lines (~42 chars)        | 60 MB     | 17 MB           |
| 100                         | 76 MB     | 34 MB           |
| 200                         | 108 MB    | 65 MB           |
| 400                         | 172 MB    | 129 MB          |
| 800                         | 301 MB    | 257 MB          |
| 100 wide lines (~166 chars) | 95 MB     | 52 MB           |
| 400 wide                    | 224 MB    | 178 MB          |

Streaming `stream/800`: `CoreAnimation` reached 445 MB (footprint 563 MB) at the end of the stream,
before settling at 257 MB. That is roughly the finished block's bitmap twice over.
