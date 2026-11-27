/* js/app.js — Expense & Budget Visualizer application logic */
/* Populated incrementally across Tasks 2–7 */

(function () {
  'use strict';

  // ── Validator ──────────────────────────────────────────────────────────────

  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

  /**
   * Validates the expense form fields.
   * Clears all existing error messages before each pass, then writes
   * error text into the adjacent <span class="error-msg"> for every
   * failing field.
   *
   * @param {string} name      - Raw value from the Item Name input
   * @param {*}      amount    - Raw value from the Amount input
   * @param {string} category  - Selected category value
   * @returns {{ valid: true } | { valid: false, errors: { name?: string, amount?: string, category?: string } }}
   */
  function validateForm(name, amount, category) {
    // Clear all existing error messages before each validation pass
    document.querySelectorAll('.error-msg').forEach(function (span) {
      span.textContent = '';
    });

    var errors = {};

    // Validate name: must be non-empty after trimming
    if (!name || name.trim() === '') {
      errors.name = 'Item name is required.';
      var nameError = document.getElementById('error-name');
      if (nameError) nameError.textContent = errors.name;
    }

    // Validate amount: must be a parseable float strictly greater than 0
    var parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Amount must be a number greater than zero.';
      var amountError = document.getElementById('error-amount');
      if (amountError) amountError.textContent = errors.amount;
    }

    // Validate category: must be one of the three allowed values
    if (!VALID_CATEGORIES.includes(category)) {
      errors.category = 'Please select a valid category (Food, Transport, or Fun).';
      var categoryError = document.getElementById('error-category');
      if (categoryError) categoryError.textContent = errors.category;
    }

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors: errors };
    }
    return { valid: true };
  }
  // ── StorageAPI ─────────────────────────────────────────────────────────────

  // Module-level flag set to true when localStorage is unavailable or returns
  // malformed data; checked during init() to show the non-blocking warning.
  var storageWarningNeeded = false;

  var StorageAPI = {
    STORAGE_KEY: 'expense_transactions',

    /**
     * Serializes the transactions array and writes it to localStorage.
     * Silently skips (does not throw) if localStorage is unavailable or the
     * write fails for any reason (e.g. quota exceeded, private browsing).
     *
     * @param {Array} transactions - Array of Transaction objects to persist
     */
    save: function (transactions) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
      } catch (e) {
        // Silently skip — storage unavailable or quota exceeded
      }
    },

    /**
     * Reads and deserializes the transactions array from localStorage.
     * Returns an empty array and sets storageWarningNeeded = true if:
     *   - localStorage is unavailable (SecurityError, etc.)
     *   - The stored value is absent
     *   - The stored value is not valid JSON
     *
     * @returns {Array} Array of Transaction objects, or [] on any failure
     */
    load: function () {
      try {
        var raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw === null) {
          return [];
        }
        return JSON.parse(raw);
      } catch (e) {
        storageWarningNeeded = true;
        return [];
      }
    }
  };

  // ── AppState ───────────────────────────────────────────────────────────────

  /**
   * Triggers all three render functions after every state mutation.
   * All three are synchronous DOM writes, so they complete well within 100 ms.
   * Requirements: 2.4, 3.2, 3.3, 4.2, 4.3
   */
  function _render() {
    renderList(AppState.getAll());
    renderBalance(AppState.getTotal());
    renderChart(AppState.getCategoryTotals());
  }

  var AppState = {
    /** @type {Array<{id: string, name: string, amount: number, category: string, createdAt: number}>} */
    transactions: [],

    /**
     * Appends a new transaction to the list, persists to Storage, and
     * triggers a re-render.  The transaction object is expected to arrive
     * with all required fields; `amount` is rounded to 2 decimal places
     * here before storage.  An `id` and `createdAt` are generated if absent.
     *
     * @param {{ name: string, amount: number, category: string, id?: string, createdAt?: number }} transaction
     */
    add: function (transaction) {
      var id;
      if (transaction.id) {
        id = transaction.id;
      } else {
        try {
          id = crypto.randomUUID();
        } catch (e) {
          id = Date.now().toString() + Math.random();
        }
      }

      var entry = {
        id: id,
        name: transaction.name,
        amount: Math.round(parseFloat(transaction.amount) * 100) / 100,
        category: transaction.category,
        createdAt: transaction.createdAt !== undefined ? transaction.createdAt : Date.now()
      };

      this.transactions.push(entry);
      StorageAPI.save(this.transactions);
      _render();
    },

    /**
     * Removes the transaction with the matching `id`, persists the updated
     * list, and triggers a re-render.  If the id is not found the list is
     * left unchanged.
     *
     * @param {string} id
     */
    remove: function (id) {
      this.transactions = this.transactions.filter(function (t) {
        return t.id !== id;
      });
      StorageAPI.save(this.transactions);
      _render();
    },

    /**
     * Returns a shallow copy of the transactions array so callers cannot
     * mutate internal state directly.
     *
     * @returns {Array}
     */
    getAll: function () {
      return this.transactions.slice();
    },

    /**
     * Computes the sum of transaction amounts grouped by the three fixed
     * categories.
     *
     * @returns {{ Food: number, Transport: number, Fun: number }}
     */
    getCategoryTotals: function () {
      var totals = { Food: 0, Transport: 0, Fun: 0 };
      this.transactions.forEach(function (t) {
        if (Object.prototype.hasOwnProperty.call(totals, t.category)) {
          totals[t.category] += t.amount;
        }
      });
      return totals;
    },

    /**
     * Returns the arithmetic sum of all transaction `amount` fields.
     *
     * @returns {number}
     */
    getTotal: function () {
      return this.transactions.reduce(function (sum, t) {
        return sum + t.amount;
      }, 0);
    }
  };

  // ── Renderer ───────────────────────────────────────────────────────────────

  /**
   * Rebuilds the #transaction-list element from scratch.
   * Transactions are sorted by createdAt descending (most recent first).
   * Each <li> contains the item name, amount (2 dp), category, and a
   * delete button with class "delete-btn" and data-id set to the
   * transaction's id.
   *
   * @param {Array<{id: string, name: string, amount: number, category: string, createdAt: number}>} transactions
   */
  function renderList(transactions) {
    var list = document.getElementById('transaction-list');
    if (!list) return;

    // Sort descending by createdAt (most recent first); do not mutate the
    // original array — slice() creates a copy first.
    var sorted = transactions.slice().sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });

    if (sorted.length === 0) {
      list.innerHTML = '<li class="empty-state">No transactions yet.</li>';
      return;
    }

    list.innerHTML = sorted.map(function (t) {
      return (
        '<li class="transaction-item" data-id="' + t.id + '">' +
          '<span class="transaction-name">' + _escapeHtml(t.name) + '</span>' +
          '<span class="transaction-amount">$' + t.amount.toFixed(2) + '</span>' +
          '<span class="transaction-category">' + _escapeHtml(t.category) + '</span>' +
          '<button class="delete-btn" data-id="' + t.id + '" aria-label="Delete ' + _escapeHtml(t.name) + '">Delete</button>' +
        '</li>'
      );
    }).join('');
  }

  /**
   * Escapes characters that are unsafe inside HTML attribute values and text
   * content, preventing XSS from user-supplied strings.
   *
   * @param {string} str
   * @returns {string}
   */
  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Updates the #balance-display element to show the running total formatted
   * as a currency value with two decimal places.
   * Shows "0.00" when total is 0, falsy, or not a finite number.
   *
   * @param {number} total - Sum of all transaction amounts
   */
  function renderBalance(total) {
    var display = document.getElementById('balance-display');
    if (!display) return;

    var value = (typeof total === 'number' && isFinite(total)) ? total : 0;
    display.textContent = value.toFixed(2);
  }

  // ── Chart renderer ────────────────────────────────────────────────────────

  /** Module-level reference to the Chart.js instance; null until first call. */
  var chartInstance = null;

  /**
   * Creates or updates the Chart.js pie chart inside #chart-container.
   *
   * - First call: creates a <canvas> element (if one does not already exist),
   *   instantiates a Chart.js "pie" chart with distinct colors per category,
   *   and stores the instance in `chartInstance`.
   * - Subsequent calls: updates the dataset data in-place and calls
   *   `chart.update()` to avoid destroying and recreating the instance
   *   (prevents flicker).
   * - When all category totals are 0: renders a single grey "No data"
   *   placeholder segment.
   * - When Chart.js did not load (window.Chart is undefined): inserts a
   *   plain-text fallback paragraph inside #chart-container.
   *
   * @param {{ Food: number, Transport: number, Fun: number }} categoryTotals
   */
  function renderChart(categoryTotals) {
    var container = document.getElementById('chart-container');
    if (!container) return;

    // Guard: Chart.js unavailable
    if (!window.Chart) {
      if (!container.querySelector('.chart-fallback')) {
        var fallback = document.createElement('p');
        fallback.className = 'chart-fallback';
        fallback.textContent = 'Chart unavailable — Chart.js could not be loaded.';
        container.appendChild(fallback);
      }
      return;
    }

    var food      = (categoryTotals && typeof categoryTotals.Food      === 'number') ? categoryTotals.Food      : 0;
    var transport = (categoryTotals && typeof categoryTotals.Transport === 'number') ? categoryTotals.Transport : 0;
    var fun       = (categoryTotals && typeof categoryTotals.Fun       === 'number') ? categoryTotals.Fun       : 0;

    var allZero = (food === 0 && transport === 0 && fun === 0);

    var labels, data, colors;
    if (allZero) {
      labels = ['No data'];
      data   = [1];
      colors = ['#cccccc'];
    } else {
      labels = ['Food', 'Transport', 'Fun'];
      data   = [food, transport, fun];
      colors = ['#f97316', '#3b82f6', '#a855f7']; // orange, blue, purple
    }

    if (chartInstance) {
      // Update existing instance in-place (prevents flicker)
      chartInstance.data.labels                 = labels;
      chartInstance.data.datasets[0].data       = data;
      chartInstance.data.datasets[0].backgroundColor = colors;
      chartInstance.update();
      return;
    }

    // First call — create a canvas if needed, then instantiate the chart
    var canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'expense-chart';
      container.appendChild(canvas);
    }

    chartInstance = new window.Chart(canvas, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                if (allZero) return 'No transactions yet';
                var value = context.parsed;
                return context.label + ': $' + value.toFixed(2);
              }
            }
          }
        }
      }
    });
  }

  /**
   * Shows the non-blocking storage warning banner.
   * Removes the `hidden` attribute from #storage-warning and sets its text
   * to a user-friendly message explaining that Local Storage is unavailable
   * or returned invalid data.
   * Called during init() when StorageAPI.load() sets storageWarningNeeded.
   *
   * Requirements: 5.4
   */
  function showStorageWarning() {
    var banner = document.getElementById('storage-warning');
    if (!banner) return;
    banner.removeAttribute('hidden');
    banner.textContent =
      'Warning: Local Storage is unavailable or returned invalid data. ' +
      'Your transactions will not be saved between sessions.';
  }

  // ── Event wiring / init ────────────────────────────────────────────────────

  /**
   * Initialises the application:
   *   1. Loads persisted transactions from StorageAPI; shows the storage
   *      warning banner if the load flagged an issue.
   *   2. Hydrates AppState with the loaded data and performs an initial render.
   *   3. Attaches a submit listener on #expense-form to validate, construct a
   *      Transaction, call AppState.add(), and clear the form on success.
   *   4. Attaches a delegated click listener on #transaction-list to handle
   *      delete-button clicks.
   *
   * Requirements: 1.4, 2.4, 2.6, 5.3, 5.4
   */
  function init() {
    // ── 1. Load persisted data ───────────────────────────────────────────────
    var loaded = StorageAPI.load();
    if (storageWarningNeeded) {
      showStorageWarning();
    }

    // ── 2. Hydrate AppState and render initial UI ────────────────────────────
    AppState.transactions = loaded;
    renderList(AppState.getAll());
    renderBalance(AppState.getTotal());
    renderChart(AppState.getCategoryTotals());

    // ── 3. Form submit — validate → build transaction → add → clear ──────────
    var form = document.getElementById('expense-form');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();

        var nameInput     = document.getElementById('item-name');
        var amountInput   = document.getElementById('amount');
        var categoryInput = document.getElementById('category');

        var nameVal     = nameInput     ? nameInput.value     : '';
        var amountVal   = amountInput   ? amountInput.value   : '';
        var categoryVal = categoryInput ? categoryInput.value : '';

        var result = validateForm(nameVal, amountVal, categoryVal);
        if (!result.valid) {
          return; // errors already written into the DOM by validateForm
        }

        // Build the Transaction object; AppState.add() rounds the amount.
        var transaction = {
          id: (function () {
            try { return crypto.randomUUID(); } catch (e) {
              return Date.now().toString() + Math.random();
            }
          }()),
          name: nameVal.trim(),
          amount: parseFloat(amountVal),
          category: categoryVal,
          createdAt: Date.now()
        };

        AppState.add(transaction);

        // Clear form fields after a successful add
        if (nameInput)     nameInput.value     = '';
        if (amountInput)   amountInput.value   = '';
        if (categoryInput) categoryInput.value = '';
      });
    }

    // ── 4. Delegated delete listener on the transaction list ─────────────────
    var list = document.getElementById('transaction-list');
    if (list) {
      list.addEventListener('click', function (event) {
        var btn = event.target.closest('.delete-btn');
        if (btn) {
          AppState.remove(btn.dataset.id);
        }
      });
    }
  }

  // Run after the DOM is ready
  document.addEventListener('DOMContentLoaded', init);

})();
