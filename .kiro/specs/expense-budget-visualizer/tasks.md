# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side single-page web application using plain HTML, CSS, and Vanilla JavaScript. The app allows users to record expense transactions, view a scrollable history, track a running total balance, and visualize spending by category with a Chart.js pie chart. All data persists in `localStorage`; no build step or backend is required.

## Tasks

- [x] 1. Set up project structure and HTML skeleton
  - Create the directory layout: `index.html`, `css/style.css`, `js/app.js`
  - Write the full `index.html` including:
    - `<form id="expense-form">` with three fields: Item Name (`<input type="text">`), Amount (`<input type="number">`), Category (`<select>` with options Food, Transport, Fun) and a submit button
    - Inline `<span class="error-msg">` placeholders adjacent to each field
    - `<div id="balance-display">` for the running total
    - `<ul id="transaction-list">` for the scrollable history
    - A `<div id="chart-container">` for the pie chart canvas
    - A `<div id="storage-warning" hidden>` for the non-blocking warning banner
    - A `<script>` tag loading Chart.js from CDN before `js/app.js`
    - A `<link>` tag pointing to `css/style.css`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 1.1_

- [x] 2. Implement the Validator module
  - [x] 2.1 Write the `validateForm(name, amount, category)` function inside the IIFE in `js/app.js`
    - Trim `name` and reject if empty
    - Parse `amount` as float; reject if `NaN` or ≤ 0
    - Reject `category` if not one of `"Food"`, `"Transport"`, `"Fun"`
    - Return `{ valid: true }` on success or `{ valid: false, errors: { name?, amount?, category? } }` on failure
    - Clear existing `.error-msg` text before each pass; write error text into the adjacent span on failure
    - _Requirements: 1.2, 1.3_

  - [ ]* 2.2 Write property test for Validator — Property 1: Validation rejects all-whitespace names
    - **Property 1: Validation rejects all-whitespace names**
    - Use `fast-check` with `arbitraryWhitespaceString` generator (space, tab, newline chars)
    - Assert `validateForm(wsString, 10, "Food").valid === false` with an error on the `name` field
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 2.3 Write property test for Validator — Property 2: Validation rejects non-positive amounts
    - **Property 2: Validation rejects non-positive amounts**
    - Use `fast-check` with `arbitraryNonPositiveNumber` generator (floats ≤ 0 including negatives and 0)
    - Assert `validateForm("Lunch", nonPositive, "Food").valid === false` with an error on the `amount` field
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 2.4 Write unit tests for Validator edge cases
    - Valid input returns `{ valid: true }`
    - Invalid category string (e.g., `"Groceries"`) returns an error on `category`
    - Non-numeric string amount (`"abc"`) is treated as a failing amount check
    - _Requirements: 1.2, 1.3_

- [x] 3. Implement the StorageAPI module
  - [x] 3.1 Write the `StorageAPI` object in `js/app.js`
    - `STORAGE_KEY = "expense_transactions"`
    - `save(transactions)` — `JSON.stringify` and `localStorage.setItem` wrapped in try/catch; silently skips on failure
    - `load()` — `localStorage.getItem` → `JSON.parse`; returns `[]` and sets a `storageWarningNeeded` flag on any exception (unavailable storage or malformed JSON)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.2 Write property test for StorageAPI — Property 6: Storage round-trip preserves transactions
    - **Property 6: Storage round-trip preserves transactions**
    - Use `fast-check` with `arbitraryTransactionList` generator (arrays of 0–50 valid Transaction objects)
    - Assert `StorageAPI.load()` after `StorageAPI.save(list)` deep-equals the original `list`
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 3.3 Write unit tests for StorageAPI edge cases
    - `load()` returns `[]` when `localStorage` contains the string `"not-json"`
    - `load()` returns `[]` when `localStorage` is empty
    - _Requirements: 5.4_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement the AppState module
  - [x] 5.1 Write the `AppState` singleton object in `js/app.js`
    - `transactions: []` — module-level array
    - `add(transaction)` — appends, calls `StorageAPI.save()`, then triggers render
    - `remove(id)` — filters out by `id`, calls `StorageAPI.save()`, then triggers render
    - `getAll()` — returns a shallow copy of the transactions array
    - `getCategoryTotals()` — returns `{ Food: n, Transport: n, Fun: n }` by summing amounts per category
    - `getTotal()` — returns the arithmetic sum of all `amount` fields
    - Generate transaction `id` with `crypto.randomUUID()`, falling back to `Date.now().toString() + Math.random()`
    - Round `amount` to 2 decimal places at creation time
    - _Requirements: 1.4, 2.6, 3.1, 3.2, 3.3_

  - [ ]* 5.2 Write property test for AppState — Property 3: Transaction list length grows by one after add
    - **Property 3: Transaction list length grows by one after add**
    - Use `fast-check` with `arbitraryTransaction` and `arbitraryTransactionList` generators
    - Seed `AppState.transactions` with the generated list; call `AppState.add()`; assert length increased by exactly 1
    - **Validates: Requirements 1.4, 2.1**

  - [ ]* 5.3 Write property test for AppState — Property 4: Balance equals sum of transaction amounts
    - **Property 4: Balance equals sum of transaction amounts**
    - Use `fast-check` with `arbitraryTransactionList` generator (non-empty lists)
    - Seed `AppState.transactions`; assert `AppState.getTotal()` equals `list.reduce((s, t) => s + t.amount, 0)`
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 5.4 Write property test for AppState — Property 5: Category totals partition the overall total
    - **Property 5: Category totals partition the overall total**
    - Use `fast-check` with `arbitraryTransactionList` generator
    - Assert `Food + Transport + Fun === getTotal()` for every generated list
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 5.5 Write property test for AppState — Property 7: Delete removes exactly the targeted transaction
    - **Property 7: Delete removes exactly the targeted transaction**
    - Use `fast-check` with a non-empty `arbitraryTransactionList`; pick a random index as the target ID
    - Assert the resulting list no longer contains that ID and has length `original - 1`
    - **Validates: Requirements 2.6, 3.3**

  - [ ]* 5.6 Write unit tests for AppState edge cases
    - `getTotal()` returns `0` when the transaction list is empty
    - `getCategoryTotals()` returns all-zero totals when no transactions exist
    - Deleting a transaction ID that does not exist leaves the list unchanged
    - _Requirements: 3.1, 2.6_

- [x] 6. Implement the Renderer module
  - [x] 6.1 Write `renderList(transactions)` in `js/app.js`
    - Rebuilds `#transaction-list` innerHTML from scratch on each call
    - Each `<li>` shows item name, amount formatted to two decimal places, category label, and a `<button class="delete-btn" data-id="...">` delete control
    - Renders transactions with the most recently added (highest `createdAt`) at the top
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 6.2 Write `renderBalance(total)` in `js/app.js`
    - Updates `#balance-display` text content to the total formatted as a currency value with two decimal places
    - Shows `0.00` when total is 0
    - _Requirements: 3.1, 3.4_

  - [x] 6.3 Write `renderChart(categoryTotals)` in `js/app.js`
    - Hold a module-level reference to the Chart.js instance
    - On first call: create a `Chart` instance on a `<canvas>` inside `#chart-container` with type `"doughnut"` or `"pie"`, distinct colors per category, and a legend
    - On subsequent calls: update `chart.data.datasets[0].data` and call `chart.update()` without destroying the instance (prevents flicker)
    - Guard with `if (!window.Chart)` and render a text fallback inside `#chart-container` if Chart.js did not load
    - Display a neutral placeholder (empty dataset with a label) when all category totals are 0
    - _Requirements: 4.1, 4.4, 4.5, 4.6_

  - [x] 6.4 Write `showStorageWarning()` in `js/app.js`
    - Removes the `hidden` attribute from `#storage-warning` and sets its text to a non-blocking warning message
    - _Requirements: 5.4_

  - [ ]* 6.5 Write unit tests for Renderer functions
    - `renderBalance` sets the correct text content for a known total
    - `renderList` produces one `<li>` per transaction and each has a `.delete-btn` with the correct `data-id`
    - `renderChart` does not throw when `categoryTotals` are all zero
    - _Requirements: 2.1, 3.1, 4.5_

- [x] 7. Wire up event listeners and initialization
  - [x] 7.1 Write the `init()` function and attach it to `DOMContentLoaded` in `js/app.js`
    - Call `StorageAPI.load()` to retrieve persisted transactions; if `storageWarningNeeded`, call `showStorageWarning()`
    - Hydrate `AppState.transactions` with the loaded data
    - Call `renderList`, `renderBalance`, and `renderChart` with the loaded state
    - Attach a `submit` listener on `#expense-form`:
      - Prevent default
      - Call `validateForm`; on failure surface errors and return
      - On success: construct a Transaction object, call `AppState.add()`, clear form fields
    - Attach a delegated `click` listener on `#transaction-list`:
      - Check `event.target.closest(".delete-btn")`; if matched, call `AppState.remove(dataset.id)`
    - _Requirements: 1.4, 2.4, 2.6, 5.3, 5.4_

  - [x] 7.2 Ensure `AppState.add()` and `AppState.remove()` call all three render functions
    - After every state mutation, call `renderList(AppState.getAll())`, `renderBalance(AppState.getTotal())`, and `renderChart(AppState.getCategoryTotals())`
    - Verify updates complete within 100 ms (synchronous DOM writes satisfy this)
    - _Requirements: 2.4, 3.2, 3.3, 4.2, 4.3_

- [x] 8. Apply CSS styling
  - Write `css/style.css` with styles for:
    - Responsive page layout with the form, balance display, transaction list, and chart visible without horizontal scrolling
    - `.error-msg` styled in red and displayed inline adjacent to its field
    - `#transaction-list` with a fixed max-height and `overflow-y: scroll` for scrollability
    - `#storage-warning` styled as a non-blocking banner (e.g., yellow background, dismissible appearance)
    - `#balance-display` prominently styled at the top of the page
    - Each transaction list item styled with the item name, amount, category, and delete button clearly separated
  - _Requirements: 1.3, 2.2, 3.1, 5.4_

- [ ] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** (JavaScript); install it as a dev dependency or load from CDN for the test runner only — it is not bundled into the app itself
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness guarantees; unit tests cover specific examples and edge cases
- The app must work when opened as `file://` — avoid any APIs that require a server origin

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3"] },
    { "id": 4, "tasks": ["4"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6"] },
    { "id": 7, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 8, "tasks": ["6.5"] },
    { "id": 9, "tasks": ["7.1", "7.2"] },
    { "id": 10, "tasks": ["8"] },
    { "id": 11, "tasks": ["9"] }
  ]
}
```
