
# 🍱 Office Catering Management System (辦公室訂餐系統) - Cloud Edition

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28.svg)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC.svg)](https://tailwindcss.com/)

An elegant, real-time Single Page Application (SPA) designed to replace cumbersome Excel sheets for office meal ordering. Now powered by **Firebase Firestore** for instant synchronization across all devices.

## 🚀 Key Features

- **☁️ Real-time Cloud Sync**: Every click, order, and recharge is instantly synced to all colleagues' screens via Firebase Firestore.
- **📅 Weekly Calendar Ordering**: Simple "click-to-order" interface covering Monday to Friday.
- **💰 Wallet & Settlement**: Individual prepaid balance tracking with cloud persistence.
- **📊 Vendor Statistics**: Instant live calculation of total quantities for each menu item per day.
- **🛠️ Management Suite**: 
  - **User Management**: Add, rename, or remove colleagues globally.
  - **Menu Management**: Dynamic updates for meal names and pricing across the entire team.
- **📱 Responsive UI**: Material Design 3 inspired, built with **Tailwind CSS** and **Lucide Icons**.

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Database**: [Firebase Firestore](https://firebase.google.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🔐 Configuration & Security

The application is configured to connect to the following Firebase project:
- **Project ID:** `bento2-faa19`
- **Source:** Cloud real-time synchronization.

## 📖 User Guide

1. **Ordering**: Click on any cell in the grid. Changes are saved to the cloud instantly.
2. **Recharging**: Funds added in the "Settlement" tab are available to the user immediately on their own device.
3. **Settlement**: At the end of the week, clearing data updates the starting balance for next week globally.
4. **Menu Updates**: Prices changed in "Menu Management" are applied to the entire team's calculations in real-time.

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Created with ❤️ for seamless office collaboration.*
