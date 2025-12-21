
# 🍱 Office Catering Management System (辦公室訂餐系統)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC.svg)](https://tailwindcss.com/)

An elegant, mobile-first Single Page Application (SPA) designed to replace cumbersome Excel sheets for office meal ordering. This system automates weekly order tracking, individual balance management, and vendor settlements.

## ✨ Key Features

- **📅 Weekly Calendar Ordering**: Simple "click-to-order" interface covering Monday to Friday.
- **💰 Wallet & Settlement**: Individual prepaid balance tracking. Automatic deduction of weekly expenses upon settlement.
- **📊 Vendor Statistics**: Instant calculation of total quantities for each menu item per day, making it easy to order from suppliers.
- **🛠️ Full Management Suite**: 
  - **User Management**: Add, rename, or remove colleagues.
  - **Menu Management**: Dynamic updates for meal names and pricing.
- **📱 Responsive UI**: Beautifully designed with **Tailwind CSS** and **Lucide Icons**, inspired by Google's **Material Design 3**.
- **💾 Persistent Storage**: All data is automatically saved to the browser's `LocalStorage` — no database setup required.

## 🚀 Getting Started

### Quick Start (CodeSandbox / Single File)
This project is designed as a standalone `App.tsx`. You can simply:
1. Copy the content of `App.tsx`.
2. Paste it into a React environment (like CodeSandbox or a Vite project).
3. Ensure you have **Tailwind CSS** and **Lucide React** available.

### Local Development
To run this project locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/office-catering-system.git
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

## 🔐 Login Credentials
For administrative and group access, use the following default credentials:
- **ID:** `bento`
- **Password:** `bento`

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Hooks (`useState`, `useMemo`, `useCallback`, `useEffect`)
- **Persistence**: Browser `LocalStorage` API

## 📖 User Guide

1. **Ordering**: Click on any cell in the calendar grid to open the meal picker for that specific person and day.
2. **Recharging**: In the "Settlement" tab, click the "Recharge" button next to a name to add funds to their account.
3. **Settlement**: At the end of the week, click "Clear Weekly Data (Settlement)". The system will:
   - Calculate total spent per person.
   - Deduct the amount from their balance.
   - Clear the calendar for the new week.
4. **Menu Updates**: Use the "Menu Management" tab to adjust meal names or prices when vendor costs change.

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Created with ❤️ by a Senior Frontend Engineer to make office life a bit easier.*
