async function initSession(task) {
    const { available } = await ai.languageModel.capabilities();

    if (available === "readily") {
        const response = await fetch(
            chrome.runtime.getURL(`assets/prompts/prompt${task}.txt`)
        );
        const systemPrompt = await response.text();
        session = await ai.languageModel.create({
            systemPrompt: systemPrompt,
        });
        return session;
    } else {
        throw new Error(
            "The current browser supports the Prompt API, but it can't be used at the moment."
        );
    }
}

async function cleanPromptResult(inputText, singleEmoji = false) {
    const response = await fetch(
        chrome.runtime.getURL("assets/emojiRegex.txt")
    );
    const emojiRegex = await response.text();
    let emojiPattern = String.raw`${emojiRegex}`;

    /*compile the pattern string into a regex*/
    let emoRegex = new RegExp(emojiPattern, "g");
    let emojis = [...inputText.matchAll(emoRegex)].flat().join("");

    if (emojis === "") {
        throw new Error("Text translation failed.");
    }

    //only the first emoji is returned TODO: remprompt to select the best
    if (singleEmoji) {
        emojis = [...new Intl.Segmenter().segment(emojis)][0].segment;
    }

    return emojis;
}

function startSelectionAnimation(selection, range) {
    const style = document.createElement("style");
    const colors = ["#F7CFD8", "#F4F8D3", "#A6F1E0"];
    let currentIndex = 0;

    const applyStyle = (color) => {
        style.innerHTML = `
            ::selection {
                background-color: ${color};
            }

            ::-moz-selection {
                background-color: ${color};
            }
        `;
        setTimeout(() => {
            selection.addRange(range);
        }, 1);
    };

    document.head.appendChild(style);
    applyStyle(colors[currentIndex]);

    const intervalId = setInterval(() => {
        currentIndex = (currentIndex + 1) % colors.length;
        applyStyle(colors[currentIndex]);
    }, 750);

    return { intervalId, style };
}

async function handleSelection(
    sendResponse,
    sessionType,
    shouldClean = true,
    handleResult
) {
    const selection = window.getSelection();
    if (selection.toString() != "") {
        const range = selection.getRangeAt(0);
        const { intervalId, style } = startSelectionAnimation(selection, range);

        try {
            let session = await initSession(sessionType);
            let rawPromptResult = await session.prompt(
                `Input Text: ${selection.toString()} \nOutput:`
            );
            session.destroy();

            let promptResult = shouldClean
                ? await cleanPromptResult(
                      rawPromptResult,
                      sessionType.includes("Single")
                  )
                : rawPromptResult;

            handleResult(promptResult, sendResponse);
        } catch (error) {
            // TODO: add check for NotSupportedError: The model attempted to output text in an untested language, and was prevented from doing so.
            sendResponse({ notificationMessage: "", status: "failure" });
        } finally {
            clearInterval(intervalId);
            style.innerHTML = "";
            document.head.removeChild(style);
            selection.removeAllRanges();
        }
    } else {
        sendResponse({
            notificationMessage: "You need to select text.",
            status: "failure",
        });
    }
}

async function handleTranslate(request, sendResponse) {
    handleSelection(
        sendResponse,
        request.action === "translateTextNormal"
            ? "translateNormal"
            : "translateSingle",
        (shouldClean = true),
        (promptResult, sendResponse) => {
            sendResponse({
                notificationTitle: "Copied emojis to clipboard!",
                notificationMessage: promptResult,
                status: "success",
                copyClipboard: true,
                clipboardText: promptResult,
            });
        }
    );
}

function insertPromptResult(promptResult, sendResponse) {
    try {
        let selectedElement = document.activeElement;
        selectedElement.value =
            selectedElement.value.slice(0, selectedElement.selectionStart) +
            promptResult +
            selectedElement.value.substr(selectedElement.selectionEnd);
        sendResponse({
            notificationTitle: "",
            notificationMessage: "",
            status: "success_silent",
            copyClipboard: false,
        });
    } catch (error) {
        sendResponse({
            notificationTitle: "Copied emojis to clipboard!",
            notificationMessage:
                "Selection does not support insertion. Copied result to clipboard instead.",
            status: "success",
            copyClipboard: true,
            clipboardText: promptResult,
        });
    }
}

async function handleReplace(request, sendResponse) {
    handleSelection(
        sendResponse,
        request.action === "replaceTextNormal"
            ? "translateNormal"
            : "translateSingle",
        (shouldClean = true),
        insertPromptResult
    );
}

async function handleEnrich(request, sendResponse) {
    handleSelection(
        sendResponse,
        "enrichNormal",
        (shouldClean = false), // Do not clean the prompt result for enrich
        insertPromptResult
    );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (
            request.action === "translateTextNormal" ||
            request.action === "translateTextSingle"
        ) {
            handleTranslate(request, sendResponse);
            return true; // Keep the message channel open for sendResponse
        } else if (
            request.action === "replaceTextNormal" ||
            request.action === "replaceTextSingle"
        ) {
            handleReplace(request, sendResponse);
            return true;
        } else if (request.action === "enrichMain") {
            handleEnrich(request, sendResponse);
            return true;
        }
    } catch (error) {
        sendResponse({ notificationMessage: "", status: "failure" });
    }
});