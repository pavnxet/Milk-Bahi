from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 375, 'height': 812}) # Mobile viewport
    page = context.new_page()

    # Handle dialogs (alerts/confirms)
    page.on("dialog", lambda dialog: dialog.accept())

    # 1. Load App
    print("Loading app...")
    page.goto("http://localhost:8000")
    page.wait_for_selector("#login-screen")
    page.screenshot(path="verification_1_login.png")

    # 2. Login
    print("Logging in...")
    page.fill("#secret-code-input", "MOM-MILK-2024")
    page.click("#login-btn")

    # Wait for dashboard
    page.wait_for_selector("#dashboard:not(.hidden)")
    print("Dashboard loaded.")
    page.screenshot(path="verification_2_dashboard.png")

    # 3. Add Entry
    print("Adding entry...")
    # Decrease qty to 0.5
    page.click("#decrease-qty")
    # Save
    page.click("#save-entry-btn")
    # Alert is handled by dialog handler

    # Wait a bit for save
    page.wait_for_timeout(500)

    # 4. Verify History Tab
    print("Checking History Tab...")
    page.click("button[data-target='tab-history']")
    page.wait_for_selector("#tab-history.active")
    page.wait_for_timeout(500) # wait for render
    page.screenshot(path="verification_3_history.png")

    # 5. Verify Analytics Tab
    print("Checking Analytics Tab...")
    page.click("button[data-target='tab-analytics']")
    page.wait_for_selector("#tab-analytics.active")
    page.wait_for_timeout(500) # wait for render
    page.screenshot(path="verification_4_analytics.png")

    browser.close()
    print("Verification complete.")

with sync_playwright() as playwright:
    run(playwright)
