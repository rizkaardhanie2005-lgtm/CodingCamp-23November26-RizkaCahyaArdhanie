# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It allows users to record personal expense transactions, categorize them, view a running balance, and explore spending distribution through a pie chart. All data persists in the browser's Local Storage with no backend required. The app targets modern browsers and can run as a standalone page or browser extension.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Category**: One of three fixed labels that classify a transaction: Food, Transport, or Fun.
- **Transaction_List**: The scrollable on-screen list displaying all recorded transactions.
- **Balance_Display**: The UI element at the top of the page that shows the total sum of all transaction amounts.
- **Input_Form**: The HTML form through which the user enters a new transaction.
- **Validator**: The client-side logic that checks Input_Form fields before a transaction is accepted.
- **Storage**: The browser's Local Storage API used to persist transaction data.
- **Chart**: The pie chart rendered by Chart.js that visualizes spending distribution by category.
- **Chart_Engine**: The Chart.js library instance responsible for rendering and updating the Chart.

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter an expense transaction through a form, so that I can record my spending quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL contain exactly three fields: Item Name (text), Amount (numeric), and Category (selector with options Food, Transport, and Fun).
2. WHEN the user submits the Input_Form, THE Validator SHALL verify that the Item Name field is non-empty, the Amount field contains a positive number greater than zero, and the Category field has a selected value.
3. IF the user submits the Input_Form with any field failing validation, THEN THE Validator SHALL display an inline error message adjacent to each invalid field and SHALL NOT add a transaction.
4. WHEN the Input_Form passes validation, THE App SHALL add a new Transaction to the Transaction_List and SHALL clear the Input_Form fields.

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored Transactions, each showing the item name, amount formatted to two decimal places, and category label.
2. WHILE transactions exist in Storage, THE Transaction_List SHALL remain scrollable when the number of items exceeds the visible area.
3. THE Transaction_List SHALL render transactions in the order they were added, with the most recently added transaction appearing at the top of the list.
4. WHEN a transaction is added or deleted, THE Transaction_List SHALL update within 100ms without requiring a page reload.
5. THE Transaction_List SHALL provide a delete control for each transaction entry.
6. WHEN the user activates the delete control on a transaction entry, THE App SHALL remove that Transaction from the Transaction_List and from Storage.

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts formatted as a currency value with two decimal places.
2. WHEN a Transaction is added, THE Balance_Display SHALL recalculate and update the displayed total within 100ms.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL recalculate and update the displayed total within 100ms.
4. WHILE no Transactions exist, THE Balance_Display SHALL show a value of 0.00.

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL display spending distribution across the three categories: Food, Transport, and Fun, as proportional pie segments.
2. WHEN a Transaction is added, THE Chart_Engine SHALL update the Chart to reflect the new category totals within 100ms without requiring a page reload.
3. WHEN a Transaction is deleted, THE Chart_Engine SHALL update the Chart to reflect the revised category totals within 100ms without requiring a page reload.
4. WHILE only one category has transactions, THE Chart SHALL render a single full-circle segment for that category.
5. WHILE no Transactions exist, THE Chart SHALL display a neutral placeholder state indicating no data is available.
6. THE Chart SHALL render a distinct color for each category, with a visible legend mapping color to category name.

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I do not lose my expense history when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE Storage SHALL write the updated transaction list to Local Storage before the Input_Form is cleared.
2. WHEN a Transaction is deleted, THE Storage SHALL write the updated transaction list to Local Storage before the Transaction_List re-renders.
3. WHEN the App initializes, THE App SHALL read all Transactions from Local Storage and populate the Transaction_List, Balance_Display, and Chart with the persisted data.
4. IF Local Storage is unavailable or returns malformed data on initialization, THEN THE App SHALL initialize with an empty transaction list and SHALL display a non-blocking warning message to the user.

### Requirement 6: Project Structure

**User Story:** As a developer, I want a clean and predictable file structure, so that the codebase is easy to maintain and extend.

#### Acceptance Criteria

1. THE App SHALL contain exactly one CSS file located at `css/style.css`.
2. THE App SHALL contain exactly one JavaScript file located at `js/app.js`.
3. THE App SHALL load Chart.js from a CDN or as a single bundled dependency without requiring a build step or package manager.
4. THE App SHALL function correctly as a standalone HTML page opened directly in a browser without a local server.
