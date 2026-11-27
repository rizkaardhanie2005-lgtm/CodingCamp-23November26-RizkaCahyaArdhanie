# Design Document

## Overview

The Expense & Budget Visualizer is a fully client-side single-page web application built with plain HTML, CSS, and Vanilla JavaScript. It enables users to log personal expense transactions, review a scrollable transaction history, monitor a running total balance, and visualize spending distribution by category through a Chart.js pie chart. All data persists in the browser's Local Storage; no backend, build step, or package manager is required.

The application targets modern browsers and must function correctly when opened as a standalone HTML file from the filesystem (`file://` protocol).

## Architecture

The app follows a **single-module MVC-lite pattern** contained in one JavaScript file (`js/app.js`). There is no bundler or module system — the file uses an IIFE (Immediately Invoked Function Expression) to avoid polluting the global namespace.

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                        │
│  ┌─────────────────┐   ┌────────────────────────────┐   │
│  │  Input_Form UI  │   │  Transaction_List UI        │   │
│  │  (HTML form)    │   │  (ul #transaction-list)     │   │
│  └────────┬────────┘   └────────────┬───────────────┘   │
│           │                         │                    │
│  ┌────────▼─────────────────────────▼───────────────┐   │
│  │                  js/app.js                        │   │
│  │  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │   │
│  │  │Validator │  │ AppState  │  │  StorageAPI   │  │   │
│  │  └──────────┘  └─────┬─────┘  └───────┬───────┘  │   │
│  │                      │                │           │   │
│  │  ┌───────────────────▼────────────────▼────────┐  │   │
│  │  │               Renderer                      │  │   │
│  │  │  renderList() · renderBalance() · renderChart│  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  Chart.js (CDN script tag)                               │
└─────────────────────────────────────────────────────────┘
```

**Data flow:**
1. User submits the Input_Form.
2. `Validator` checks all fields and surfaces inline errors.
3. On success, `AppState` creates a new Transaction and delegates to `StorageAPI.save()`.
4. `Renderer` reads from `AppState` and updates the DOM: list, balance, and chart — all within 100 ms.
5. On page load, `StorageAPI.load()` hydrates `AppState`, then `Renderer` performs the initial draw.

## Components and Interfaces

### Validator

Responsible for all client-side field validation before a transaction is accepted.

```js
// Returns { valid: true } or { valid: false, errors: { name?, amount?, category? } }
function validateForm(name, amount, category)
```

**Rules:**
- `name`: non-empty string after trimming whitespace.
- `amount`: parseable as a float, value strictly greater than 0.
- `category`: one of `"Food"`, `"Transport"`, `"Fun"`.

Errors are displayed as inline `<span class="error-msg">` elements adjacent to each invalid field. Existing error messages are cleared before each validation pass.

### AppState

In-memory singleton holding the transaction array for the lifetime of the page.

```js
const AppState = {
  transactions: [],           // Transaction[]
  add(transaction),           // appends and triggers save + render
  remove(id),                 // filters out by id and triggers save + render
  getAll(),                   // returns shallow copy of transactions array
  getCategoryTotals(),        // returns { Food: n, Transport: n, Fun: n }
  getTotal(),                 // returns sum of all amounts (number)
};
```

### StorageAPI

Thin wrapper around `window.localStorage`.

```js
const StorageAPI = {
  STORAGE_KEY: "expense_transactions",
  save(transactions),   // JSON.stringify → localStorage.setItem
  load(),               // localStorage.getItem → JSON.parse; returns [] on failure
};
```

`load()` catches `JSON.parse` errors and `localStorage` access exceptions, returning an empty array and setting a flag for the initialization warning (Requirement 5.4).

### Renderer

Pure-side-effect functions that read from `AppState` and write to the DOM.

```js
function renderList(transactions)     // rebuilds #transaction-list innerHTML
function renderBalance(total)         // updates #balance-display text
function renderChart(categoryTotals)  // updates or creates Chart.js instance
function showStorageWarning()         // injects non-blocking banner
```

`renderChart` holds a module-level reference to the Chart.js instance. When called after initialization, it calls `chart.data.datasets[0].data = [...]` and `chart.update()` rather than destroying and recreating the instance, preventing flicker.

### Event Wiring

All DOM event listeners are attached in an `init()` function called after `DOMContentLoaded`:

| Event | Element | Handler |
|---|---|---|
| `submit` | `#expense-form` | Validate → `AppState.add()` |
| `click` (delegated) | `#transaction-list` | Detect `.delete-btn` → `AppState.remove(id)` |

## Data Models

### Transaction

```js
{
  id: string,        // crypto.randomUUID() or Date.now().toString() fallback
  name: string,      // trimmed, non-empty
  amount: number,    // positive float, rounded to 2 decimal places at creation
  category: string,  // "Food" | "Transport" | "Fun"
  createdAt: number  // Date.now() timestamp, used for display ordering
}
```

### Storage Schema

Transactions are stored as a JSON array under the key `"expense_transactions"` in `localStorage`:

```json
[
  { "id": "...", "name": "Lunch", "amount": 12.50, "category": "Food", "createdAt": 1700000000000 },
  ...
]
```

### Category Totals (derived)

```js
{
  Food: number,       // sum of amounts where category === "Food"
  Transport: number,  // sum of amounts where category === "Transport"
  Fun: number         // sum of amounts where category === "Fun"
}
```

This object is computed on demand by `AppState.getCategoryTotals()` and is never persisted independently.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Validation rejects all-whitespace names

*For any* string composed entirely of whitespace characters, `validateForm(name, amount, category)` SHALL return `valid: false` with an error on the `name` field.

**Validates: Requirements 1.2, 1.3**

### Property 2: Validation rejects non-positive amounts

*For any* numeric value less than or equal to zero (including negative numbers and zero itself), `validateForm(name, amount, category)` SHALL return `valid: false` with an error on the `amount` field.

**Validates: Requirements 1.2, 1.3**

### Property 3: Transaction list length grows by one after add

*For any* valid transaction and any existing list of transactions, calling `AppState.add()` SHALL result in `AppState.getAll()` returning a list whose length is exactly one greater than before.

**Validates: Requirements 1.4, 2.1**

### Property 4: Balance equals sum of transaction amounts

*For any* non-empty list of transactions, `AppState.getTotal()` SHALL equal the arithmetic sum of all individual transaction `amount` fields.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Category totals partition the overall total

*For any* list of transactions, the sum of `getCategoryTotals().Food + getCategoryTotals().Transport + getCategoryTotals().Fun` SHALL equal `getTotal()`.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: Storage round-trip preserves transactions

*For any* list of valid Transaction objects, serializing via `StorageAPI.save()` and then deserializing via `StorageAPI.load()` SHALL produce a list that is deep-equal to the original.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 7: Delete removes exactly the targeted transaction

*For any* transaction list and any transaction ID present in that list, calling `AppState.remove(id)` SHALL result in a list that no longer contains that ID and whose length is exactly one less than before.

**Validates: Requirements 2.6, 3.3**

## Error Handling

| Scenario | Handling |
|---|---|
| `localStorage` unavailable (private browsing, quota exceeded) | `StorageAPI.load()` / `save()` wrap calls in try/catch; `load()` returns `[]`; `save()` silently skips; init shows non-blocking warning banner (Req 5.4). |
| Malformed JSON in `localStorage` | `JSON.parse` exception caught in `StorageAPI.load()`; returns `[]` and triggers warning banner. |
| `crypto.randomUUID` unavailable | Falls back to `Date.now().toString() + Math.random()` for transaction ID generation. |
| Chart.js CDN fails to load | `window.Chart` will be undefined; `renderChart` guards with `if (!window.Chart)` and renders a text fallback inside the chart container. |
| Non-numeric amount input | `parseFloat` returns `NaN`; validator treats NaN as a failing amount check. |

## Testing Strategy

### Unit Tests (example-based)

Unit tests focus on specific scenarios that complement the property tests:

- `validateForm` with a valid input returns `{ valid: true }`.
- `validateForm` with an invalid category string (e.g., `"Groceries"`) returns an error.
- `AppState.getTotal()` returns `0` when the transaction list is empty.
- `AppState.getCategoryTotals()` returns all-zero totals when no transactions exist.
- `StorageAPI.load()` returns `[]` when `localStorage` contains the string `"not-json"`.
- `renderBalance` sets the correct text content for a known total.
- Deleting a transaction that does not exist leaves the list unchanged.

### Property-Based Tests

Property-based tests use **fast-check** (JavaScript) with a minimum of 100 iterations per property. Each test is tagged with the corresponding design property.

| Test tag | Design property |
|---|---|
| `Feature: expense-budget-visualizer, Property 1: Validation rejects all-whitespace names` | Property 1 |
| `Feature: expense-budget-visualizer, Property 2: Validation rejects non-positive amounts` | Property 2 |
| `Feature: expense-budget-visualizer, Property 3: Transaction list length grows by one after add` | Property 3 |
| `Feature: expense-budget-visualizer, Property 4: Balance equals sum of transaction amounts` | Property 4 |
| `Feature: expense-budget-visualizer, Property 5: Category totals partition the overall total` | Property 5 |
| `Feature: expense-budget-visualizer, Property 6: Storage round-trip preserves transactions` | Property 6 |
| `Feature: expense-budget-visualizer, Property 7: Delete removes exactly the targeted transaction` | Property 7 |

**Generators needed:**
- `arbitraryWhitespaceString` — strings containing only space, tab, and newline characters.
- `arbitraryNonPositiveNumber` — floats ≤ 0, including negative values and 0.
- `arbitraryTransaction` — valid Transaction object with random name, amount > 0, and random category from the fixed set.
- `arbitraryTransactionList` — array of 0–50 valid transactions.

### Integration / Manual Tests

Because this app has no server, integration testing is manual or driven by a browser automation tool (e.g., Playwright):

- Reload the page after adding transactions and verify the list, balance, and chart reflect persisted data.
- Open the app in a browser with `localStorage` disabled (private mode in some browsers) and confirm the warning banner appears.
- Verify the chart renders correctly when only one category has transactions (single full-circle segment).
- Verify the chart displays a placeholder when no transactions exist.
