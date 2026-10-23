"use strict";

/* =========================================================
   FAMILY DOCUMENT AI SCANNER
   Frontend → API Gateway → Lambda → Amazon Bedrock Nova
   ========================================================= */


// =========================================================
// API CONFIGURATION
// =========================================================

const API_URL =
    "https://bcuo2i0zhb.execute-api.ap-southeast-2.amazonaws.com/scan";


// =========================================================
// FILE CONFIGURATION
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
// FILE INPUT
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
// DRAG AND DROP
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
            "Unsupported file type. Supported formats: PDF, DOCX, TXT, JPG, JPEG and PNG."
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


    currentFile =
        file;


    fileName.textContent =
        file.name;


    fileSize.textContent =
        formatFileSize(
            file.size
        );


    selectedFile.classList.remove(
        "hidden"
    );


    scanBtn.disabled =
        false;
}


// =========================================================
// GET EXTENSION
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

    currentFile =
        null;

    latestResult =
        null;


    fileInput.value =
        "";


    fileName.textContent =
        "";

    fileSize.textContent =
        "";


    selectedFile.classList.add(
        "hidden"
    );


    scanBtn.disabled =
        true;


    processingSection.classList.add(
        "hidden"
    );


    progressBar.style.width =
        "0%";
}


// =========================================================
// ERROR HANDLING
// =========================================================

function showError(message) {

    errorMessage.textContent =
        message;


    errorMessage.classList.remove(
        "hidden"
    );
}


function clearError() {

    errorMessage.textContent =
        "";


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
// FILE → BASE64
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

                    } catch (error) {

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
                        method:
                            "POST",

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
                "70%";


            processingText.textContent =
                "Amazon Bedrock is analyzing the document...";


            let responseData;


            try {

                responseData =
                    await apiResponse.json();

            } catch (error) {

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


            // =================================================
            // HANDLE LAMBDA PROXY RESPONSE
            // =================================================

            if (
                typeof responseData.body ===
                "string"
            ) {

                try {

                    responseData =
                        JSON.parse(
                            responseData.body
                        );

                } catch (error) {

                    console.warn(
                        "Unable to parse nested Lambda body."
                    );
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

        } catch (error) {

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
// PROCESSING
// =========================================================

function startProcessing() {

    processingSection.classList.remove(
        "hidden"
    );


    scanBtn.disabled =
        true;


    progressBar.style.width =
        "15%";


    processingText.textContent =
        "Preparing document...";
}


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

    latestResult =
        result;


    categoryResult.textContent =
        result.category ||
        "Unknown";


    documentTypeResult.textContent =
        result.documentType ||
        "Unknown";


    displayNotes(
        result.notes
    );


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

        const message =
            document.createElement(
                "p"
            );


        message.className =
            "additional-notes";


        message.textContent =
            "No information could be extracted.";


        extractedFields.appendChild(
            message
        );
    }


    entries.forEach(
        function ([key, value]) {

            const normalizedKey =
                normalizeKey(
                    key
                );


            // =================================================
            // PHYSICAL CHARACTERISTICS
            // =================================================

            if (
                isPhysicalCharacteristicsField(
                    normalizedKey
                ) &&
                value &&
                typeof value === "object"
            ) {

                displayPhysicalCharacteristics(
                    key,
                    value
                );

                return;
            }


            // =================================================
            // EDUCATION SUBJECT TABLE
            // =================================================

            if (
                isEducationSubjectCollection(
                    key,
                    value
                )
            ) {

                renderEducationTable(
                    key,
                    value
                );

                return;
            }


            // =================================================
            // NORMAL FIELD
            // =================================================

            displayNormalField(
                key,
                value
            );
        }
    );


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
// NOTES
// =========================================================

function displayNotes(notes) {

    if (
        Array.isArray(
            notes
        )
    ) {

        additionalNotes.textContent =
            notes.length > 0

                ? notes.join("\n")

                : "No additional information.";


        return;
    }


    additionalNotes.textContent =
        notes ||
        "No additional information.";
}


// =========================================================
// DETECT PHYSICAL CHARACTERISTICS
// =========================================================

function isPhysicalCharacteristicsField(
    normalizedKey
) {

    const fields =
        new Set([

            "physicalcharacteristics",
            "physicalcharacteristic",

            "identificationmarks",
            "identificationmark",

            "visibleidentificationmarks",

            "physicalidentificationmarks",
            "personalidentificationmarks",

            "physicalmarks"

        ]);


    return fields.has(
        normalizedKey
    );
}


// =========================================================
// DISPLAY PHYSICAL CHARACTERISTICS
// =========================================================

function displayPhysicalCharacteristics(
    key,
    value
) {

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "physical-characteristics-container";


    // =====================================================
    // TITLE
    // =====================================================

    const title =
        document.createElement(
            "div"
        );


    title.className =
        "physical-characteristics-title";


    title.textContent =
        formatFieldName(
            key
        );


    container.appendChild(
        title
    );


    // =====================================================
    // PHYSICAL CHARACTERISTIC ROWS
    // =====================================================

    Object.entries(
        value
    ).forEach(
        function (
            [fieldKey, fieldValue]
        ) {

            if (
                fieldValue === null ||
                fieldValue === undefined ||
                fieldValue === ""
            ) {

                return;
            }


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "physical-characteristic-row";


            const label =
                document.createElement(
                    "div"
                );


            label.className =
                "physical-characteristic-label";


            label.textContent =
                formatFieldName(
                    fieldKey
                );


            const content =
                document.createElement(
                    "div"
                );


            content.className =
                "physical-characteristic-value";


            content.textContent =
                String(
                    fieldValue
                );


            row.appendChild(
                label
            );


            row.appendChild(
                content
            );


            container.appendChild(
                row
            );
        }
    );


    extractedFields.appendChild(
        container
    );
}


// =========================================================
// DETECT EDUCATION SUBJECT COLLECTION
// =========================================================

function isEducationSubjectCollection(
    key,
    value
) {

    if (
        !value ||
        typeof value !== "object"
    ) {

        return false;
    }


    const normalizedKey =
        normalizeKey(
            key
        );


    // =====================================================
    // EXPLICITLY NON-ACADEMIC
    // =====================================================

    const nonAcademicFields =
        new Set([

            "physicalcharacteristics",
            "physicalcharacteristic",

            "identificationmarks",
            "identificationmark",

            "visibleidentificationmarks",

            "physicalidentificationmarks",
            "personalidentificationmarks",

            "physicalmarks",

            "address",
            "addresses",

            "contactdetails",
            "personalinformation"

        ]);


    if (
        nonAcademicFields.has(
            normalizedKey
        )
    ) {

        return false;
    }


    // =====================================================
    // KNOWN ACADEMIC COLLECTION NAMES
    // =====================================================

    const knownSubjectKeys =
        new Set([

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

            "academicmarks",
            "academicdetails",

            "markdetails",
            "marksdetails"

        ]);


    if (
        knownSubjectKeys.has(
            normalizedKey
        )
    ) {

        return true;
    }


    // =====================================================
    // STRUCTURAL DETECTION
    // =====================================================

    const rows =
        normalizeEducationRows(
            value
        );


    if (
        rows.length === 0
    ) {

        return false;
    }


    /*
        IMPORTANT:

        We intentionally DO NOT use generic words such as:

        "mark"
        "marks"

        as academic indicators.

        Otherwise:

        identificationMark1
        identificationMark2

        could incorrectly become academic marks.
    */

    const strongAcademicIndicators = [

        "subjectname",
        "subjectcode",

        "papername",
        "papercode",

        "theorymarks",
        "theoryobtained",

        "practicalmarks",
        "practicalobtained",

        "internalmarks",
        "internalassessmentmarks",

        "externalmarks",
        "externalobtained",

        "markssecured",
        "marksobtained",

        "totalmarks",
        "maximummarks",

        "grade",
        "gradepoint",

        "academicresult"
    ];


    return rows.some(
        function (row) {

            const rowKeys =
                Object.keys(
                    row
                ).map(
                    normalizeKey
                );


            return strongAcademicIndicators.some(
                function (indicator) {

                    return rowKeys.includes(
                        indicator
                    );
                }
            );
        }
    );
}


// =========================================================
// UNIVERSAL EDUCATION TABLE
// =========================================================

function renderEducationTable(
    key,
    value
) {

    const rows =
        normalizeEducationRows(
            value
        );


    if (
        rows.length === 0
    ) {

        displayNormalField(
            key,
            value
        );

        return;
    }


    const container =
        document.createElement(
            "div"
        );


    container.className =
        "marksheet-table-container";


    const title =
        document.createElement(
            "div"
        );


    title.className =
        "marksheet-table-title";


    title.textContent =
        getEducationTableTitle(
            key
        );


    container.appendChild(
        title
    );


    // =====================================================
    // UNIVERSAL EDUCATION COLUMNS
    // =====================================================

    const definitions = [

        {
            label:
                "Code",

            aliases: [

                "subjectCode",
                "subject_code",

                "paperCode",
                "paper_code",

                "code"
            ]
        },


        {
            label:
                "Subject",

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
            label:
                "Theory",

            aliases: [

                "theoryMarks",
                "theory_marks",

                "theoryObtained",
                "theory_obtained",

                "theory",

                "writtenMarks",
                "written_marks",

                "written"
            ]
        },


        {
            label:
                "Practical",

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
            label:
                "Internal",

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
            label:
                "External",

            aliases: [

                "externalMarks",
                "external_marks",

                "externalObtained",
                "external_obtained",

                "external"
            ]
        },


        {
            label:
                "Maximum Marks",

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
            label:
                "Marks Obtained",

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
            label:
                "Total",

            aliases: [

                "totalMarks",
                "total_marks",

                "subjectTotal",
                "subject_total",

                "total"
            ]
        },


        {
            label:
                "Marks In Words",

            aliases: [

                "marksInWords",
                "marks_in_words",

                "totalInWords",
                "total_in_words",

                "obtainedMarksInWords",
                "obtained_marks_in_words"
            ]
        },


        {
            label:
                "Grade",

            aliases: [

                "grade",

                "gradePoint",
                "grade_point",

                "letterGrade",
                "letter_grade",

                "positionalGrade",
                "positional_grade"
            ]
        },


        {
            label:
                "Result",

            aliases: [

                "result",
                "status",

                "passFail",
                "pass_fail"
            ]
        }
    ];


    // =====================================================
    // ONLY SHOW COLUMNS THAT EXIST
    // =====================================================

    const activeColumns =
        definitions.filter(
            function (definition) {

                return rows.some(
                    function (row) {

                        return (
                            getAliasValue(
                                row,
                                definition.aliases
                            ) !== null
                        );
                    }
                );
            }
        );


    if (
        activeColumns.length === 0
    ) {

        displayNormalField(
            key,
            value
        );

        return;
    }


    // =====================================================
    // TABLE WRAPPER
    // =====================================================

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "marks-table-wrapper";


    const table =
        document.createElement(
            "table"
        );


    table.className =
        "marks-table";


    // =====================================================
    // HEADER
    // =====================================================

    const thead =
        document.createElement(
            "thead"
        );


    const headerRow =
        document.createElement(
            "tr"
        );


    activeColumns.forEach(
        function (column) {

            const th =
                document.createElement(
                    "th"
                );


            th.textContent =
                column.label;


            headerRow.appendChild(
                th
            );
        }
    );


    thead.appendChild(
        headerRow
    );


    table.appendChild(
        thead
    );


    // =====================================================
    // BODY
    // =====================================================

    const tbody =
        document.createElement(
            "tbody"
        );


    rows.forEach(
        function (rowData) {

            const tr =
                document.createElement(
                    "tr"
                );


            activeColumns.forEach(
                function (column) {

                    const td =
                        document.createElement(
                            "td"
                        );


                    let fieldValue =
                        getAliasValue(
                            rowData,
                            column.aliases
                        );


                    if (
                        column.label ===
                            "Subject" &&
                        fieldValue ===
                            rowData._subjectKey
                    ) {

                        fieldValue =
                            formatFieldName(
                                fieldValue
                            );
                    }


                    td.textContent =
                        fieldValue === null

                            ? "—"

                            : formatTableValue(
                                fieldValue
                            );


                    tr.appendChild(
                        td
                    );
                }
            );


            tbody.appendChild(
                tr
            );
        }
    );


    table.appendChild(
        tbody
    );


    wrapper.appendChild(
        table
    );


    container.appendChild(
        wrapper
    );


    extractedFields.appendChild(
        container
    );
}


// =========================================================
// EDUCATION TABLE TITLE
// =========================================================

function getEducationTableTitle(
    key
) {

    const normalized =
        normalizeKey(
            key
        );


    if (
        normalized === "subjects"
    ) {

        return "Subjects & Marks";
    }


    return formatFieldName(
        key
    );
}


// =========================================================
// NORMALIZE EDUCATION ROWS
// =========================================================

function normalizeEducationRows(
    value
) {

    // =====================================================
    // ARRAY FORMAT
    // CBSE / CISCE / OTHER BOARDS
    // =====================================================

    if (
        Array.isArray(
            value
        )
    ) {

        return value

            .filter(
                function (item) {

                    return (
                        item !== null &&
                        item !== undefined
                    );
                }
            )

            .map(
                function (
                    item,
                    index
                ) {

                    if (
                        item &&
                        typeof item ===
                            "object" &&
                        !Array.isArray(
                            item
                        )
                    ) {

                        return item;
                    }


                    return {

                        _subjectKey:
                            "Subject " +
                            (
                                index +
                                1
                            ),

                        marksSecured:
                            item
                    };
                }
            );
    }


    // =====================================================
    // OBJECT FORMAT
    // AP / TELANGANA / OTHER STATE BOARDS
    // =====================================================

    if (
        value &&
        typeof value ===
            "object"
    ) {

        return Object.entries(
            value
        ).map(
            function (
                [
                    subjectKey,
                    subjectValue
                ]
            ) {

                if (
                    subjectValue &&
                    typeof subjectValue ===
                        "object" &&
                    !Array.isArray(
                        subjectValue
                    )
                ) {

                    return {

                        _subjectKey:
                            subjectKey,

                        ...subjectValue
                    };
                }


                return {

                    _subjectKey:
                        subjectKey,

                    marksSecured:
                        subjectValue
                };
            }
        );
    }


    return [];
}


// =========================================================
// FIND VALUE USING ALIASES
// =========================================================

function getAliasValue(
    object,
    aliases
) {

    // =====================================================
    // EXACT MATCH
    // =====================================================

    for (
        const alias of aliases
    ) {

        if (
            hasValue(
                object[alias]
            )
        ) {

            return object[
                alias
            ];
        }
    }


    // =====================================================
    // NORMALIZED MATCH
    // =====================================================

    const normalizedAliases =
        aliases.map(
            normalizeKey
        );


    for (
        const [
            key,
            value
        ]
        of
        Object.entries(
            object
        )
    ) {

        if (
            !hasValue(
                value
            )
        ) {

            continue;
        }


        if (
            normalizedAliases.includes(
                normalizeKey(
                    key
                )
            )
        ) {

            return value;
        }
    }


    return null;
}


// =========================================================
// NORMAL FIELD
// =========================================================

function displayNormalField(
    key,
    value
) {

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
        !hasValue(
            value
        )
    ) {

        content.textContent =
            "Not found";

    } else if (
        typeof value ===
            "object"
    ) {

        content.textContent =
            formatObjectValue(
                value
            );

    } else {

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


// =========================================================
// FORMAT OBJECT VALUE
// =========================================================

function formatObjectValue(
    value
) {

    if (
        Array.isArray(
            value
        )
    ) {

        return value

            .map(
                function (item) {

                    if (
                        item &&
                        typeof item ===
                            "object"
                    ) {

                        return Object.entries(
                            item
                        )

                            .map(
                                function (
                                    [
                                        key,
                                        val
                                    ]
                                ) {

                                    return (
                                        formatFieldName(
                                            key
                                        ) +
                                        ": " +
                                        formatTableValue(
                                            val
                                        )
                                    );
                                }
                            )

                            .join(
                                ", "
                            );
                    }


                    return String(
                        item
                    );
                }
            )

            .join(
                "\n"
            );
    }


    return Object.entries(
        value
    )

        .map(
            function (
                [
                    key,
                    val
                ]
            ) {

                if (
                    val &&
                    typeof val ===
                        "object"
                ) {

                    return (
                        formatFieldName(
                            key
                        ) +
                        ": " +
                        JSON.stringify(
                            val
                        )
                    );
                }


                return (
                    formatFieldName(
                        key
                    ) +
                    ": " +
                    formatTableValue(
                        val
                    )
                );
            }
        )

        .join(
            "\n"
        );
}


// =========================================================
// VALUE CHECK
// =========================================================

function hasValue(
    value
) {

    return (

        value !==
            undefined &&

        value !==
            null &&

        value !==
            ""
    );
}


// =========================================================
// TABLE VALUE
// =========================================================

function formatTableValue(
    value
) {

    if (
        !hasValue(
            value
        )
    ) {

        return "—";
    }


    if (
        Array.isArray(
            value
        )
    ) {

        return value.join(
            ", "
        );
    }


    if (
        typeof value ===
            "object"
    ) {

        return JSON.stringify(
            value
        );
    }


    return String(
        value
    );
}


// =========================================================
// NORMALIZE KEY
// =========================================================

function normalizeKey(
    value
) {

    return String(
        value
    )

        .toLowerCase()

        .replace(
            /[^a-z0-9]/g,
            ""
        );
}


// =========================================================
// FORMAT FIELD NAME
// =========================================================

function formatFieldName(
    name
) {

    return String(
        name
    )

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
            function (
                letter
            ) {

                return letter
                    .toUpperCase();
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
                [
                    json
                ],
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