from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 375, 'height': 812}) # Mobile viewport
    page = context.new_page()

    # Handle dialogs (alerts/confirms)
    page.on("dialog", lambda dialog: dialog.accept())

    # 1. Load App - Should be Dashboard immediately
    print("Loading app...")
    page.goto("http://localhost:8000")
    page.wait_for_selector("#dashboard")
    page.screenshot(path="verification_1_dashboard.png")

    # 2. Add Entry (Dual)
    print("Adding dual entry...")
    # Add Cow (1.5L)
    page.click("#inc-cow") # 0.5
    page.click("#inc-cow") # 1.0
    page.click("#inc-cow") # 1.5

    # Add Buffalo (1.0L)
    page.click("#inc-buff") # 0.5
    page.click("#inc-buff") # 1.0

    page.screenshot(path="verification_2_entry_controls.png")

    # Save
    page.click("#save-entry-btn")
    page.wait_for_timeout(500)
    page.screenshot(path="verification_3_dashboard_updated.png")

    # 3. Verify Analytics Tab
    print("Checking Analytics Tab...")
    page.click("button[data-target='tab-analytics']")
    page.wait_for_selector("#tab-analytics.active")
    page.wait_for_timeout(500)
    page.screenshot(path="verification_4_analytics.png")

    # 4. Verify History Tab
    print("Checking History Tab...")
    page.click("button[data-target='tab-history']")
    page.wait_for_selector("#tab-history.active")
    page.wait_for_timeout(500)
    page.screenshot(path="verification_5_history.png")

    # 5. Verify Settings
    print("Checking Settings...")
    page.click("#settings-btn")
    page.wait_for_selector("#settings-modal.active")
    page.screenshot(path="verification_6_settings.png")

    browser.close()
    print("Verification complete.")

with sync_playwright() as playwright:
    run(playwright)
