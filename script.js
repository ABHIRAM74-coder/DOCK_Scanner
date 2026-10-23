"use strict";

/*
    =========================================================
    DOCUMENT AI SCANNER
    Frontend + AWS API Gateway + Lambda + Amazon Bedrock
    =========================================================
*/


// =========================================================
// API
// =========================================================

const API_URL =
    "https://bcuo2i0zhb.execute-api.ap-southeast-2.amazonaws.com/scan";


// =========================================================
// FILE SETTINGS
// =========================================================

const ALLOWED_EXTENSIONS = new Set([
    "pdf",
    "docx",
    "txt",
    "jpg",
    "jpeg",
    "png"
]);

const MAX_FILE_SIZE =
    10 * 1024 * 1024;


// =========================================================
// HTML ELEMENTS
// =========================================================

const fileInput =
    document.getElementById("fileInput");

const chooseFileBtn =
    document.getElementById("chooseFileBtn");

const dropArea =
    document.getElementById("dropArea");

const selectedFile =
    document.getElementById("selectedFile");

const fileName =
    document.getElementById("fileName");

const fileSize =
    document.getElementById("fileSize");

const removeFileBtn =
    document.getElementById("removeFileBtn");

const scanBtn =
    document.getElementById("scanBtn");

const errorMessage =
    document.getElementById("errorMessage");

const processingSection =
    document.getElementById("processingSection");

const processingText =
    document.getElementById("processingText");

const progressBar =
    document.getElementById("progressBar");

const resultsSection =
    document.getElementById("resultsSection");

const categoryResult =
    document.getElementById("categoryResult");

const documentTypeResult =
    document.getElementById("documentTypeResult");

const extractedFields =
    document.getElementById("extractedFields");

const additionalNotes =
    document.getElementById("additionalNotes");

const downloadBtn =
    document.getElementById("downloadBtn");


// =========================================================
// STATE
// =========================================================

let currentFile = null;
let latestResult = null;


// =========================================================
// CHOOSE FILE
// =========================================================

chooseFileBtn.addEventListener(
    "click",
    function () {
        fileInput.click();
    }
);


// =========================================================
// FILE INPUT CHANGE
// =========================================================

fileInput.addEventListener(
    "change",
    function () {

        if (
            fileInput.files &&
            fileInput.files.length > 0
        ) {
            handleFile(
                fileInput.files[0]
            );
        }
    }
);


// =========================================================
// DRAG EVENTS
// =========================================================

[
    "dragenter",
    "dragover"
].forEach(
    function (eventName) {

        dropArea.addEventListener(
            eventName,
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                dropArea.classList.add(
                    "dragging"
                );
            }
        );
    }
);


[
    "dragleave",
    "drop"
].forEach(
    function (eventName) {

        dropArea.addEventListener(
            eventName,
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                dropArea.classList.remove(
                    "dragging"
                );
            }
        );
    }
);


// =========================================================
// DROP FILE
// =========================================================

dropArea.addEventListener(
    "drop",
    function (event) {

        const files =
            event.dataTransfer.files;

        if (
            files &&
            files.length > 0
        ) {
            handleFile(
                files[0]
            );
        }
    }
);


// =========================================================
// HANDLE FILE
// =========================================================

function handleFile(file) {

    clearError();
    hideResults();

    const extension =
        getFileExtension(
            file.name
        );


    if (
        !ALLOWED_EXTENSIONS.has(
            extension
        )
    ) {

        showError(
            "Unsupported file type. " +
            "Currently supported: PDF, DOCX, TXT, JPG, JPEG and PNG."
        );

        resetFile();

        return;
    }


    if (
        file.size === 0
    ) {

        showError(
            "The selected file is empty."
        );

        resetFile();

        return;
    }


    if (
        file.size >
        MAX_FILE_SIZE
    ) {

        showError(
            "The selected file exceeds the 10 MB limit."
        );

        resetFile();

        return;
    }


    currentFile = file;

    fileName.textContent =
        file.name;

    fileSize.textContent =
        formatFileSize(
            file.size
        );

    selectedFile.classList.remove(
        "hidden"
    );

    scanBtn.disabled = false;
}


// =========================================================
// FILE EXTENSION
// =========================================================

function getFileExtension(name) {

    const pieces =
        name
            .toLowerCase()
            .split(".");

    if (
        pieces.length < 2
    ) {
        return "";
    }

    return pieces.pop();
}


// =========================================================
// FORMAT FILE SIZE
// =========================================================

function formatFileSize(bytes) {

    if (
        bytes < 1024
    ) {

        return (
            bytes +
            " bytes"
        );
    }


    if (
        bytes <
        1024 * 1024
    ) {

        return (
            (
                bytes /
                1024
            ).toFixed(2) +
            " KB"
        );
    }


    return (
        (
            bytes /
            1024 /
            1024
        ).toFixed(2) +
        " MB"
    );
}


// =========================================================
// REMOVE FILE
// =========================================================

removeFileBtn.addEventListener(
    "click",
    function () {

        resetFile();
        clearError();
        hideResults();
    }
);


// =========================================================
// RESET FILE
// =========================================================

function resetFile() {

    currentFile = null;
    latestResult = null;

    fileInput.value = "";

    fileName.textContent = "";
    fileSize.textContent = "";

    selectedFile.classList.add(
        "hidden"
    );

    scanBtn.disabled = true;

    processingSection.classList.add(
        "hidden"
    );

    progressBar.style.width =
        "0%";
}


// =========================================================
// SHOW ERROR
// =========================================================

function showError(message) {

    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );
}


// =========================================================
// CLEAR ERROR
// =========================================================

function clearError() {

    errorMessage.textContent = "";

    errorMessage.classList.add(
        "hidden"
    );
}


// =========================================================
// HIDE RESULTS
// =========================================================

function hideResults() {

    resultsSection.classList.add(
        "hidden"
    );
}


// =========================================================
// CONVERT FILE TO BASE64
// =========================================================

function fileToBase64(file) {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const reader =
                new FileReader();


            reader.onload =
                function () {

                    try {

                        const result =
                            reader.result;

                        const base64 =
                            result
                                .split(",")[1];

                        resolve(
                            base64
                        );
                    }
                    catch (error) {

                        reject(
                            error
                        );
                    }
                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Unable to read the selected file."
                        )
                    );
                };


            reader.readAsDataURL(
                file
            );
        }
    );
}


// =========================================================
// SCAN DOCUMENT
// =========================================================

scanBtn.addEventListener(
    "click",
    async function () {

        if (
            !currentFile
        ) {

            showError(
                "Please select a document first."
            );

            return;
        }


        clearError();
        hideResults();
        startProcessing();


        try {

            processingText.textContent =
                "Preparing document...";


            const base64Data =
                await fileToBase64(
                    currentFile
                );


            progressBar.style.width =
                "35%";


            processingText.textContent =
                "Sending document securely...";


            const apiResponse =
                await fetch(
                    API_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                fileName:
                                    currentFile.name,

                                fileData:
                                    base64Data
                            })
                    }
                );


            progressBar.style.width =
                "75%";


            processingText.textContent =
                "Amazon Bedrock is analyzing the document...";


            let responseData;


            try {

                responseData =
                    await apiResponse.json();
            }
            catch (error) {

                throw new Error(
                    "The server returned an invalid response."
                );
            }


            if (
                !apiResponse.ok
            ) {

                throw new Error(
                    responseData.error ||
                    "Document analysis failed."
                );
            }


            // Handle Lambda proxy body if returned as string
            if (
                typeof responseData.body ===
                "string"
            ) {

                try {

                    responseData =
                        JSON.parse(
                            responseData.body
                        );
                }
                catch (error) {

                    // Leave responseData unchanged
                }
            }


            if (
                !responseData.success
            ) {

                throw new Error(
                    responseData.error ||
                    "Document analysis failed."
                );
            }


            if (
                !responseData.result
            ) {

                throw new Error(
                    "No analysis result was returned."
                );
            }


            progressBar.style.width =
                "100%";


            processingText.textContent =
                "Analysis complete";


            displayResults(
                responseData.result
            );


            stopProcessing();
        }
        catch (error) {

            console.error(
                "Document scan error:",
                error
            );


            processingSection.classList.add(
                "hidden"
            );


            progressBar.style.width =
                "0%";


            scanBtn.disabled =
                !currentFile;


            showError(
                error.message ||
                "Unable to analyze the document."
            );
        }
    }
);


// =========================================================
// START PROCESSING
// =========================================================

function startProcessing() {

    processingSection.classList.remove(
        "hidden"
    );

    scanBtn.disabled = true;

    progressBar.style.width =
        "15%";

    processingText.textContent =
        "Preparing document...";
}


// =========================================================
// STOP PROCESSING
// =========================================================

function stopProcessing() {

    progressBar.style.width =
        "100%";

    processingText.textContent =
        "Analysis complete";


    setTimeout(
        function () {

            processingSection.classList.add(
                "hidden"
            );

            progressBar.style.width =
                "0%";
        },
        700
    );


    scanBtn.disabled =
        !currentFile;
}


// =========================================================
// DISPLAY RESULTS
// =========================================================

function displayResults(result) {

    latestResult = result;


    categoryResult.textContent =
        result.category ||
        "Unknown";


    documentTypeResult.textContent =
        result.documentType ||
        "Unknown";


    // =====================================================
    // NOTES
    // =====================================================

    if (
        Array.isArray(
            result.notes
        )
    ) {

        additionalNotes.textContent =
            result.notes.length > 0
                ? result.notes.join("\n")
                : "No additional information.";
    }
    else {

        additionalNotes.textContent =
            result.notes ||
            "No additional information.";
    }


    // =====================================================
    // CLEAR OLD FIELDS
    // =====================================================

    extractedFields.innerHTML =
        "";


    const fields =
        result.fields ||
        {};


    const entries =
        Object.entries(
            fields
        );


    if (
        entries.length === 0
    ) {

        const emptyMessage =
            document.createElement(
                "p"
            );

        emptyMessage.textContent =
            "No information could be extracted.";

        emptyMessage.className =
            "additional-notes";

        extractedFields.appendChild(
            emptyMessage
        );
    }


    // =====================================================
    // DISPLAY EACH EXTRACTED FIELD
    // =====================================================

    entries.forEach(
        function ([key, value]) {

            /*
                =============================================
                MARKSHEET SUBJECT TABLE
                =============================================

                If Nova returns:

                subjects: {
                    firstLanguage: {
                        name: "TELUGU",
                        marksSecured: "90"
                    },
                    mathematics: {
                        marksSecured: "92"
                    }
                }

                We show a table instead of JSON.
            */

            if (
                key.toLowerCase() === "subjects" &&
                value &&
                typeof value === "object" &&
                !Array.isArray(value)
            ) {

                displaySubjectsTable(
                    key,
                    value
                );

                return;
            }


            // =================================================
            // NORMAL FIELD
            // =================================================

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "extracted-field";


            const label =
                document.createElement(
                    "div"
                );


            label.className =
                "field-name";


            label.textContent =
                formatFieldName(
                    key
                );


            const content =
                document.createElement(
                    "div"
                );


            content.className =
                "field-value";


            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {

                content.textContent =
                    "Not found";
            }

            else if (
                typeof value ===
                "object"
            ) {

                /*
                    Other nested objects still display
                    safely as formatted JSON.
                */

                content.textContent =
                    JSON.stringify(
                        value,
                        null,
                        2
                    );
            }

            else {

                content.textContent =
                    String(
                        value
                    );
            }


            row.appendChild(
                label
            );


            row.appendChild(
                content
            );


            extractedFields.appendChild(
                row
            );
        }
    );


    // =====================================================
    // SHOW RESULTS
    // =====================================================

    resultsSection.classList.remove(
        "hidden"
    );


    resultsSection.scrollIntoView({
        behavior:
            "smooth",

        block:
            "start"
    });
}


// =========================================================
// DISPLAY SUBJECTS AS TABLE
// =========================================================

function displaySubjectsTable(
    key,
    subjects
) {

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "marksheet-table-container";


    // =====================================================
    // TITLE
    // =====================================================

    const title =
        document.createElement(
            "div"
        );


    title.className =
        "marksheet-table-title";


    title.textContent =
        formatFieldName(
            key
        );


    container.appendChild(
        title
    );


    // =====================================================
    // TABLE
    // =====================================================

    const table =
        document.createElement(
            "table"
        );


    table.className =
        "marks-table";


    // =====================================================
    // TABLE HEADER
    // =====================================================

    const thead =
        document.createElement(
            "thead"
        );


    const headingRow =
        document.createElement(
            "tr"
        );


    const subjectHeading =
        document.createElement(
            "th"
        );


    subjectHeading.textContent =
        "Subject";


    const marksHeading =
        document.createElement(
            "th"
        );


    marksHeading.textContent =
        "Marks Secured";


    headingRow.appendChild(
        subjectHeading
    );


    headingRow.appendChild(
        marksHeading
    );


    thead.appendChild(
        headingRow
    );


    table.appendChild(
        thead
    );


    // =====================================================
    // TABLE BODY
    // =====================================================

    const tbody =
        document.createElement(
            "tbody"
        );


    Object.entries(
        subjects
    ).forEach(
        function (
            [subjectKey, subjectData]
        ) {

            const tableRow =
                document.createElement(
                    "tr"
                );


            const subjectCell =
                document.createElement(
                    "td"
                );


            const marksCell =
                document.createElement(
                    "td"
                );


            // =============================================
            // NESTED SUBJECT OBJECT
            // =============================================

            if (
                subjectData &&
                typeof subjectData ===
                "object" &&
                !Array.isArray(
                    subjectData
                )
            ) {

                subjectCell.textContent =
                    subjectData.name ||
                    subjectData.subject ||
                    formatFieldName(
                        subjectKey
                    );


                marksCell.textContent =
                    getMarksValue(
                        subjectData
                    );
            }

            // =============================================
            // SIMPLE VALUE
            // Example: mathematics: "92"
            // =============================================

            else {

                subjectCell.textContent =
                    formatFieldName(
                        subjectKey
                    );


                marksCell.textContent =
                    subjectData ??
                    "Not found";
            }


            tableRow.appendChild(
                subjectCell
            );


            tableRow.appendChild(
                marksCell
            );


            tbody.appendChild(
                tableRow
            );
        }
    );


    table.appendChild(
        tbody
    );


    container.appendChild(
        table
    );


    extractedFields.appendChild(
        container
    );
}


// =========================================================
// FIND MARKS VALUE
// =========================================================

function getMarksValue(subjectData) {

    /*
        Supports slightly different field names
        that Nova might return.
    */

    const possibleKeys = [
        "marksSecured",
        "marks",
        "score",
        "marksObtained",
        "obtainedMarks",
        "grade"
    ];


    for (
        const key of possibleKeys
    ) {

        if (
            subjectData[key] !== undefined &&
            subjectData[key] !== null &&
            subjectData[key] !== ""
        ) {

            return String(
                subjectData[key]
            );
        }
    }


    return "Not found";
}


// =========================================================
// FORMAT FIELD NAME
// =========================================================

function formatFieldName(name) {

    return String(name)

        .replace(
            /_/g,
            " "
        )

        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2"
        )

        .replace(
            /\b\w/g,
            function (letter) {

                return letter.toUpperCase();
            }
        );
}


// =========================================================
// DOWNLOAD JSON
// =========================================================

downloadBtn.addEventListener(
    "click",
    function () {

        if (
            !latestResult
        ) {

            return;
        }


        const json =
            JSON.stringify(
                latestResult,
                null,
                2
            );


        const blob =
            new Blob(
                [json],
                {
                    type:
                        "application/json"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            "document-analysis.json";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );
    }
);