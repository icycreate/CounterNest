# CounterNest — first-time walkthrough and demo guide

## Start the interactive tutorial

Sign in and finish any required account/business setup. On your first Dashboard visit, the inline CounterNest walkthrough opens when no transaction or dialog is active. It does not cover the screen with a modal or take keyboard focus automatically.

Use **Next** and **Previous** to read the guide, or select a topic. **Open this screen** navigates through the normal app navigation; existing unsaved-change confirmation still applies. Reading a step is not the same as completing a business operation. The tutorial never clicks Save, submits an order, changes stock or confirms payment for you.

Choose **View later** or **Hide tutorial** to dismiss it. Select **Tutorials** near the top of the internal workspace to reopen it at your saved topic. **Restart tour** begins again. **Finish tour** marks the guide as read and stops automatic first-use display. You can still reopen it whenever needed.

Progress is separate for each account/workspace on that browser/device. It is not synced to other devices. Clearing browser storage resets it. If browser storage is blocked, the tutorial still works for the current session. The public customer Catalogue does not display the internal staff tutorial.

## A 12-minute demonstration

Use an existing, separately configured demo workspace with fictional customer details and sample products. This update does not create, reset or seed a demo workspace. If you only have a real business workspace, demonstrate viewing and navigation without saving changes, submitting requests or completing payments.

### 1. Welcome and navigation — 1 minute

Open the Dashboard and Tutorials. Explain that topics follow the signed-in role. An administrator sees setup and Catalogue editing topics; other staff see only permitted screens. Select a topic, move forward/back, hide the tutorial and reopen it.

Suggested narration: “CounterNest keeps the sales, customer-order and stock workflows in one workspace. This guide helps you find each screen without making changes for you.”

### 2. Business settings and languages — 1 minute

As an administrator, open Settings from the tutorial. Show the business profile, appearance and system language controls. Switch between English, Spanish, Traditional Chinese and Simplified Chinese. Tutorial controls update immediately. Existing business/product/customer text stays unchanged.

Suggested narration: “Interface language and business-authored content are separate. Your chosen language changes the controls, not your product names.”

### 3. Products and New Sale — 2 minutes

Show Products, then the New Sale topic. Open the screen and explain direct product selection, the cart, quantities and totals. In a demo workspace you may add an item to illustrate the cart. Do not confirm payment during a read-only presentation. Remove demonstration cart items afterward if applicable.

Suggested narration: “Staff use this cart for checkout. Customers use the public Catalogue request flow, which is a separate process.”

### 4. Catalogue editors — 2 minutes

As administrator, navigate to Settings → Catalogue Settings. Show the Home Page, Categories and About Us tabs. Preview a section. Explain separate Save operations, language-specific copy, original/cropped Home media and independent category/About images. Cancel any demonstration draft unless you intentionally want to publish it to your demo workspace.

Suggested narration: “Changing the About Us picture does not change product photographs. Hiding a category does not delete its products from the POS.”

### 5. Requests and notifications — 3 minutes

Open Pre-Orders / Custom Cakes and show Catalogue Requests and Scheduled Orders. Use an existing sample request if one is available. Explain the contact preference, item quantities/prices, notes and status. Contact opens the preferred method without accepting the request. Accept opens a confirmation step; Decline requires a reason.

Open Order notifications. Show the unread badge, exact-request link, Mark as read and Mark all as read. These read actions change notification acknowledgement; use sample notifications for the demonstration. View later dismisses a popup without deleting the request.

If a complete demonstration backend has been configured, you may separately submit a fictional request from its public Catalogue and observe its notification. This is a real write to that demo workspace. Live delivery was not exercised during development of this tutorial release.

Suggested narration: “The order is stored by the backend. Staff can return to it later. Background device notifications need deployment, push configuration and explicit browser permission.”

### 6. Stock, preparation and reports — 2 minutes

Use the topics allowed for the current role to open Inventory, Preparation / Kitchen or Reports. Explain that stock changes follow existing receiving/production/sales actions. The tutorial does not move inventory or advance orders.

### 7. Finish and return later — 1 minute

Choose the final tutorial topic and Finish tour. Reopen Tutorials to demonstrate that help remains available. Explain that finishing the tour marks the guide as read; it does not certify that all business setup is complete.

## Presenter checklist

- Keep demo and real business workspaces separate.
- Check which topics are visible for the account's role.
- Keep an example request ready if demonstrating the order details screen.
- Explain permission/setup requirements before showing push notifications.
- Show both a narrow mobile layout and a desktop layout if useful.
- Close or cancel unsaved demonstration drafts and leave no unintended checkout/cart changes.

## Troubleshooting

If the tutorial is hidden, select Tutorials. If its control is temporarily disabled, finish or close the active payment/dialog first. If a topic is missing, check the role rather than changing permissions just for the tour. A cleared or different browser will not have the same saved progress. The written guide describes workflows; it does not provision a demo tenant or backend services.
