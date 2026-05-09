# Wine database integration

Cellar uses Wine-Searcher as the preferred live data source after OCR. It is the best fit for the app because its Wine Check API returns the fields that matter most for cellar entry: region, grape, aggregated critic score, min/average/max price, ABV, and vintage-aware matches. It also has a real trial and documented commercial API, unlike Vivino scraping or CellarTracker scraping, which are brittle and legally sketchy.

Runtime config:

```
EXPO_PUBLIC_WINE_SEARCHER_API_KEY=your_key
EXPO_PUBLIC_WINE_SEARCHER_BASE_URL=https://api.wine-searcher.com/wine-check
```

The base URL is configurable because Wine-Searcher exposes the exact endpoint with issued API credentials.

If no API key is present, the app still enriches scans locally instead of leaving fields blank. OCR identifiers are parsed into wine name, producer, vintage, grape, and region, then Cellar estimates style, professional-style tasting notes, drinking window, and food pairings. That fallback keeps TestFlight usable while waiting for the Wine-Searcher key.

Returned/filled fields now include style, varietal, region, professional tasting notes, critic score, market value, drinking window, food pairings, and data source.
