# Summit — Team updates

A local, browser-based prototype for Important Employee Updates. Built with React, TypeScript, and Vite.

## Run locally

Requires Node.js 22.18+ (Node 24+ recommended) and npm.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite (usually http://127.0.0.1:5173).

```sh
npm test       # Audience and acknowledgment behavior
npm run build # Type checking and production build
npm run preview # Serve the production build
```
## Demo
[![](https://markdown-videos-api.jorgenkh.no/youtube/3eXyVtZXm2E)](https://youtu.be/3eXyVtZXm2E)

## Demo walkthrough

1. As **Manager**, choose Michael Torres in **Demo manager**. Create an announcement for all employees or selected stores and enable **Require acknowledgment**. Review, then publish.
2. Switch to **Employee**, using the demo employee selector to choose a recipient. Open the new update and select **I've read and understood**.
3. Switch back to **Manager** and open **View tracking** on an announcement. Tracking defaults to **Awaiting acknowledgment** when confirmations are pending for the selected manager’s scope, or **All employees** when complete. Use the status dropdown to change the filter. Change **Demo manager** to see updates, counts, and recipient lists for their store; Michael sees all stores.
4. Select an employee at an excluded store to verify that targeted updates stay out of their feed.
5. In **Demo manager**, choose a store manager or assistant store manager. Create an announcement: its audience is fixed to their assigned store, and the selected manager appears as the author.
6. As an employee, add a comment to a post. Switch to a manager to see its **new** comment badge. Click the comment count to open the thread and clear that manager’s badge; another manager still sees it as new until they open it.
7. Refresh to verify saved changes. Use **Reset demo** to restore the original dataset.

## Product choices

- Managers land on **Requires acknowledgment**, with **All updates** second. Fully acknowledged posts leave **Requires acknowledgment** and remain in **All updates**. Completion and the outstanding-update count follow the manager’s store scope; overall acknowledgment rates still include completed posts. Manager rows show the title, acknowledgment count, and **View tracking** action; opening the title shows the full message. In **All updates**, required announcements precede informational announcements, newest first within each group.
- Employees have three tabs: **To acknowledge**, **All updates**, and **Archives**. They land on **To acknowledge** when entering employee view or switching demo employees. When nothing is pending, the caught-up state links to all updates.
- Acknowledging an important update automatically archives it for that employee. Informational messages offer **Move to archive** in the feed and full message. Archived messages leave **All updates**, remain readable in **Archives**, and persist per employee without affecting manager tracking. Existing acknowledgments are automatically treated as archived.
- All users can comment on posts shared with them, including archived posts. Cards display total comments; managers also see a per-manager **new** badge. Clicking the comment count opens the thread and clears that manager’s new badge, preserving total comments. A manager’s own replies do not count as new to them. Comments and read receipts persist alongside announcements.
- Demo employee and manager pickers use app-styled dropdowns with search by name, store, or role, grouped store lists, selected-person indicators, and keyboard navigation.
- Employee experience emphasizes relevant updates and essential acknowledgments, with no repeated pop-ups or interruptions.
- Opening the full announcement precedes acknowledgment. Confirmation is explicit; opening a post is not treated as proof it was read.
- Manager feeds, acknowledgment summaries, and tracking recipient lists follow the selected manager’s store. Michael sees all stores. Changing demo managers clears stale searches and dialogs on the main announcements page. Managers can search confirmations and outstanding recipients by name or store. Rates count recipient/update pairs, not unique employees.
- Michael (Operations Manager) can publish to all employees or selected stores. Each store has a mock Store Manager and Assistant Store Manager, both restricted to publishing to their own store. The publishing function enforces this rule as well as the composer.
- 200 mock employees (including the ten store leaders), evenly split across five stores; the initial feed includes targeted updates and partial acknowledgment records.
- Store managers and assistants can open required updates from Michael and select **I’ve read and understood** in their manager view. Their confirmation uses the same identity and tracking record as their employee view. Required store-authored updates automatically acknowledge their author on publication; older saved posts receive the same author confirmation on reload.
- A review step helps managers check message, audience, and acknowledgment requirements before publication.
- Data persists in localStorage for this browser and origin. No backend, authentication, cross-device sync, notifications, or delivery guarantees. Role switching is for demonstration only.
- Attachments, editing, scheduling, due dates, and automated reminders are deliberately deferred to keep the first version focused.
- Fonts load optionally from Google Fonts; system fallbacks keep the app usable offline.

## Structure

- `src/main.tsx`: manager and employee views, publishing, detail and tracking dialogs.
- `src/model.ts`: typed records, mock data, audience rules, acknowledgment handling, storage loading.
- `src/styles.css`: responsive layout and visual styling.
- `src/model.test.ts`: core behavior checks using the Node test runner.
