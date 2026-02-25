# 📚 Learning Milk Bahi Development

Milk Bahi is a sleek, mobile-first hybrid application designed to help users track daily milk deliveries and expenses. This project is a great example of building a full-featured Android app using web technologies.

## 🛠 Tech Stack
* **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+).
* **Framework**: [Capacitor](https://capacitorjs.com/) for bridging web code to native Android functionality.
* **Bundler**: [esbuild](https://esbuild.github.io/) for fast JS bundling.
* **Visualizations**: [Chart.js](https://www.chartjs.org/) for interactive usage and expense trends.
* **Reporting**: [jsPDF](https://github.com/parallax/jsPDF) for generating PDF summaries and custom CSV export logic.

## 🏗 Key Architectural Patterns
* **Local-First Data**: The app prioritizes user privacy by storing data locally in the device's `Documents` folder using the Capacitor Filesystem API.
* **State Management**: Uses a central `state` object in `app.js` to handle real-time UI updates across the dashboard, history, and settings.
* **Automated CI/CD**: Features a GitHub Actions workflow (`build-apk.yml`) that automatically compiles the Android APK, signs it, and runs a VirusTotal safety scan on every push.

## 🚀 Learning Goals
1.  **Hybrid App Development**: Understand how `capacitor.config.json` defines the app's identity and how web assets in `/www` become a native app.
2.  **Data Persistence**: Learn how to implement robust backup and restore functionality using JSON serialization and native filesystem access.
3.  **Complex Logic**: Study `src/csvHelper.js` to see how raw entry data is transformed into formatted reports.
4.  **DevOps for Mobile**: Explore how to use `workflow_dispatch` and `secrets` in GitHub Actions to automate secure production builds.

## 📂 Project Structure Highlights
* `src/app.js`: The core logic and UI controller.
* `www/index.html`: The single-page application entry point and sidebar layout.
* `.github/workflows/`: The automation engine for APK distribution.
