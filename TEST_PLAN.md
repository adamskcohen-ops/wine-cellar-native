# Cellar Native test plan

Use this before Adam tests on the flight landing build.

## Expo Go smoke test

1. Start the app with `npx expo start` and scan the QR code in Expo Go.
2. Complete onboarding:
   - Continue through intro.
   - Enter a name.
   - Pick wine comfort level.
   - Pick favorite styles.
   - Start cellar.
3. Add flow:
   - Open Add tab.
   - Attach from Photos.
   - Confirm Expo Go shows OCR fallback text, not a crash.
   - Fill wine name, producer, vintage, region, varietal, rating, notes, status, style, price, source, tags.
   - Save bottle.
4. Collection:
   - Confirm bottle appears in grid.
   - Switch to list.
   - Search by producer/region/note.
   - Use filters: style, status, rated.
   - Clear search when no results.
5. Detail:
   - Tap bottle.
   - Edit notes/rating/status.
   - Tap Done and confirm changes remain.
   - Delete bottle and confirm it disappears.
6. Insights:
   - Add demo cellar.
   - Confirm bottle count, average rating, cellar value, drink-now count, varietals, regions, and style mix render.
   - Confirm Private sommelier suggests a bottle and food pairing.
7. Detail intelligence:
   - Open a bottle with vintage and varietal.
   - Confirm Sommelier note shows Hold / Drink now / Past peak guidance.
   - Confirm food pairing chips appear.
   - Add purchase price and source.
   - Use Share tasting note and confirm native share sheet opens.
8. Settings:
   - Export backup and confirm share sheet opens.
   - Import the exported JSON if available.
   - Replay onboarding.
   - Clear device and confirm collection empties.

## Native OCR test

Expo Go cannot run `expo-text-extractor` because it needs native ML Kit / Apple Vision code. Use a dev build or TestFlight build for OCR:

```bash
npx expo prebuild
npx expo run:ios --device
```

Then repeat Add flow with camera and photo library. A successful OCR result should prefill wine fields and set raw label text.
