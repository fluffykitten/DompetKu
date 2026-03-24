<div align="center">
  <img src="https://img.icons8.com/clouds/200/wallet.png" alt="DompetKu Logo" width="120" />
  <h1>DompetKu 💸</h1>
  <p><strong>A stunning, modern, and privacy-first personal finance tracking application built with React Native (Expo).</strong></p>
</div>

---

DompetKu (My Wallet) helps you manage your income, track your daily expenses, and achieve your financial goals with an incredibly intuitive and gorgeous UI. Because it relies heavily on local SQLite databases, your financial data remains completely yours—no internet required.

![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)

## ✨ Features

- 🧠 **Intelligent Dashboard**: View your remaining monthly budget, quick actions, and time-based dynamic greetings at a glance.
- 🧮 **In-App Calculator**: Fast pop-up native calculator seamlessly integrated into all amount inputs for quick math.
- 💵 **Dynamic Currency Engine**: Full support for real-time customizable currencies, including symbols, positioning, and decimal separators across the entire app.
- 🌍 **Multi-Language Support**: Fully localized in English and Indonesian (Bahasa Indonesia).
- 🔒 **Biometric Security**: Keep your financials private with Face ID / Fingerprint App Lock configurations.
- 📊 **Advanced Excel Export**: Generate drop-dead gorgeous `.xlsx` files to your device containing your entire transaction history, balance sheets, and categorical pivot summaries in seconds.
- 🎯 **Visual Budgeting**: Set categorized monthly budgets and watch your progress visually via dynamic bars.
- 💾 **100% Offline & Private**: Data is secured strictly to your local storage. Cloud-free by design with full Backup & Restore JSON capabilities natively.
- 🧙‍♂️ **First-Time Wizard**: Seamless onboarding flow providing default financial accounts (Cash, Bank) and basic categories you can configure at launch.

## 📜 Changelog

### v1.1.0
- **Feature**: Added a built-in interactive Calculator safely integrated across the app (Transactions, Transfers, Budgeting, and Onboarding).
- **Update**: Improved Input components with inline action buttons structure.

## 🚀 Quick Start

Ensure you have **Node.js** and **Expo CLI** installed.

```bash
# Clone the repository
git clone https://github.com/fluffykitten/DompetKu.git

# Enter the directory
cd DompetKu

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```
## 📦 Building APK

To generate a standalone `.apk` for Android, you can use Expo Application Services (EAS) which builds it in the cloud.

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```
2. **Login to Expo Account**:
   ```bash
   eas login
   ```
3. **Trigger Cloud Build**:
   ```bash
   eas build -p android --profile preview
   ```
*Wait a few minutes, and Expo will provide a direct download link for your compiled APK!*

## 🛠 Built With
* React Native
* Expo Ecosystem
* SQLite
* React Navigation v6
* React-i18next
* Async Storage

<br>
<div align="center">
  <sub>Created with ♥️ by <b>fluffykitten</b></sub>
</div>
