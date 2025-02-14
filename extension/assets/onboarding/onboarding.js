document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("downloadButton").addEventListener("click", triggerDownload);
    document.getElementById("availabilityButton").addEventListener("click", checkAvailability);
});

async function triggerDownload() {
    let downloadButton = document.getElementById("downloadButton");
    try {        
        let availability = (await ai.languageModel.capabilities()).available;
        document.getElementById("flagSection").style.display = "none";
    
        if (availability == "readily") {
            downloadButton.style.backgroundColor = "#A6F1E0";
            downloadButton.innerHTML = "Gemini Nano is available!";
            document.getElementById("downloadSuccessSection").style.display = "inline";
            document.getElementById("downloadingSection").style.display = "none";
            document.getElementById("downloadFailureSection").style.display = "none";
        }
        else if (availability == "after-download") {
            document.getElementById("downloadingSection").style.display = "inline";
            await ai.languageModel.create({
                monitor(m) {
                    m.addEventListener("downloadprogress", (e) => {
                        let loadedMB = (e.loaded / (1024 * 1024)).toFixed(2);
                        let totalMB = (e.total / (1024 * 1024)).toFixed(2);
                        document.getElementById("downloadingText").innerText = 
                            `Downloading Gemini Nano: ${loadedMB}MB of ${totalMB}MB`;
                    })
                }
            })
        }
        else {
            downloadButton.style.backgroundColor = "#F7CFD8";
            downloadButton.innerHTML = "Download Failed!";
            document.getElementById("downloadFailureSection").style.display = "inline";
    
        }
    } catch (error) {
        document.getElementById("flagSection").style.display = "inline";
    }
}

async function checkAvailability() {
    let availabilityButton = document.getElementById("availabilityButton");
    try {        
        let availability = (await ai.languageModel.capabilities()).available;
        console.log(availability);
    
        if (availability == "readily") {
            availabilityButton.style.backgroundColor = "#A6F1E0";
            availabilityButton.innerHTML = "Gemini Nano is available!";
            document.getElementById("successSection").style.display = "inline";
            document.getElementById("failureSection").style.display = "none";
        }
        else {
            availabilityButton.style.backgroundColor = "#F7CFD8";
            availabilityButton.innerHTML = "Gemini Nano is not available!";
            await ai.languageModel.create();
            document.getElementById("failureSection").style.display = "inline";
    
        }
    } catch (error) {
        availabilityButton.style.backgroundColor = "#F7CFD8";
        availabilityButton.innerHTML = "Gemini Nano is not available!";
        document.getElementById("failureSection").style.display = "inline";
    }
}