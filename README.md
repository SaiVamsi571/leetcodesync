# LeetCodeSync ⚡

> Automatically synchronize Accepted LeetCode submissions to GitHub with daily consistency tracking. Built for Chrome Manifest V3.

![Platform](https://img.shields.io/badge/Platform-Chrome%20Extension%20MV3-blue)
![Languages](https://img.shields.io/badge/Supported%20Languages-JavaScript%20|%20Python%20|%20TypeScript%20|%20Java%20|%20Go%20|%20Rust-brightgreen)
![Tests](https://img.shields.io/badge/Unit%20Tests-32%20passing-success)

---

## Features

- **⚡ Automatic Submission Detection**: Listens to LeetCode submissions and synchronizes only verified **Accepted** verdicts.
- **📁 Multi-Language Problem Folders**: Automatically structures problems (e.g. `leetcode/0001 - Two Sum/` or `Two Sum/`), generating formatted `README.md` files and language-specific solution files (`two_sum.js`, `two_sum.py`, `two_sum.go`, etc.).
- **🔒 Atomic Multi-File Git Commits**: Uses the GitHub Git Data API (`trees` and `commits`) to combine `README.md` and code changes into a single atomic commit.
- **⚡ Performance-Based Commit Messages**: Exact commit format: `Time: 59 ms (72.10%) | Memory: 52.2 MB (8.84%)`.
- **🛡️ Deduplication & Zero-Diff Protection**: Prevents duplicate submissions and skips redundant commits when code is unchanged.
- **🔥 Weekly Consistency Tracker**: Tracks daily completed challenges Monday through Sunday in your local timezone, maintaining current and all-time longest streaks. Operates completely independently of GitHub connectivity.
- **🌙 GitHub Dark-Themed Dashboard**: Compact 380 × 560 px popup with real-time stats, 7-day indicators, and configuration controls.

---

## Supported Programming Languages

| Language | File Extension | Normalized Key |
| :--- | :--- | :--- |
| **JavaScript** | `.js` | `javascript`, `js` |
| **Python** | `.py` | `python`, `python3`, `py` |
| **TypeScript** | `.ts` | `typescript`, `ts` |
| **Java** | `.java` | `java` |
| **Go** | `.go` | `golang`, `go` |
| **Rust** | `.rs` | `rust`, `rs` |

---

## Installation & Setup

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/your-username/LeetCodeSync.git
   ```
2. **Open Chrome Extension Manager**:
   - Navigate to `chrome://extensions/` in Google Chrome.
   - Toggle **Developer mode** in the top right corner.
   - Click **Load unpacked** and select the root directory of this repository (`LeetCodeSync`).
3. **Configure GitHub Access**:
   - Click the extension icon in the toolbar.
   - Click the **⚙ (Settings)** button.
   - Generate a [GitHub Personal Access Token (Fine-grained)](https://github.com/settings/tokens?type=beta):
     - **Repository permissions**:
       - `Contents`: Read and write
       - `Metadata`: Read-only
   - Enter your Token, Repository Owner, Repository Name, Branch (`main`), and target directory (`leetcode`).
   - Click **Test Connection** to verify, then click **Save Settings**.
4. **Solve LeetCode Problems**:
   - Go to any problem on [LeetCode](https://leetcode.com/problems/two-sum/) and click **Submit**.
   - Upon receiving an **Accepted** verdict, LeetCodeSync will automatically update your daily streak and commit your solution to GitHub!

---

## Project Structure

```
LeetCodeSync/
├── manifest.json              # Chrome Manifest V3 configuration
├── background/
│   └── service-worker.js      # Background coordinator, queue manager & alarms
├── content/
│   └── leetcode.js            # Content script detecting submissions & parsing data
├── lib/
│   ├── github.js              # GitHub Git Data API client (trees, commits, blobs)
│   ├── streak-calculator.js   # Pure functional consistency & streak engine
│   ├── commit-generator.js    # Performance-based commit message builder
│   ├── language-detector.js   # 6-language detector & extension resolver
│   └── markdown-generator.js  # Clean problem description to Markdown converter
├── storage/
│   ├── config-store.js        # GitHub credentials & settings storage
│   ├── progress-store.js      # Daily progress & streak storage
│   └── submission-store.js    # Synced submission deduplication & retry queue
├── popup/
│   ├── popup.html             # GitHub dark-themed dashboard UI (380x560px)
│   ├── popup.css              # Dark theme styling
│   ├── popup.js               # Dashboard controller & state binder
│   ├── settings.html          # Configuration & token management interface
│   ├── settings.css           # Settings form styling
│   └── settings.js            # Settings controller & connection tester
├── icons/                     # Extension icons (16px, 32px, 48px, 128px)
├── tests/                     # Automated test suites (32 unit tests)
│   ├── streak-calculator.test.js
│   ├── commit-generator.test.js
│   ├── language-detector.test.js
│   ├── markdown-generator.test.js
│   ├── github.test.js
│   └── storage.test.js
├── package.json
└── README.md
```

---

## Running Tests

Run the full automated test suite using Node.js built-in test runner:

```bash
npm test
```

---

## License

MIT
