chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.tabs.create({
            url: "assets/onboarding/onboarding.html",
        });
    }
    chrome.contextMenus.create({
        id: "translateMain",
        title: "🔤 Translate '%s'",
        contexts: ["selection"],
    });
    chrome.contextMenus.create({
        id: "translateTextSingle",
        parentId: "translateMain",
        title: "into single emoji",
        contexts: ["selection"],
    });
    chrome.contextMenus.create({
        id: "translateTextNormal",
        parentId: "translateMain",
        title: "into multiple emojis",
        contexts: ["selection"],
    });
    chrome.contextMenus.create({
        id: "replaceMain",
        title: "🔄 Replace '%s'",
        contexts: ["editable"],
    });
    chrome.contextMenus.create({
        id: "replaceTextSingle",
        parentId: "replaceMain",
        title: "with single emoji",
        contexts: ["editable"],
    });
    chrome.contextMenus.create({
        id: "replaceTextNormal",
        parentId: "replaceMain",
        title: "with multiple emojis",
        contexts: ["editable"],
    });
    chrome.contextMenus.create({
        id: "enrichMain",
        title: "✨ Enrich '%s' with emojis",
        contexts: ["editable"],
    });
});

const injectedTabs = new Set();

function injectContentScript(tabId, callback) {
    if (!injectedTabs.has(tabId)) {
        chrome.scripting.executeScript(
            {
                target: { tabId: tabId },
                files: ["content.js"],
            },
            () => {
                injectedTabs.add(tabId);
                callback();
            }
        );
    } else {
        callback();
    }
}

function showNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        title: title,
        message: message,
        iconUrl: "assets/icons/icon800.png",
        priority: 0,
        // silent: true
    });
}

async function handleAction(action, tab) {
    injectContentScript(tab.id, async () => {
        chrome.action.setBadgeBackgroundColor({
            color: "#3DCD77",
        });
        chrome.action.setBadgeText({
            text: "⏳",
        });
        chrome.tabs.sendMessage(tab.id, { action }, async (response) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                showNotification(
                    "Your last request failed",
                    "Please try again."
                );
            } else {
                const {
                    notificationTitle = null,
                    notificationMessage,
                    status,
                    copyClipboard = false,
                    clipboardText = "",
                } = await response;
                if (status === "success" && copyClipboard) {
                    await chrome.offscreen.createDocument({
                        url: "assets/offscreen/offscreen.html",
                        reasons: [chrome.offscreen.Reason.CLIPBOARD],
                        justification: "Write text to clipboard",
                    });

                    chrome.runtime.sendMessage({
                        type: "copy-data-to-clipboard",
                        target: "offscreen-doc",
                        data: clipboardText,
                    });
                    showNotification(notificationTitle, notificationMessage);
                } else if (status === "failure") {
                    showNotification(
                        "Your last request failed",
                        notificationMessage === ""
                            ? "Please try again."
                            : notificationMessage
                    );
                }
            }
            chrome.action.setBadgeText({
                text: "",
            });
        });
    });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    handleAction(info.menuItemId, tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading" && injectedTabs.has(tabId)) {
        injectedTabs.delete(tabId);
    }
});

chrome.action.onClicked.addListener((tab) => {
    //TODO add popup to select default action
    handleAction("translateTextSingle", tab);
});