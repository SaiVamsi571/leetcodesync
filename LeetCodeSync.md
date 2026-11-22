Technical Requirements Document (TRD)

LeetCode → GitHub Sync

Document Information	Details
Product Name	        LeetCodeSync
Version	                1.2
Status	                Proposed
Platform	            Google Chrome Extension
Extension Standard	    Manifest V3
Primary Integrations	LeetCode, GitHub
Document Type	        Technical Requirements Document

1. Project Overview
1.1 Objective

Build a custom Chrome extension that automatically synchronizes Accepted LeetCode submissions to a specified GitHub repository.

The extension will also include a weekly consistency tracker to encourage users to solve at least one LeetCode problem every day.

The product has two primary responsibilities:

Automatically maintain an organized GitHub repository of LeetCode solutions.
Encourage daily problem-solving through weekly goals, streaks, and progress visualization.
1.2 Core Features
Automatic LeetCode submission detection.
Accepted-only synchronization.
Automatic problem statement extraction.
Automatic solution code extraction.
Programming language detection.
Runtime and memory statistics extraction.
Automatic README generation.
GitHub repository synchronization.
Automatic Git commit generation.
Duplicate submission prevention.
Weekly LeetCode progress tracker.
Current and longest streak tracking.
Popup dashboard.
Configurable GitHub repository settings.
2. Supported Programming Languages

The extension must support the following six languages:

Language	File Extension
JavaScript	.js
Python	.py
TypeScript	.ts
Java	.java
Go	.go
Rust	.rs

Language detection must use LeetCode submission metadata rather than relying exclusively on source-code syntax.

The architecture should allow additional languages to be supported in the future without significant changes.

3. Scope
3.1 In Scope
Detect LeetCode submissions.
Verify final submission verdicts.
Synchronize Accepted submissions only.
Extract problem metadata.
Extract original problem descriptions.
Extract submitted source code.
Detect programming languages.
Extract runtime and memory statistics.
Generate Markdown README files.
Create and update GitHub files.
Generate performance-based commit messages.
Track daily Accepted submissions.
Display weekly progress.
Maintain daily streaks.
Persist historical progress.
Configure GitHub integration.
Display recent synchronization history.
Handle API failures and retries.
3.2 Out of Scope — Initial Version
Synchronizing unsuccessful submissions.
Supporting platforms other than LeetCode.
Supporting GitLab or Bitbucket.
Automatically generating optimized solutions.
AI-generated complexity analysis.
Automatic GitHub repository creation.
Social leaderboards.
Multi-user synchronization.
Cloud-based user accounts.
4. Functional Requirements — LeetCode Integration
FR-01: Submission Detection

The extension must detect when a user submits a solution on LeetCode.

Requirements:

Detect submission activity automatically.
Retrieve the submission ID.
Retrieve the problem ID.
Identify the submission language.
Identify the final submission verdict.
Avoid processing the same submission repeatedly.

Submission detection must not require users to manually trigger synchronization.

FR-02: Accepted Submission Filtering

Only submissions with an Accepted verdict should proceed to GitHub synchronization.

Submission Status	Action
Accepted	Synchronize
Wrong Answer	Ignore
Time Limit Exceeded	Ignore
Memory Limit Exceeded	Ignore
Runtime Error	Ignore
Compilation Error	Ignore
Pending	Wait for final verdict
Other unsuccessful verdicts	Ignore

The extension must verify the final verdict before processing a submission.

FR-03: Problem Information Extraction

Extract:

Problem ID.
Problem title.
Problem URL.
Problem description.
Examples.
Constraints.
Submission ID.

The extracted information should be used to construct the corresponding GitHub directory and README file.

FR-04: Source Code Extraction

Retrieve the exact source code associated with the Accepted submission.

Requirements:

Preserve indentation.
Preserve formatting.
Preserve comments.
Preserve source-code content.
Identify the programming language.
Generate the appropriate file extension.

The extension must not accidentally retrieve code from an earlier unsuccessful submission.

FR-05: Runtime and Memory Extraction

Extract the following submission statistics:

Runtime.
Runtime percentile.
Memory consumption.
Memory percentile.

Example:

Time: 59 ms (72.10%) | Memory: 52.2 MB (8.84%)

The statistics must come from the corresponding Accepted submission.

If some metrics are unavailable, the extension must use an explicitly defined fallback format rather than inventing values.

5. GitHub Repository Management
FR-06: Repository Structure

The default repository structure should be:

text
leetcode/
│
├── 0001 - Two Sum/
│   ├── README.md
│   └── two_sum.js
│
├── 0002 - Add Two Numbers/
│   ├── README.md
│   └── add_two_numbers.py
│
├── 0003 - Longest Substring Without Repeating Characters/
│   ├── README.md
│   ├── longest_substring_without_repeating_characters.ts
│   └── longest_substring_without_repeating_characters.go
│
└── 0004 - Median of Two Sorted Arrays/
    ├── README.md
    └── median_of_two_sorted_arrays.rs

Folder Naming

Two naming conventions should be supported:

Option A:

0001 - Two Sum

Option B:

Two Sum

Default: 0001 - Two Sum.

The naming convention must be configurable from the popup settings.

FR-07: README Generation

Every problem directory must contain a README.md.

Suggested structure:

markdown
# Two Sum

**Problem Number:** 1

**LeetCode:** https://leetcode.com/problems/two-sum/

## Problem Description

Given an array of integers nums and an integer target,
return indices of the two numbers such that they add up
to target.

## Examples

### Example 1

Input:
nums = [2,7,11,15], target = 9

Output:
[0,1]

## Constraints

- 2 <= nums.length <= 10^4

## Solution

Language: JavaScript


Requirements:

Extract the original problem description.
Preserve Markdown formatting.
Preserve examples.
Preserve constraints.
Include the LeetCode problem link.
Avoid generating fabricated problem content.

The initial version does not need AI-generated explanations or complexity analysis.

FR-08: Solution File Generation

The extension must generate the solution filename using the problem slug and detected language.

Examples:

two_sum.js
two_sum.py
two_sum.ts
two_sum.java
two_sum.go
two_sum.rs

Requirements:

Preserve the exact submitted source code.
Use the correct file extension.
Update the corresponding file when a newer Accepted submission is made in the same language.
Preserve solutions written in other languages.
FR-09: Existing Problem Handling

If a problem folder already exists:

Do not create a duplicate folder.
Update the existing solution file when content changes.
Preserve solutions in other languages.
Preserve the README unless problem metadata changes.
Avoid unnecessary GitHub commits when file contents are unchanged.

Example:

A problem initially solved in Python and subsequently solved in Go should result in:

text
0001 - Two Sum/
├── README.md
├── two_sum.py
└── two_sum.go


Both solutions must remain available.

FR-10: Duplicate Submission Prevention

Use the LeetCode submission ID as the unique identifier for submission processing.

Requirements:

Store successfully synchronized submission IDs.
Avoid duplicate processing.
Avoid duplicate commits for the same submission.
Support retrying failed synchronization.
Mark a submission as synchronized only after successful GitHub synchronization.
6. GitHub Commit Management
FR-11: Commit Message Generation

Every successful synchronization must generate a commit message based on LeetCode performance statistics.

The exact required format is:

text
Time: 59 ms (72.10%) | Memory: 52.2 MB (8.84%)

Requirements
Extract runtime from the Accepted submission.
Extract runtime percentile.
Extract memory consumption.
Extract memory percentile.
Preserve the exact formatting.
Do not use generic messages such as Add Two Sum solution.
Do not invent missing performance metrics.
Commit Strategy

Use Git Trees and Git Commits APIs to group the README and solution changes into one atomic commit.

For example:

text
Commit:
Time: 59 ms (72.10%) | Memory: 52.2 MB (8.84%)

Files changed:
- 0001 - Two Sum/README.md
- 0001 - Two Sum/two_sum.js


If no repository content changes, do not create an unnecessary commit.

7. GitHub API Integration
FR-12: Authentication

Use a GitHub fine-grained Personal Access Token.

Required permissions:

Contents: Read and write.
Metadata: Read-only.

Repository access should be restricted to the selected repository.

The token must:

Be stored securely using Chrome Storage.
Never be exposed to LeetCode page scripts.
Never be included in logs.
Never be transmitted to unrelated services.
FR-13: GitHub Configuration

Users must be able to configure:

GitHub access token.
Repository owner.
Repository name.
Target branch.
Target directory.
Folder naming convention.
FR-14: GitHub API Operations

Use the GitHub REST API for repository operations.

Important operations:

Read repository information.
Read existing files.
Retrieve existing Git references.
Create Git blobs.
Create Git trees.
Create Git commits.
Update branch references.

Primary API:

POST /repos/{owner}/{repo}/git/commits

The Git Data API should be used for atomic multi-file updates.

8. Weekly LeetCode Consistency Tracker
FR-15: Daily Goal Tracking

The extension must include a weekly tracker that encourages solving at least one LeetCode problem every day.

Daily Completion Rule

A day is considered complete when the user has at least one Accepted submission on that calendar day.

Submission Activity	Daily Completion
One Accepted submission	Complete
Multiple Accepted submissions	Complete
Only Wrong Answer submissions	Incomplete
Only TLE submissions	Incomplete
Only Runtime Error submissions	Incomplete
No submissions	Incomplete

The tracker must use the user's local timezone.

Important Rule

The weekly tracker and GitHub synchronization must operate independently.

If GitHub is unavailable, a verified Accepted submission must still count toward daily progress.

FR-16: Weekly Progress Display

Display seven daily indicators, Monday through Sunday.

Example:

text
WEEKLY CHALLENGE                 🔥 4

 M     T     W     T     F     S     S
 ✓     ✓     ✓     ✓     ○     ○     ○

       4 / 7 DAYS COMPLETED

       Goal: 1 Accepted / day


Requirements:

Display the current week's progress.
Show completed days using checkmarks.
Show incomplete days using empty indicators.
Display completed days out of seven.
Calculate weekly completion percentage.
Update automatically after Accepted submissions.
Preserve historical weekly progress.
FR-17: Streak Management

Maintain two streak metrics.

Current Streak

Number of consecutive completed calendar days.

Rules:

A completed day increments the streak.
A missed day breaks the streak.
The current day does not break an existing streak until that day ends.
Multiple Accepted submissions on the same day count as one completed day.
Longest Streak

Maintain the highest number of consecutive completed calendar days recorded.

Example:

text
🔥 Current Streak: 4 days
🏆 Longest Streak: 12 days

FR-18: Weekly Statistics

Display:

Days completed this week.
Weekly completion percentage.
Current streak.
Longest streak.
Total Accepted problems this week.

Formula:

Weekly completion = (Completed days / 7) × 100

FR-19: Historical Progress

The extension must retain daily completion records.

Requirements:

Preserve previous weeks.
Display the correct current week.
Do not delete historical progress when a new week starts.
Recalculate streaks from daily history.
Support browser restarts.
FR-20: Tracker Data Storage

Use Chrome Storage API to persist daily progress.

Suggested structure:

json
{
  "dailyProgress": {
    "2026-11-19": {
      "completed": true,
      "acceptedCount": 2
    },
    "2026-11-20": {
      "completed": true,
      "acceptedCount": 1
    },
    "2026-11-21": {
      "completed": false,
      "acceptedCount": 0
    }
  },
  "currentStreak": 2,
  "longestStreak": 12,
  "totalAccepted": 42
}


The daily completion history is the source of truth. Streak values should be recalculated rather than relying exclusively on incrementing counters.

9. Chrome Extension Popup

The popup should be compact, visually clean, and inspired by GitHub's dark theme.

Target dimensions: approximately 380 × 560 px.

FR-21: Popup Dashboard

The popup must contain the following sections in order.

1. Header
Extension name.
GitHub connection indicator.
Settings icon.
2. Auto Sync
ON/OFF toggle.
Accepted-only synchronization label.
3. Weekly Challenge
Seven-day progress indicator.
Completed days.
Weekly completion percentage.
Current streak.
Longest streak.
Daily goal description.
4. GitHub Repository
Connected repository.
Repository owner.
Branch.
Test connection action.
5. Statistics
Total synchronized submissions.
Last synchronization time.
6. Recent Submissions

Display:

Problem title.
Programming language.
Runtime.
Memory.
Synchronization status.
7. Footer
Settings.
View GitHub repository.
9.1 Popup Wireframe
text
┌────────────────────────────────────┐
│ ⚡ LeetCode GitHub Sync        ⚙   │
│ ● GitHub Connected                 │
├────────────────────────────────────┤
│ AUTO SYNC                    [ ON ]│
│ Accepted submissions only          │
├────────────────────────────────────┤
│ WEEKLY CHALLENGE              🔥 4  │
│                                    │
│ M    T    W    T    F    S    S   │
│ ✓    ✓    ✓    ✓    ○    ○    ○   │
│                                    │
│       4 / 7 DAYS COMPLETED         │
│       Current Streak: 4 days       │
│       Longest Streak: 12 days      │
│       Goal: 1 Accepted / day       │
├────────────────────────────────────┤
│ GITHUB REPOSITORY                  │
│ user/leetcode                      │
│ Branch: main                       │
│ [ Test Connection ]                │
├────────────────────────────────────┤
│ STATISTICS                         │
│ 42 Synced       2 min ago          │
├────────────────────────────────────┤
│ RECENT SUBMISSIONS                 │
│ ✓ Two Sum       JS     59 ms       │
│ ✓ Valid Anagram Python 42 ms       │
│ ✓ Binary Search Go     12 ms       │
├────────────────────────────────────┤
│ [ Settings ]        [ View GitHub ]│
└────────────────────────────────────┘

FR-22: Settings Interface

The settings interface must support:

GitHub token management.
Repository owner configuration.
Repository name configuration.
Branch configuration.
Target directory configuration.
Folder naming preferences.
Automatic synchronization toggle.
GitHub connection testing.
10. System Architecture
10.1 Technology Stack
Component	Technology
Browser Extension	Chrome Manifest V3
Content Script	JavaScript
Background Processing	Service Worker
Popup UI	HTML, CSS, JavaScript
GitHub Integration	GitHub REST API
Local Persistence	Chrome Storage API
Authentication	GitHub Fine-grained PAT
Data Format	JSON, Markdown
10.2 Project Structure
text
leetcode-github-sync/
│
├── manifest.json
│
├── popup/
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   └── settings.html
│
├── content/
│   └── leetcode.js
│
├── background/
│   └── service-worker.js
│
├── lib/
│   ├── github.js
│   ├── problem-parser.js
│   ├── submission-parser.js
│   ├── language-detector.js
│   ├── markdown-generator.js
│   ├── commit-generator.js
│   └── streak-calculator.js
│
├── storage/
│   ├── submission-store.js
│   └── progress-store.js
│
├── icons/
│
└── README.md

10.3 Component Responsibilities
Content Script
Detect LeetCode submission events.
Retrieve submission identifiers.
Collect submission-related information.
Communicate with the background service worker.
Background Service Worker
Coordinate submission processing.
Verify Accepted status.
Handle duplicate prevention.
Manage synchronization queues.
Generate files.
Perform GitHub API requests.
Update synchronization status.
Update daily progress independently of GitHub availability.
Problem Parser
Extract problem ID.
Extract problem title.
Extract problem description.
Extract examples and constraints.
Submission Parser
Extract submission ID.
Extract verdict.
Extract source code.
Extract runtime and memory statistics.
Language Detector
Detect the programming language.
Map languages to file extensions.
Markdown Generator
Generate README files.
Preserve original problem content.
Format examples and constraints.
GitHub Module
Authenticate.
Retrieve repository information.
Read existing files.
Create or update files.
Create atomic commits.
Commit Generator
Format runtime and memory statistics.
Generate the requested commit message.
Streak Calculator
Determine completed calendar days.
Calculate weekly progress.
Calculate current streak.
Calculate longest streak.
Handle local date boundaries.
Storage Modules
Maintain synchronized submission IDs.
Store pending synchronization tasks.
Store daily Accepted submission history.
Persist configuration and tracker data.
11. System Data Flow
11.1 Submission Synchronization
text
User submits solution
        |
        v
LeetCode submission detected
        |
        v
Retrieve Submission ID
        |
        v
Verify final verdict
        |
        v
Is Accepted?
   /          \
 No            Yes
 |              |
Ignore       Extract Details
                  |
                  v
          Extract Source Code
                  |
                  v
          Detect Language
                  |
                  v
          Extract Performance
                  |
                  v
          Generate README
                  |
                  v
          Generate Solution File
                  |
                  v
          Check GitHub Files
                  |
                  v
          Generate Git Commit
                  |
                  v
          Push to GitHub
                  |
                  v
          Mark Submission Synced

11.2 Weekly Tracker Flow
text
Accepted submission detected
          |
          v
Verify Accepted verdict
          |
          v
Extract local calendar date
          |
          v
Update daily Accepted count
          |
          v
Mark day as completed
          |
          v
Recalculate weekly progress
          |
          v
Recalculate streaks
          |
          v
Persist tracker history
          |
          v
Update popup dashboard


These two workflows must remain independent.

12. Error Handling
Scenario	Expected Behavior
GitHub authentication failure	Display authentication error
Repository not found	Display repository error
Submission pending	Wait for final verdict
Submission rejected	Ignore
Missing problem description	Retry extraction
Missing source code	Retry extraction
API rate limit	Retry with backoff
Network failure	Preserve pending task
Duplicate submission	Skip duplicate processing
Existing solution	Update only when content differs
GitHub unavailable	Continue local tracker update
Browser restart	Restore pending tasks and tracker history

Failed synchronization must never be marked as successful.

13. Security Requirements
Never expose GitHub tokens to LeetCode page scripts.
Perform GitHub API requests from the extension background service worker.
Request minimum GitHub permissions.
Do not store LeetCode passwords.
Do not transmit source code to third-party services.
Validate extracted data before creating files.
Never log authentication tokens.
Use HTTPS for external communication.
Restrict token access to trusted extension contexts.
Avoid storing unnecessary LeetCode session information.
14. Non-Functional Requirements
14.1 Performance
Submission detection must not noticeably affect LeetCode usability.
Avoid unnecessary polling.
Perform GitHub operations asynchronously.
Keep popup loading time minimal.
14.2 Reliability
Handle Chrome service worker termination.
Persist pending tasks.
Retry transient failures.
Prevent duplicate commits.
Preserve tracker history.
14.3 Maintainability
Separate UI, parsers, API clients, and storage.
Use reusable modules.
Keep language mappings configurable.
Isolate LeetCode-specific extraction logic.
Avoid coupling the extension to a single page layout.
14.4 Compatibility
Chrome Manifest V3.
Current LeetCode submission workflow.
All six supported languages.
GitHub REST API.
15. Acceptance Criteria
LeetCode Integration
Submission events are detected.
Only Accepted submissions are processed.
Submission IDs are extracted.
Problem information is extracted correctly.
Exact submitted source code is preserved.
All six programming languages are supported.
Runtime and memory metrics are extracted.
GitHub Integration
GitHub authentication works.
Repository configuration works.
Problem folders are created automatically.
README files contain problem descriptions.
Correct solution extensions are generated.
Existing solutions are preserved.
Existing files are updated correctly.
Commit messages follow the required format.
Duplicate commits are prevented.
GitHub failures can be retried.
Weekly Tracker
One Accepted submission completes a day.
Multiple Accepted submissions count as one completed day.
Rejected submissions do not complete a day.
Weekly indicators update automatically.
Weekly progress is calculated correctly.
Current streak is calculated correctly.
Longest streak is preserved.
Historical data survives browser restarts.
Local timezone is respected.
Tracker works independently of GitHub availability.
Popup
GitHub connection status is visible.
Auto Sync can be enabled and disabled.
Weekly tracker is displayed.
Repository details are displayed.
Synchronization statistics are displayed.
Recent submissions are displayed.
Settings are accessible.
16. Development Roadmap
Phase 1 — Extension Foundation
Create Chrome Manifest V3 project.
Set up popup interface.
Implement content script.
Implement background service worker.
Establish messaging between components.

Deliverable: Working extension skeleton.

Phase 2 — LeetCode Integration
Detect submissions.
Extract submission IDs.
Verify Accepted verdicts.
Extract problem metadata.
Extract source code.
Detect programming language.
Extract runtime and memory statistics.

Deliverable: A locally captured Accepted submission object.

Phase 3 — GitHub Integration
Implement GitHub authentication.
Connect to the configured repository.
Create problem directories.
Generate README files.
Upload solution files.
Generate performance-based commits.
Implement existing-file updates.

Deliverable: Fully working LeetCode-to-GitHub synchronization.

Phase 4 — Weekly Tracker
Implement daily Accepted submission tracking.
Implement weekly progress calculation.
Implement current streak.
Implement longest streak.
Persist daily history.
Display weekly progress in popup.

Deliverable: Functional consistency tracker.

Phase 5 — Dashboard and Settings
Build complete popup.
Implement GitHub configuration.
Add connection testing.
Add recent synchronization history.
Add synchronization controls.
Add error indicators.

Deliverable: Complete extension interface.

Phase 6 — Reliability and Testing
Test all six languages.
Test Accepted and rejected submissions.
Test duplicate submission handling.
Test GitHub API failures.
Test browser restarts.
Test timezone boundaries.
Test streak calculations.
Test repository updates.

Deliverable: Stable local release.

17. Future Enhancements

Potential future features:

Monthly consistency calendar.
GitHub contribution-style heatmap.
Difficulty-based statistics.
Easy, Medium, and Hard problem breakdown.
Total problems solved.
Language-wise problem statistics.
Solution complexity analysis.
Multiple repository support.
Additional coding platform integrations.
Weekly achievement badges.
Custom daily problem goals.
Exportable progress reports.

These features are not required for the initial release.

18. Final Product Definition

The final product is a lightweight Chrome extension that combines automatic LeetCode-to-GitHub synchronization with a personal coding consistency tracker.

Primary Responsibility 1: GitHub Automation

Every Accepted LeetCode submission should automatically generate or update:

One problem directory.
One README containing the original problem.
One language-specific solution file.
One Git commit containing the runtime and memory statistics.
Primary Responsibility 2: Daily Consistency

The extension should encourage users to solve at least one LeetCode problem every day.

It must provide:

Seven-day weekly progress.
Daily completion indicators.
Current streak.
Longest streak.
Historical progress.
Weekly statistics.
Core Product Principle

Solve one problem every day. Let the extension handle the rest.