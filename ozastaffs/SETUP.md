# OZA Accommodation — Setup

1. **Firebase project**
   - console.firebase.google.com → Add project (any name, e.g. `oza-accommodation`)
   - Build → Firestore Database → Create database → production mode → nearest region
   - Build → Authentication → Sign-in method → enable **Anonymous**
   - Project settings → General → Add app → Web (`</>`) → copy the `firebaseConfig` object

2. **Paste config**
   - Open `index.html`, find `firebaseConfig` near the top, replace the 6 `PASTE_...` values with the ones you copied.

3. **Security rules**
   - Firestore → Rules tab → paste the contents of `firestore.rules` → Publish.

4. **Deploy**
   - Push `index.html` to the subdomain repo, same way as the Al Abbar demo. It's fully self-contained now — logo included, no separate `logo.jpg` needed.

5. **First load**
   - Open the site once → it auto-imports all 479 existing staff into Firestore, and sets two default codes: **Admin: 1234** (you — sees More/Settings) and **Staff: 5678** (Fazl — same full access, no Settings tab).
   - Go to More → set real Admin and Staff codes immediately. Give Fazl only the staff one.
   - Already ran this once with the old single-PIN version? No action needed — it migrates automatically: your existing `1234` becomes the Admin code, and a default Staff code (`5678`) is added.

6. **Re-import**
   - "Re-import Original Register" in More → Danger Zone reloads the original 479 records and **wipes any edits made since**. Only for a real reset.

## What's assumed / not in the original Excel
- Per-room capacity: no fixed capacity existed in the sheet (people were added beyond the original row groups). Each room's capacity was set to its current headcount on import — open a room and adjust the number if it can actually hold more.
- 3 occupants had `Vacation`/`N/A` instead of a mobile number — mobile left blank, status note added.
- Only Building 96 is split into GF/FF (per your instruction); 95 is single-list for now even though it also has two floors — add that later the same way if needed.
- Non-residential buildings from the layout image (Workshop 82, Admin 1/2, Kitchen, Store, Mosque) and toilet-count tracking are **not** in this build — flag if you want them added.
