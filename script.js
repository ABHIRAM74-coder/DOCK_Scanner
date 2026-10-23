"use strict";

/* =========================================================
   FAMILY DOCUMENT SCANNER
   Frontend → API Gateway → Lambda → Amazon Bedrock
   ========================================================= */

const API_URL =
    "https://bcuo2i0zhb.execute-api.ap-southeast-2.amazonaws.com/scan";

const ALLOWED_EXTENSIONS = new Set([
    "pdf",
    "docx",
    "txt",
    "jpg",
    "jpeg",
    "png"
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;


// =========================================================
// ELEMENTS
// =========================================================

const fileInput = document.getElementById("fileInput");
const chooseFileBtn = document.getElementById("chooseFileBtn");
const dropArea = document.getElementById("dropArea");
const selectedFile = document.getElementById("selectedFile");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const removeFileBtn = document.getElementById("removeFileBtn");
const scanBtn = document.getElementById("scanBtn");
const errorMessage = document.getElementById("errorMessage");
const processingSection = document.getElementById("processingSection");
const processingText = document.getElementById("processingText");
const progressBar = document.getElementById("progressBar");
const resultsSection = document.getElementById("resultsSection");
const categoryResult = document.getElementById("categoryResult");
const documentTypeResult = document.getElementById("documentTypeResult");
const extractedFields = document.getElementById("extractedFields");
const additionalNotes = document.getElementById("additionalNotes");
const downloadBtn = document.getElementById("downloadBtn");

let currentFile = null;
let latestResult = null;


// =========================================================
// FILE PICKER
// =========================================================

chooseFileBtn.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {

    if (fileInput.files?.length) {
        handleFile(fileInput.files[0]);
    }
});


// =========================================================
// DRAG & DROP
// =========================================================

["dragenter", "dragover"].forEach(eventName => {

    dropArea.addEventListener(eventName, event => {

        event.preventDefault();
        event.stopPropagation();

        dropArea.classList.add("dragging");
    });
});

["dragleave", "drop"].forEach(eventName => {

    dropArea.addEventListener(eventName, event => {

        event.preventDefault();
        event.stopPropagation();

        dropArea.classList.remove("dragging");
    });
});

dropArea.addEventListener("drop", event => {

    const files = event.dataTransfer.files;

    if (files?.length) {
        handleFile(files[0]);
    }
});


// =========================================================
// VALIDATE FILE
// =========================================================

function handleFile(file) {

    clearError();
    hideResults();

    const extension = getFileExtension(file.name);

    if (!ALLOWED_EXTENSIONS.has(extension)) {

        showError(
            "Unsupported file type. Supported formats: PDF, DOCX, TXT, JPG, JPEG and PNG."
        );

        resetFile();
        return;
    }

    if (file.size === 0) {

        showError("The selected file is empty.");

        resetFile();
        return;
    }

    if (file.size > MAX_FILE_SIZE) {

        showError(
            "The selected file exceeds the 10 MB limit."
        );

        resetFile();
        return;
    }

    currentFile = file;

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    selectedFile.classList.remove("hidden");

    scanBtn.disabled = false;
}


function getFileExtension(name) {

    const pieces = name.toLowerCase().split(".");

    return pieces.length > 1
        ? pieces.pop()
        : "";
}


function formatFileSize(bytes) {

    if (bytes < 1024) {
        return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}


// =========================================================
// RESET
// =========================================================

removeFileBtn.addEventListener("click", () => {

    resetFile();
    clearError();
    hideResults();
});


function resetFile() {

    currentFile = null;
    latestResult = null;

    fileInput.value = "";

    fileName.textContent = "";
    fileSize.textContent = "";

    selectedFile.classList.add("hidden");

    scanBtn.disabled = true;

    processingSection.classList.add("hidden");

    progressBar.style.width = "0%";
}


// =========================================================
// ERRORS
// =========================================================

function showError(message) {

    errorMessage.textContent = message;

    errorMessage.classList.remove("hidden");
}


function clearError() {

    errorMessage.textContent = "";

    errorMessage.classList.add("hidden");
}


function hideResults() {

    resultsSection.classList.add("hidden");
}


// =========================================================
// BASE64
// =========================================================

function fileToBase64(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {

            try {

                const result = reader.result;

                resolve(result.split(",")[1]);

            } catch (error) {

                reject(error);
            }
        };

        reader.onerror = () => {

            reject(
                new Error(
                    "Unable to read the selected file."
                )
            );
        };

        reader.readAsDataURL(file);
    });
}


// =========================================================
// SCAN
// =========================================================

scanBtn.addEventListener("click", async () => {

    if (!currentFile) {

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
            await fileToBase64(currentFile);

        progressBar.style.width = "35%";

        processingText.textContent =
            "Sending document securely...";

        const apiResponse = await fetch(
            API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    fileName: currentFile.name,
                    fileData: base64Data
                })
            }
        );

        progressBar.style.width = "70%";

        processingText.textContent =
            "Amazon Bedrock is analyzing the document...";

        let responseData;

        try {

            responseData =
                await apiResponse.json();

        } catch {

            throw new Error(
                "The server returned an invalid response."
            );
        }

        if (!apiResponse.ok) {

            throw new Error(
                responseData.error ||
                "Document analysis failed."
            );
        }

        /*
            Lambda proxy responses can contain
            the real response inside body.
        */

        if (typeof responseData.body === "string") {

            try {

                responseData =
                    JSON.parse(responseData.body);

            } catch {
                // keep response unchanged
            }
        }

        if (!responseData.success) {

            throw new Error(
                responseData.error ||
                "Document analysis failed."
            );
        }

        if (!responseData.result) {

            throw new Error(
                "No analysis result was returned."
            );
        }

        progressBar.style.width = "100%";

        processingText.textContent =
            "Analysis complete";

        displayResults(responseData.result);

        stopProcessing();

    } catch (error) {

        console.error(error);

        processingSection.classList.add("hidden");

        progressBar.style.width = "0%";

        scanBtn.disabled = !currentFile;

        showError(
            error.message ||
            "Unable to analyze the document."
        );
    }
});


// =========================================================
// PROCESSING
// =========================================================

function startProcessing() {

    processingSection.classList.remove("hidden");

    scanBtn.disabled = true;

    progressBar.style.width = "15%";

    processingText.textContent =
        "Preparing document...";
}


function stopProcessing() {

    progressBar.style.width = "100%";

    processingText.textContent =
        "Analysis complete";

    setTimeout(() => {

        processingSection.classList.add("hidden");

        progressBar.style.width = "0%";

    }, 700);

    scanBtn.disabled = !currentFile;
}


// =========================================================
// RESULTS
// =========================================================

function displayResults(result) {

    latestResult = result;

    categoryResult.textContent =
        result.category || "Unknown";

    documentTypeResult.textContent =
        result.documentType || "Unknown";

    displayNotes(result.notes);

    extractedFields.innerHTML = "";

    const fields = result.fields || {};

    const entries = Object.entries(fields);

    if (!entries.length) {

        const message =
            document.createElement("p");

        message.className =
            "additional-notes";

        message.textContent =
            "No information could be extracted.";

        extractedFields.appendChild(message);
    }

    entries.forEach(([key, value]) => {

        /*
            Detect an education subject collection
            based on structure, NOT merely one
            hard-coded field name.
        */

        if (isEducationSubjectCollection(key, value)) {

            renderEducationTable(key, value);

            return;
        }

        displayNormalField(key, value);
    });

    resultsSection.classList.remove("hidden");

    resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// =========================================================
// NOTES
// =========================================================

function displayNotes(notes) {

    if (Array.isArray(notes)) {

        additionalNotes.textContent =
            notes.length
                ? notes.join("\n")
                : "No additional information.";

        return;
    }

    additionalNotes.textContent =
        notes ||
        "No additional information.";
}


// =========================================================
// EDUCATION TABLE DETECTION
// =========================================================

function isEducationSubjectCollection(key, value) {

    if (
        !value ||
        typeof value !== "object"
    ) {
        return false;
    }

    const normalizedKey =
        normalizeKey(key);

    const knownSubjectKeys = new Set([
        "subjects",
        "subject",
        "subjectsandmarks",
        "subjectandmarks",
        "subjectdetails",
        "subjectsdetails",
        "subjectmarks",
        "subjectsmarks",
        "subjectwisemarks",
        "subjectwisedetails",
        "subjectwiseresults",
        "markdetails",
        "marksdetails",
        "marksobtained",
        "academicmarks",
        "academicdetails"
    ]);

    if (knownSubjectKeys.has(normalizedKey)) {
        return true;
    }

    /*
        Structural detection.

        Even if Nova invents another key name,
        examine the contents and determine whether
        it looks like a collection of subjects.
    */

    const rows = normalizeEducationRows(value);

    if (!rows.length) {
        return false;
    }

    const subjectIndicators = [
        "subjectname",
        "subject",
        "subjectcode",
        "papername",
        "papercode",
        "marks",
        "markssecured",
        "marksobtained",
        "theorymarks",
        "practicalmarks",
        "internalmarks",
        "externalmarks",
        "totalmarks",
        "grade"
    ];

    return rows.some(row => {

        const rowKeys =
            Object.keys(row)
                .map(normalizeKey);

        return subjectIndicators.some(
            indicator =>
                rowKeys.includes(indicator)
        );
    });
}


// =========================================================
// UNIVERSAL EDUCATION TABLE
// =========================================================

function renderEducationTable(key, value) {

    const rows =
        normalizeEducationRows(value);

    if (!rows.length) {

        displayNormalField(key, value);

        return;
    }

    const container =
        document.createElement("div");

    container.className =
        "marksheet-table-container";

    const title =
        document.createElement("div");

    title.className =
        "marksheet-table-title";

    title.textContent =
        formatFieldName(key);

    container.appendChild(title);


    /*
        -----------------------------------------------------
        UNIVERSAL EDUCATION COLUMN MODEL

        A board does NOT need to contain every field.

        Only columns actually found in the document
        will be displayed.
        -----------------------------------------------------
    */

    const definitions = [

        {
            label: "Code",

            aliases: [
                "subjectCode",
                "subject_code",
                "paperCode",
                "paper_code",
                "code"
            ]
        },

        {
            label: "Subject",

            aliases: [
                "subjectName",
                "subject_name",
                "paperName",
                "paper_name",
                "subject",
                "name",
                "_subjectKey"
            ]
        },

        {
            label: "Theory",

            aliases: [
                "theoryMarks",
                "theory_marks",
                "theoryObtained",
                "theory_obtained",
                "theory",
                "writtenMarks",
                "written_marks"
            ]
        },

        {
            label: "Practical",

            aliases: [
                "practicalMarks",
                "practical_marks",
                "practicalObtained",
                "practical_obtained",
                "practical",
                "labMarks",
                "lab_marks"
            ]
        },

        {
            label: "Internal",

            aliases: [
                "internalAssessmentMarks",
                "internal_assessment_marks",
                "internalMarks",
                "internal_marks",
                "internalObtained",
                "internal_obtained",
                "internalAssessment",
                "internal"
            ]
        },

        {
            label: "External",

            aliases: [
                "externalMarks",
                "external_marks",
                "externalObtained",
                "external_obtained",
                "external"
            ]
        },

        {
            label: "Maximum Marks",

            aliases: [
                "maximumMarks",
                "maximum_marks",
                "maxMarks",
                "max_marks",
                "maximum",
                "totalMaximumMarks"
            ]
        },

        {
            label: "Marks Obtained",

            aliases: [
                "marksSecured",
                "marks_secured",
                "marksObtained",
                "marks_obtained",
                "obtainedMarks",
                "obtained_marks",
                "score",
                "marks"
            ]
        },

        {
            label: "Total",

            aliases: [
                "totalMarks",
                "total_marks",
                "subjectTotal",
                "subject_total",
                "total"
            ]
        },

        {
            label: "Marks In Words",

            aliases: [
                "marksInWords",
                "marks_in_words",
                "totalInWords",
                "total_in_words",
                "obtainedMarksInWords"
            ]
        },

        {
            label: "Grade",

            aliases: [
                "grade",
                "gradePoint",
                "grade_point",
                "letterGrade",
                "letter_grade"
            ]
        },

        {
            label: "Result",

            aliases: [
                "result",
                "status",
                "passFail",
                "pass_fail"
            ]
        }
    ];


    /*
        Determine which columns are actually present.
    */

    const activeColumns =
        definitions.filter(definition =>

            rows.some(row =>

                getAliasValue(
                    row,
                    definition.aliases
                ) !== null
            )
        );


    if (!activeColumns.length) {

        displayNormalField(key, value);

        return;
    }


    const wrapper =
        document.createElement("div");

    wrapper.className =
        "marks-table-wrapper";


    const table =
        document.createElement("table");

    table.className =
        "marks-table";


    // =====================================================
    // TABLE HEADER
    // =====================================================

    const thead =
        document.createElement("thead");

    const headerRow =
        document.createElement("tr");

    activeColumns.forEach(column => {

        const th =
            document.createElement("th");

        th.textContent =
            column.label;

        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    table.appendChild(thead);


    // =====================================================
    // TABLE BODY
    // =====================================================

    const tbody =
        document.createElement("tbody");

    rows.forEach(rowData => {

        const tr =
            document.createElement("tr");

        activeColumns.forEach(column => {

            const td =
                document.createElement("td");

            let fieldValue =
                getAliasValue(
                    rowData,
                    column.aliases
                );

            if (
                column.label === "Subject" &&
                fieldValue === rowData._subjectKey
            ) {

                fieldValue =
                    formatFieldName(fieldValue);
            }

            td.textContent =
                fieldValue === null
                    ? "—"
                    : formatTableValue(fieldValue);

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    wrapper.appendChild(table);

    container.appendChild(wrapper);

    extractedFields.appendChild(container);
}


// =========================================================
// NORMALIZE EDUCATION ROWS
// =========================================================

function normalizeEducationRows(value) {

    /*
        CBSE / many board responses:

        [
          {
             subjectCode: "...",
             subjectName: "...",
             theoryMarks: "..."
          }
        ]
    */

    if (Array.isArray(value)) {

        return value
            .filter(item =>
                item !== null &&
                item !== undefined
            )
            .map((item, index) => {

                if (
                    item &&
                    typeof item === "object" &&
                    !Array.isArray(item)
                ) {

                    return item;
                }

                return {
                    _subjectKey:
                        `Subject ${index + 1}`,

                    marksSecured:
                        item
                };
            });
    }


    /*
        AP / Telangana / other possible structures:

        {
            mathematics: {
                marksSecured: "92"
            },

            firstLanguage: {
                name: "TELUGU",
                marksSecured: "90"
            }
        }
    */

    if (
        value &&
        typeof value === "object"
    ) {

        return Object.entries(value)
            .map(([subjectKey, subjectValue]) => {

                if (
                    subjectValue &&
                    typeof subjectValue === "object" &&
                    !Array.isArray(subjectValue)
                ) {

                    return {
                        _subjectKey: subjectKey,
                        ...subjectValue
                    };
                }

                return {
                    _subjectKey: subjectKey,
                    marksSecured: subjectValue
                };
            });
    }

    return [];
}


// =========================================================
// FIELD ALIAS MATCHING
// =========================================================

function getAliasValue(object, aliases) {

    /*
        Exact match first.
    */

    for (const alias of aliases) {

        if (hasValue(object[alias])) {
            return object[alias];
        }
    }


    /*
        Normalized match allows:

        theoryMarks
        theory_marks
        Theory Marks
        THEORY-MARKS

        to be treated as equivalent.
    */

    const normalizedAliases =
        aliases.map(normalizeKey);

    for (const [key, value] of Object.entries(object)) {

        if (!hasValue(value)) {
            continue;
        }

        if (
            normalizedAliases.includes(
                normalizeKey(key)
            )
        ) {

            return value;
        }
    }

    return null;
}


// =========================================================
// NORMAL FIELD DISPLAY
// =========================================================

function displayNormalField(key, value) {

    const row =
        document.createElement("div");

    row.className =
        "extracted-field";


    const label =
        document.createElement("div");

    label.className =
        "field-name";

    label.textContent =
        formatFieldName(key);


    const content =
        document.createElement("div");

    content.className =
        "field-value";


    if (!hasValue(value)) {

        content.textContent =
            "Not found";

    } else if (
        typeof value === "object"
    ) {

        content.textContent =
            formatObjectValue(value);

    } else {

        content.textContent =
            String(value);
    }


    row.appendChild(label);

    row.appendChild(content);

    extractedFields.appendChild(row);
}


// =========================================================
// FORMAT OBJECT
// =========================================================

function formatObjectValue(value) {

    if (Array.isArray(value)) {

        return value
            .map(item => {

                if (
                    item &&
                    typeof item === "object"
                ) {

                    return Object.entries(item)
                        .map(([key, val]) =>
                            `${formatFieldName(key)}: ${formatTableValue(val)}`
                        )
                        .join(", ");
                }

                return String(item);
            })
            .join("\n");
    }


    return Object.entries(value)
        .map(([key, val]) => {

            if (
                val &&
                typeof val === "object"
            ) {

                return (
                    `${formatFieldName(key)}: ` +
                    JSON.stringify(val)
                );
            }

            return (
                `${formatFieldName(key)}: ` +
                `${formatTableValue(val)}`
            );
        })
        .join("\n");
}


// =========================================================
// VALUE HELPERS
// =========================================================

function hasValue(value) {

    return (
        value !== undefined &&
        value !== null &&
        value !== ""
    );
}


function formatTableValue(value) {

    if (!hasValue(value)) {
        return "—";
    }

    if (Array.isArray(value)) {
        return value.join(", ");
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}


// =========================================================
// NORMALIZE KEY
// =========================================================

function normalizeKey(value) {

    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}


// =========================================================
// FORMAT FIELD LABEL
// =========================================================

function formatFieldName(name) {

    return String(name)

        .replace(/_/g, " ")

        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2"
        )

        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


// =========================================================
// DOWNLOAD JSON
// =========================================================

downloadBtn.addEventListener("click", () => {

    if (!latestResult) {
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
                type: "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "document-analysis.json";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
});