const vscode = acquireVsCodeApi();

const COL_1 = "col1";
const COL_2 = "col2";
const COL_3 = "col3";
const COL_4 = "col4";
const COL_5 = "col5";

var gridMap = new Map();

const defaultColumnDefs = {
    headerName: '',
    editable: true,
    resizable: true,
    minWidth: 100,
    cellClass: `${this.field}`,
    valueGetter: (params) => {
        // return JSON.stringify(params.data[`${params.colDef.field}`]);      
        const cell = params.data[`${params.colDef.field}`];
        if (isString(cell)) {
            return cell;
        }
        if (isObject(cell)) {
            return cell.value;
        }
        return cell;
    },
    valueFormatter: (params) => {
        const cell = params.data[`${params.colDef.field}`];
        if (isString(cell)) {
            return cell;
        }
        if (isObject(cell)) {
            return cell.value;
        }
        return cell;
    },
    valueSetter: (params) => {
        if (params.newValue !== params.oldValue) {
            const cell = params.data[`${params.colDef.field}`];
            if (isObject(cell)) {
                cell.value = params.newValue;
            } else {
                params.data[`${params.colDef.field}`] = params.newValue;
            }
            return true;
        }
        return false;
    },
    cellEditorSelector: (params) => {
        if (params.colDef.field === COL_1) return {
            component: 'autoCompleteCellEditor'
        };
        return {
            component: 'normalCellEditor'
        };
    },
}

function genRandomColumnName(columnSet) {
    let index = columnSet.size;
    while (columnSet.has("col" + index)) {
        index++;
    }
    columnSet.add("col" + index);
    return "col" + index;
}

function getCounter() {
    let counter = 1;
    return function () {
        return counter++;
    }
}

const genNextRowId = getCounter();

function isString(value) {
    return typeof value === 'string' || value instanceof String;
}

function isObject(value) {
    return value && typeof value === 'object' && value.constructor === Object;
}

function initGrid(gridID) {
    const gridObject = {
        gridHTMLElement: document.querySelector(gridID),
        gridColumnNames: new Set(),
        columnDefs: [],
        gridOptions: {
            suppressHorizontalScroll: true,
            autoSizePadding: 0,
            // autoSizeColumns: true,
            // suppressSizeToFit: true,
            domLayout: 'autoHeight',
            // suppressMovable: true,
            rowHeight: 40,
            headerHeight: 20,
            rowClass: 'abt-testcases-row',
            onGridReady: (params) => {
                udpateColumnSize(gridObject.gridHTMLElement, gridObject.gridOptions);
            },
            overlayLoadingTemplate: '<span></span>',
            onCellClicked: (event) => {
                handleCellClick(event, gridObject.gridOptions);
            },
            onCellEditingStopped: (params) => {
                autoSuggestParam(params, gridObject.gridOptions);
            },
            getRowNodeId: function (data) {
                if (!data.rowId) {
                    data.rowId = genNextRowId();
                }
                return data.rowId;
            },
            deltaRowDataMode: true,
            onColumnResized: (ev) => {
                if (ev.source !== 'sizeColumnsToFit' && ev.finished) {
                    udpateColumnSize(gridObject.gridHTMLElement, gridObject.gridOptions);
                }
            },
            components: {
                autoCompleteCellEditor: AutoCompleteCellEditor,
                normalCellEditor: NormalCellEditor
            }
        },
    }

    gridMap.set(gridID, gridObject);
    new agGrid.Grid(gridObject.gridHTMLElement, gridObject.gridOptions);
}

function handleCellClick(event, gridOptions) {
    addLine(event, gridOptions);
    deleteLine(event, gridOptions);
}

function addLine(event, gridOptions) {
    if (gridOptions.addLine) {
        gridOptions.api.updateRowData({
            add: [{
                [`${COL_1}`]: ""
            }],
            addIndex: event.rowIndex + 1
        });
        gridOptions.addLine = false;
    }
}

function deleteLine(event, gridOptions) {
    if (gridOptions.deleteLine) {
        gridOptions.api.updateRowData({
            remove: [event.data]
        });
        gridOptions.deleteLine = false;
    }
    const numberRow = gridOptions.api.getDisplayedRowCount();
    if (numberRow == 0) {
        gridOptions.addLine = true;
        addLine(event, gridOptions);
    }
}

function autoSuggestParam(params, gridOptions) {
    if (params.colDef.field === COL_1) {
        const keyword = params.data.col1.trim();
        const rowNode = params.node;
        const newRowData = getNewRowData(
            keyword,
            params.data,
            gridOptions.columnApi.getAllColumns().length);
        rowNode.setData(newRowData);
        gridOptions.api.redrawRows({
            rowNodes: [rowNode]
        });
    }
}

function getNewRowData(actionName, oldRowData, columnCount) {
    let returnVal = {};

    const header = "col";
    let index = 1;
    returnVal[`${header}${index}`] = actionName;

    const objActProp = actionDictionary.find((action) => {
        action.keyword === actionName.toLocaleLowerCase();
    });

    // check all column's value
    while (index <= columnCount) {
        // get caption for cell
        let caption = "";
        if (objActProp != undefined) {
            const lstArgument = objActProp.args;
            if (index <= lstArgument.length) {
                const arg = lstArgument[index - 1];
                caption = Object.keys(arg)[0];
            }
        }
        // get value for cell
        let value = "";
        const oldCellData = oldRowData[`${header}${index + 1}`];
        if (oldCellData != undefined) {
            const objValue = oldCellData.value;
            value = (objValue != undefined) ? objValue : oldCellData;
        }
        // build cell object include caption and/or value
        let argObj = {
            caption: "",
            value: "",
        };
        if (caption !== "" && value !== "") {
            argObj.caption = caption;
            argObj.value = value;
        } else if (caption === "" && value !== "") {
            argObj = value;
        } else if (caption !== "" && value === "") {
            argObj.caption = caption;
        } else {
            index++;
            continue;
        }
        returnVal[`${header}${++index}`] = argObj;
    }

    returnVal['rowId'] = oldRowData.rowId;

    return returnVal;
}

function udpateColumnSize(grid, gridOptions) {
    const bDisplay = getComputedStyle(grid).display;
    if (bDisplay !== "none") {
        gridOptions.api.sizeColumnsToFit();
    }
}

function injectGridData(gridObject, rowData, defaultRowData) {
    if (!rowData || rowData.length === 0) {
        rowData = defaultRowData;
        // return;
    }
    const lineMaxLength = rowData.reduce((prev, current) => (Object.keys(prev).length > Object.keys(current).length) ? prev : current);
    const columns = new Set([COL_1, COL_2, COL_3, COL_4, COL_5, ...Object.keys(lineMaxLength)]);
    columns.forEach(colx => {
        if (!gridObject.gridColumnNames.has(colx)) {
            let cellRenderer = "";
            let suppressKeyboardEvent = "";
            let cellEditorParams = {
                gridId: gridObject.gridHTMLElement.id
            };
            if (colx === COL_1) {
                cellRenderer = (params) => {
                    return keywordCellRenderer(params, gridObject.gridOptions);
                };
                suppressKeyboardEvent = (params) => {
                    if (params.editing) {
                        switch (params.event.key) {
                            case 'Home':
                            case 'End':
                                return true;
                        }
                    }
                    return false;
                }
            } else {
                cellRenderer = (params) => {
                    return paramCellRenderer(params);
                }
            }
            gridObject.columnDefs.push({
                ...defaultColumnDefs,
                field: colx,
                cellRenderer,
                cellEditorParams,
                suppressKeyboardEvent
            });
            gridObject.gridColumnNames.add(colx);
        }
    });
    gridObject.gridOptions.api.setColumnDefs(gridObject.columnDefs);
    gridObject.gridOptions.api.setRowData(rowData);
    udpateColumnSize(gridObject.gridHTMLElement, gridObject.gridOptions);
}

function getGridData(gridOptions) {
    const data = [];
    gridOptions.api.forEachNode(function (rowNode, index) {
        const row = {
            ...rowNode.data
        };
        delete row.rowId;

        // does not save row data with empty action
        if (row.col1) {
            data.push(row);
        }

    });

    return data;
}

function createButton(cssClass, eventName, eventCallback) {
    const newButton = document.createElement("input");
    newButton.type = "button";
    newButton.classList.add(cssClass);
    newButton.addEventListener(eventName, eventCallback);
    return newButton;
}

function keywordCellRenderer(params, gridOptions) {
    const cellContainer = document.createElement('div');
    cellContainer.classList.add('keyword-cell');

    const textContainer = document.createElement('div');
    const text = document.createTextNode(params.data[`${params.colDef.field}`]);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttonsContainer');

    const deleteLineButton = createButton('button-delete-line', 'click', () => {
        gridOptions.deleteLine = true;
    });

    const addLineButton = createButton('button-add-line', 'click', () => {
        gridOptions.addLine = true;
    });

    cellContainer.appendChild(textContainer);
    textContainer.appendChild(text);

    cellContainer.appendChild(buttonsContainer);
    buttonsContainer.appendChild(deleteLineButton);
    buttonsContainer.appendChild(addLineButton);

    return cellContainer;
}

function paramCellRenderer(params) {
    const cell = params.data[`${params.colDef.field}`];
    if (isObject(cell)) {
        return '<div class="argname">' +
            params.data[`${params.colDef.field}`].caption + '</div>' +
            '<div class="valuename">' +
            params.data[`${params.colDef.field}`].value + '</div>';
    }
    return cell;
}

function handleCollapse(btnCollapse, gridId) {
    var lstClass = btnCollapse.classList;
    const gridObject = gridMap.get(gridId);
    var content = gridObject.gridHTMLElement;
    if (lstClass.contains("button-collapse")) {
        btnCollapse.classList.remove("button-collapse");
        btnCollapse.classList.add("button-expand");
        content.style.display = "none";

    } else {
        btnCollapse.classList.remove("button-expand");
        btnCollapse.classList.add("button-collapse");
        content.style.display = "block";
        udpateColumnSize(gridObject.gridHTMLElement, gridObject.gridOptions);
    }
}