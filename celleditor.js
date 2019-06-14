const KEY_BACKSPACE = 8;
const KEY_F2 = 113;
const KEY_DELETE = 46;

var suggestActions;

var hookKeywords = [{
        label: "Suite Initial",
        group: "hook"
    },
    {
        label: "Suite Final",
        group: "hook"
    },
    {
        label: "Test Initial",
        group: "hook"
    },
    {
        label: "Test Final",
        group: "hook"
    },
];
var locatorKW = {
    label: "element locator",
    group: "locator"
};
var testCaseKW = {
    label: "Test Case",
    group: "test case"
};
var methodKW = {
    label: "Method",
    group: "method"
};
var argumentKW = {
    label: "argument",
    group: "argument"
};

function getPlaceHolder(params) {
    var headerField = params.colDef.field;
    var str = "";
    if (headerField === COL_1) {
        str = "enter action name";
    } else {
        str = "enter argument";
    }
    return str;
}

function initInputEditor(cellEditor, params) {
    var inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.classList.add('ag-cell-edit-input', "ag-input-text-wrapper");
    inputElement.style = "border:none";
    inputElement.placeholder = getPlaceHolder(params);
    inputElement.addEventListener("blur", (ev) => {
        params.api.stopEditing();
    });

    cellEditor.gui = inputElement;
    cellEditor.params = params;

    var startValue;
    let keyPressBackspaceOrDelete =
        params.keyPress === KEY_BACKSPACE ||
        params.keyPress === KEY_DELETE;

    if (keyPressBackspaceOrDelete) {
        startValue = '';
    } else if (params.charPress) {
        startValue = params.charPress;
    } else {
        startValue = params.value;
        if (params.keyPress !== KEY_F2) {
            cellEditor.highlightAllOnFocus = true;
        }
    }
    if (startValue !== null && startValue !== undefined) {
        cellEditor.gui.value = startValue;
    }
}

function NormalCellEditor() {}

NormalCellEditor.prototype.init = function (params) {
    initInputEditor(this, params);
};

NormalCellEditor.prototype.getGui = function () {
    return this.gui;
};

NormalCellEditor.prototype.getValue = function () {
    return this.gui.value;
};

NormalCellEditor.prototype.afterGuiAttached = function () {
    this.gui.focus();
};

function AutoCompleteCellEditor() {}

AutoCompleteCellEditor.prototype.init = function (params) {
    initInputEditor(this, params);

    this.gui.addEventListener("dblclick", (ev) => {
        console.log("dblclick");
    });

    this.gui.addEventListener("keydown", (ev) => {
        switch (ev.key) {
            case 'Home': {
                let end = 0;
                if (ev.shiftKey) {
                    ev.srcElement.setSelectionRange(0, ev.srcElement.selectionStart, 'backward');
                } else {
                    ev.srcElement.setSelectionRange(0, 0);
                }
                // const start = ev.shiftKey ? ev.srcElement.selectionStart : 0;
                // ev.srcElement.setSelectionRange(end, start);
                break;
            }
            case 'End': {
                if (ev.shiftKey) {
                    ev.srcElement.setSelectionRange(ev.srcElement.selectionStart, ev.srcElement.value.length);
                } else {
                    ev.srcElement.setSelectionRange(ev.srcElement.value.length, ev.srcElement.value.length);
                }
                // const len = ev.shiftKey ? ev.srcElement.value.length : ev.srcElement.value.length;
                // ev.srcElement.setSelectionRange(ev.srcElement.selectionStart, len, 'forward');
                break;
            }
        }
    });

    suggestActions = getSuggestActions(params.gridId);
    this.initForAutocomplete();
};

// AutoCompleteCellEditor.prototype.isPopup = function () {
//     return true;
// }

AutoCompleteCellEditor.prototype.getGui = function () {
    return this.gui;
};

AutoCompleteCellEditor.prototype.getValue = function () {
    return this.gui.value;
};

AutoCompleteCellEditor.prototype.afterGuiAttached = function () {
    this.gui.focus();
};

AutoCompleteCellEditor.prototype.initForAutocomplete = function () {
    autocomplete({
        input: this.gui,
        minLength: 1,
        onSelect: function (item, inputfield) {
            inputfield.value = item.label;

        },
        fetch: function (text, callback) {
            var match = text.toLowerCase();
            // sort suggestion list
            suggestActions.sort((a, b) => {
                const itemA = a.label.toLowerCase();
                const itemB = b.label.toLowerCase();
                if (itemA < itemB) return -1;
                if (itemA > itemB) return 1;
                return 0;
            });

            // display actions BEGIN with the inputted value first
            const fistmatch = suggestActions.filter(function (n) {
                return n.label.toLowerCase().indexOf(match) == 0;
            });
            // then display actions CONTAINS the inputted value
            const secondmatch = suggestActions.filter(function (n) {
                return n.label.toLowerCase().indexOf(match) > 0;
            });

            callback(fistmatch.concat(secondmatch));
        },
        render: function (item, value) {
            var itemElement = document.createElement("div");
            if (charsAllowed(value)) {
                var regex = new RegExp(value, 'gi');
                var inner = item.label.replace(regex, function (match) {
                    return "<font color='#00b0ff'>" + match + "</font>"
                });
                itemElement.innerHTML = inner;
            } else {
                itemElement.textContent = item.label;
            }
            return itemElement;
        },
        emptyMsg: "No actions found",
    })
};

function getSuggestActions(gridId) {
    var suggestKeywords = [];

    if (gridId === "th_grid") {
        var actionKeywords = actionDictionary.map(function (n) {
            return {
                label: n.keyword,
                description: n.description,
                group: "actions"
            };
        });
        suggestKeywords = [...actionKeywords, ...hookKeywords];
    } else if (gridId === "tc_grid") {
        suggestKeywords = actionDictionary.map(function (n) {
            return {
                label: n.keyword,
                description: n.description,
                group: "actions"
            };
        });
        suggestKeywords.push(testCaseKW);
    } else if (gridId === "locators_grid") {
        suggestKeywords.push(locatorKW);
    } else if (gridId === "methods_grid") {
        suggestKeywords = actionDictionary.map(function (n) {
            return {
                label: n.keyword,
                description: n.description,
                group: "actions"
            };
        });
        suggestKeywords.push(methodKW);
        suggestKeywords.push(argumentKW);
    }

    return suggestKeywords;
}

var allowedChars = new RegExp(/^[a-zA-Z\s]+$/);

function charsAllowed(value) {
    return allowedChars.test(value);
}