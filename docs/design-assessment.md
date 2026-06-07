# UI/UX Design Assessment — SuperMarketList

> Assessment date: 2026-05-18  
> Reviewer: Claude (frontend-design skill)  
> Branch: feature/ui-ux-design-analysis

---

## Summary

The app is **functionally well-structured** — clean RSC/client boundaries, sensible information hierarchy, smart category grouping. The visual layer, however, is **default-mode generic**: white cards on `gray-50`, `rounded-2xl` everywhere, flat `green-500` buttons, raw Tailwind utility strings with no design system underneath.

---

## Critical Bugs

### 1. Font override — Arial is actually rendering

**File:** `app/globals.css:25`

```css
body {
  font-family: Arial, Helvetica, sans-serif;  /* BUG — overrides Geist variable */
}
```

`layout.tsx` loads Geist and sets `--font-geist-sans`, but `globals.css` hard-codes Arial in `body {}`. The CSS variable is defined but never consumed. Every body element renders in Arial.

**Fix:**
```css
body {
  font-family: var(--font-sans);  /* consumes the Geist variable from layout.tsx */
}
```

---

### 2. Split color system — two brands at war

| Location | Color used |
|---|---|
| Landing CTA, lists page, add-item | `green-500` / `green-600` |
| Login/signup button | `blue-600` / `blue-700` |
| Internal links | `blue-500` / `blue-600` |
| Verification banner links | `blue-600` |

No single source of truth. No CSS design tokens.

---

## Design Problems

### 3. No motion layer

No transitions beyond `transition-colors`. No item entry animations, no checkbox animation, no form expand/collapse. The UI feels static.

### 4. Flat typographic scale

Inside the app, all headings collapse to the same visual weight:
- `text-2xl font-bold` (list page h1)
- `text-2xl font-bold` (list detail h1)
- `text-base font-semibold` (card titles)

No display font, no personality, no clear hierarchy between page title and section title.

### 5. "Everything is a card" anti-pattern

Every surface uses `bg-white rounded-2xl shadow-sm p-4`. Navigation header, category sections, add-item form, price table — all identical. Nothing has distinct visual hierarchy.

### 6. Navigation is not a navigation

Each page re-implements its own top bar inline. User name and logout live in the top-right corner of the content area. No persistent shell, no brand mark, no consistent navigation across pages.

### 7. Price comparison is undersold

The killer feature — cross-supermarket price comparison — is rendered as a plain `<table>` with green text on the cheapest cell. No visual drama. The price winner should feel like a win.

### 8. No headless component layer

No Radix/shadcn/ui primitives. Every form input, button, and select is hand-rolled with inconsistent class strings. The `<select>` in `AddItemForm` has no accessible label. The delete action in `ListsPage` fires immediately with no confirmation dialog.

### 9. Empty states are bare emoji

```tsx
<div className="text-4xl mb-3">🛒</div>
<p className="text-lg">Todavía no hay productos este mes.</p>
```

Functional but forgettable. Empty states are a missed opportunity for brand personality.

### 10. Landing page hero is flat

`bg-gradient-to-b from-green-50 to-white` + big emoji + headline + button. Zero creative direction. Reads as a bootstrapped project page, not a product people choose.

---

## Aesthetic Direction: "Almacén Digital"

**Concept:** Argentine family almacén meets crisp digital product. Warm, market-like surfaces — not sterile SaaS white. Bold typographic personality. Dense where it matters; generous space in the shell.

**Typography:**
- Display: `Playfair Display` (serif, editorial weight) — hero headlines, list names
- Body: `Geist Sans` (already loaded) — UI text, labels, metadata

**Color palette (OKLCH):**

```css
:root {
  /* Brand — rich forest green, not flat green-500 */
  --brand-600: oklch(42% 0.14 155);
  --brand-500: oklch(52% 0.16 155);
  --brand-400: oklch(64% 0.16 155);
  --brand-50:  oklch(97% 0.03 155);

  /* Accent — warm amber for price winners */
  --accent-500: oklch(72% 0.17 78);
  --accent-fg:  oklch(16% 0.06 78);
  --accent-50:  oklch(98% 0.04 78);

  /* Surfaces — warm off-white, not pure white */
  --surface:        oklch(97.5% 0.008 85);
  --surface-raised: oklch(100% 0 0);
  --surface-muted:  oklch(94% 0.01 85);

  /* Text */
  --text-primary:   oklch(16% 0.02 85);
  --text-secondary: oklch(46% 0.02 85);
  --text-muted:     oklch(64% 0.02 85);

  /* Border */
  --border:         oklch(88% 0.015 85);
  --border-strong:  oklch(76% 0.02 85);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}
```

**Motion principles:**
- One orchestrated entry per page load (staggered list cards)
- Checkbox check: scale pulse + color fill, 150ms
- Add-item form: height expand, 200ms ease-out
- Delete: slide + fade out, 150ms
- CSS-only where possible; no library needed for these

---

## Component Recommendations

### Button

Three variants with consistent token usage:

```tsx
// variant="primary" — brand fill
<button className="bg-[--brand-500] hover:bg-[--brand-600] text-white font-semibold px-4 py-2.5 rounded-[--radius-md] transition-colors">

// variant="outline" — bordered
<button className="border border-[--border-strong] text-[--text-primary] hover:bg-[--surface-muted] ...">

// variant="ghost" — text only
<button className="text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--surface-muted] ...">
```

### Input / Select

Consistent field appearance with visible focus ring:

```tsx
<input className="
  w-full px-3 py-2.5 rounded-[--radius-md]
  border border-[--border] bg-[--surface-raised]
  text-[--text-primary] placeholder:text-[--text-muted]
  focus:outline-none focus:ring-2 focus:ring-[--brand-400] focus:border-[--brand-400]
  transition-shadow
" />
```

### ItemRow — check animation

```tsx
<button className={`
  w-6 h-6 rounded-full border-2 flex-shrink-0
  transition-all duration-150 ease-out
  ${item.checked
    ? "bg-[--brand-500] border-[--brand-500] scale-110"
    : "border-[--border-strong] hover:border-[--brand-400] hover:scale-105"
  }
`}>
```

### PriceComparison — scoreboard header

Replace the flat table header with three winner cards above the detail table:

```tsx
<div className="grid grid-cols-3 gap-3 p-4 border-b border-[--border]">
  {totals.map(({ key, label, total }) => (
    <div key={key} className={`
      rounded-[--radius-md] p-3 text-center border transition-colors
      ${isCheapest(key, total)
        ? "bg-[--accent-50] border-[--accent-500] ring-1 ring-[--accent-500]"
        : "bg-[--surface-muted] border-[--border]"
      }
    `}>
      <div className="text-xs font-semibold text-[--text-muted] uppercase tracking-widest">{label}</div>
      <div className={`text-2xl font-bold tabular-nums mt-1 ${isCheapest(key, total) ? "text-[--accent-500]" : "text-[--text-primary]"}`}>
        {formatARS(total)}
      </div>
      {isCheapest(key, total) && (
        <div className="text-xs font-semibold text-[--accent-500] mt-0.5">★ Más barato</div>
      )}
    </div>
  ))}
</div>
```

### AppShell — persistent header

```tsx
// app/components/AppShell.tsx
export function AppShell({ userName, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[--surface]">
      <header className="sticky top-0 z-40 border-b border-[--border] bg-[--surface-raised]/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/lists" className="font-display text-xl font-bold text-[--brand-600] tracking-tight">
            Súper
          </Link>
          <nav className="flex items-center gap-1">
            <span className="text-sm text-[--text-muted] mr-2">{userName}</span>
            <ApiKeysButton />
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

### Landing hero — display typography

```tsx
<h1 className="font-display text-5xl sm:text-7xl font-extrabold leading-[1.05] tracking-tight text-[--text-primary]">
  La lista del super,{" "}
  <em className="text-[--brand-500] not-italic">sin el caos</em>
</h1>
```

---

## Implementation Priority

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | Fix Arial font bug in `globals.css` | XS | High — every body element |
| 2 | Design tokens in `globals.css` | S | High — baseline for everything |
| 3 | Add `Playfair Display` in `layout.tsx` | XS | Medium — typography personality |
| 4 | Consolidate button variants | S | High — eliminates color inconsistency |
| 5 | Consolidate input/select styles | S | Medium — form coherence |
| 6 | `AppShell` persistent header | M | High — navigation consistency |
| 7 | ItemRow check animation | XS | Medium — core interaction delight |
| 8 | PriceComparison scoreboard header | S | High — sells the killer feature |
| 9 | Install shadcn/ui + replace raw elements | L | High — accessibility + consistency |
| 10 | Landing page typographic redesign | M | Medium — first impression |
| 11 | Staggered list entry animation | S | Low — polish |
| 12 | Empty state redesign | S | Low — brand personality |
