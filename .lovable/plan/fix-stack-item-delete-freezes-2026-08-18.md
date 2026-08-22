# Fix: stack item delete freezes

## What I checked

The database side is healthy: the delete permissions and ownership rules on your stack table are correct, and all child records (schedule events, reminders, vials, injection sites, scan history, skip rules) are set to auto-delete with the item. So the failure is in the app screen, not the data.

Looking at the delete handler on the stack card, there are two real ways it can freeze — this is the unconfirmed part of the diagnosis, and step 1 below pins it down:

1. **No error safety net.** The delete call is awaited with no try/catch. If the request never resolves (dropped connection, phone asleep, slow network), the button stays in its spinning "busy" state forever, the confirm dialog stays open, and every other button on the card stays disabled. That matches "frozen, can't remove it".
2. **Confirm dialog scroll lock.** The confirm dialog cancels its own close on the Remove click and waits for the request. If the request hangs or errors out of the flow, the dialog's page-lock can remain applied, which makes the whole page feel unclickable.

## The fix

1. **Reproduce first** — drive the stack screen and click delete with a stalled/failed network to confirm which of the two paths freezes, then fix against the observed behaviour rather than the guess.
2. **Make the delete unfreezable**
   - Wrap the request in try/catch/finally so the busy state always clears, even on a thrown/rejected request.
   - Add a request timeout (about 12 seconds). On timeout, clear busy, close the dialog, and show "Couldn't reach the server — check your connection and try again."
   - Always close the confirm dialog before showing any toast, so the page lock is released on every path.
3. **Optimistic removal with rollback** — remove the card from the list immediately on success and refresh in the background; if the request later fails, restore the card and show the error. This stops the "tap, nothing happens, tap again" loop.
4. **Recovery guard** — if a page lock is somehow left behind after the dialog closes, clear it, so the screen can never end up unclickable.
5. Apply the same hardening to the pause/resume toggle on the same card, which has the identical unprotected await.

## Tests

- Unit tests for the delete handler: success, server error, zero rows affected, thrown network error, and timeout — asserting busy always clears and the dialog always closes.
- An end-to-end check that after a failed delete the card's other buttons are still clickable.

No styling or layout changes.
