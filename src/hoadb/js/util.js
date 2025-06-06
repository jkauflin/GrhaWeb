/*==============================================================================
 * (C) Copyright 2015,2016,2017,2018,2024 John J Kauflin, All rights reserved. 
 *----------------------------------------------------------------------------
 * DESCRIPTION: 
 *----------------------------------------------------------------------------
 * Modification History
 * 2015-03-06 JJK 	Initial version 
 * 2015-04-09 JJK   Added Regular Expressions and functions for validating
 * 					email addresses and replacing non-printable characters
 * 2016-05-18 JJK   Added setTextArea
 * 2016-08-14 JJK   Imported data from Access backup of 8/12/2016
 * 2016-08-26 JJK   Went live, and Paypal payments working in Prod!!!
 * 2018-10-14 JJK   Re-factored for modules
 * 2018-10-27 JJK   Modified getJSONfromInputs to just loop through the DIV
 *                  looking for input fields, and added an action parameter
 * 2018-10-28 JJK   Went back to declaring variables in the functions
 * 2018-11-01 JJK   Modified getJSONfromInputs to only include elements with
 *                  an Id and check for checkbox "checked"
 * 2019-09-22 JJK   Checked logic for dues emails and communications
 * 2020-08-03 JJK   Removed ajaxError handling - error handling re-factor
 *                  Moved result.error check and message display to the
 *                  individual calls
 * 2020-12-22 JJK   Re-factored for Bootstrap 4, and added displayTabPage
 * 2021-02-07 JJK   Added formateDateMonth
 * 2024-09-10 JJK   Starting conversion to Bootstrap 5, vanilla JS, 
 *                  js module, and move from PHP/MySQL to Azure SWA
 * 2024-11-30 JJK   Added the showLoadingSpinner function to display a 
 *                  Loading... message with a built-in Bootstrap spinner
 * 2025-05-14 JJK   Added checkFetchResponse to check status and get
 *                  error messages from a Fetch response
 * 2025-05-15 JJK   Added standardizeDate
 *============================================================================*/

//=================================================================================================================
// Variables cached from the DOM

var spanSpinner = document.createElement("span")
spanSpinner.classList.add("spinner-grow","spinner-grow-sm","me-2")
spanSpinner.setAttribute("aria-hidden","true")
var spanSpinnerStatus = document.createElement("span")
spanSpinnerStatus.setAttribute("role","status")
spanSpinnerStatus.textContent = "Loading..."
    
//=================================================================================================================
// Module methods
export function showLoadingSpinner(buttonElement) {
    empty(buttonElement)
    buttonElement.appendChild(spanSpinner)            
    buttonElement.appendChild(spanSpinnerStatus)            
}
       
// Remove all child nodes from an element
export function empty(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild)
    }
}

export async function checkFetchResponse(response) {
    if (!response.ok) {
        let errMessage = "Error unknown"
        if (response.statusText != "") {
            errMessage = response.statusText
        }
        try {
            let responseText = await response.text()
            if (responseText != "") {
                errMessage = responseText
            }
            // Check if there is a JSON structure in the response (which contains errors)
            const result = JSON.parse(errMessage)
            if (result.errors != null) {
                console.log("Error: "+result.errors[0].message)
                console.table(result.errors)
                errMessage = result.errors[0].message
            }
        } catch (err) {
            // Ignore JSON parse errors from trying to find structures in the response
        }
        throw new Error(errMessage)
    } 
}

//Replace every ascii character except decimal and digits with a null, and round to 2 decimal places
var nonMoneyCharsStr = "[\x01-\x2D\x2F\x3A-\x7F]";
//"g" global so it does more than 1 substitution
var regexNonMoneyChars = new RegExp(nonMoneyCharsStr, "g");
export function formatMoney(inAmount) {
    var inAmountStr = '' + inAmount;
    inAmountStr = inAmountStr.replace(regexNonMoneyChars, '');
    return parseFloat(inAmountStr).toFixed(2);
}

export function setTD(tdType,value,classStr="") {
    let td = document.createElement("td")
    if (classStr != "") {
        // The .split(" ") method converts the string into an array of class names
        // The spread operator (...) ensures each class is added individually
        td.classList.add(...classStr.split(" "))
    }
    if (tdType == "text") {
        td.textContent = value
    } else if (tdType == "date") {
        td.textContent = standardizeDate(value)
    } else if (tdType == "money") {
        td.textContent = formatMoney(value)
    } else if (tdType == "checkbox") {
        let checkbox = document.createElement("input");
        checkbox.type = tdType;
        checkbox.classList.add('form-check-input','shadow-none')
        checkbox.checked = (value == 1) ? checkbox.checked = true : false
        checkbox.disabled = true;
        td.appendChild(checkbox)
    }
    return td
}

export function setCheckbox(checkVal) {
    var tempStr = '';
    if (checkVal == 1) {
        tempStr = 'checked=true';
    }
    return '<input type="checkbox" ' + tempStr + ' disabled="disabled">';
}

export function standardizeDate(dateStr) {
    let outDateStr = dateStr
    const containsSlash = dateStr.includes("/")
    if (containsSlash) {
        //const [month, day, year] = slashDate.split("/")
        const [month, day, year] = dateStr.split("/")
        outDateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
    return outDateStr
}

export function formatDate(inDate) {
    var tempDate = inDate;
    if (tempDate == null) {
        tempDate = new Date();
    }
    var tempMonth = tempDate.getMonth() + 1;
    if (tempDate.getMonth() < 9) {
        tempMonth = '0' + (tempDate.getMonth() + 1);
    }
    var tempDay = tempDate.getDate();
    if (tempDate.getDate() < 10) {
        tempDay = '0' + tempDate.getDate();
    }
    return tempDate.getFullYear() + '-' + tempMonth + '-' + tempDay;
}



    function urlParam(name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
            return null;
        }
        else {
            return results[1] || 0;
        }
    }
    /*
    example.com?param1=name&param2=&id=6
        urlParam('param1');     // name
        urlParam('id');         // 6
        rlParam('param2');      // null
    */

    // Non-Printable characters - Hex 01 to 1F, and 7F
    var nonPrintableCharsStr = "[\x01-\x1F\x7F]";
    // "g" global so it does more than 1 substitution
    var regexNonPrintableChars = new RegExp(nonPrintableCharsStr, "g");
    function cleanStr(inStr) {
        return inStr.replace(regexNonPrintableChars, '');
    }

    // Filter out commas (for CSV outputs)
    var commaHexStr = "[\x2C]";
    var regexCommaHexStr = new RegExp(commaHexStr, "g");
    function csvFilter(inVal) {
        return inVal.toString().replace(regexCommaHexStr, '');
    }

    function formatDate2(inDate) {
        var tempDate = inDate;
        if (tempDate == null) {
            tempDate = new Date();
        }
        var tempMonth = tempDate.getMonth() + 1;
        if (tempDate.getMonth() < 9) {
            tempMonth = '0' + (tempDate.getMonth() + 1);
        }
        var tempDay = tempDate.getDate();
        if (tempDate.getDate() < 10) {
            tempDay = '0' + tempDate.getDate();
        }
        return tempDate.getFullYear() + '-' + tempMonth + '-' + tempDay;
    }

    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function formatDateMonth(inDate) {
        var tempDate = inDate;
        if (tempDate == null) {
            tempDate = new Date();
        }
        return months[tempDate.getMonth()] + ' ' + tempDate.getDate() + ', ' + tempDate.getFullYear();
    }


    // Helper functions for setting UI components from data
    function setBoolText(inBool) {
        var tempStr = "NO";
        if (inBool) {
            tempStr = "YES";
        }
        return tempStr;
    }
    //function setCheckboxEdit(checkVal, idName) {
    function setCheckboxEdit(idName, checkVal) {
        var tempStr = '';
        if (checkVal == 1) {
            tempStr = 'checked=true';
        }
        return '<input id="' + idName + '" type="checkbox" ' + tempStr + '>';
    }
    function setInputText(idName, textVal, textSize) {
        return '<input id="' + idName + '" name="' + idName + '" type="text" class="form-control input-sm resetval" value="' + textVal + '" size="' + textSize + '" maxlength="' + textSize + '">';
    }
    function setTextArea(idName, textVal, rows) {
        return '<textarea id="' + idName + '" class="form-control input-sm" rows="' + rows + '">' + textVal + '</textarea>';
    }
    function setTextArea2(idName, textVal, rows, cols) {
        return '<textarea id="' + idName + '" class="form-control input-sm" rows="' + rows + '" cols="' + cols + '">' + textVal + '</textarea>';
    }
    function setInputDate(idName, textVal, textSize) {
        return '<input id="' + idName + '" type="text" class="form-control input-sm Date" value="' + textVal + '" size="' + textSize + '" maxlength="' + textSize + '" placeholder="YYYY-MM-DD">';
    }
    function setSelectOption(optVal, displayVal, selected, bg) {
        var tempStr = '';
        if (selected) {
            tempStr = '<option class="' + bg + '" value="' + optVal + '" selected>' + displayVal + '</option>';
        } else {
            tempStr = '<option class="' + bg + '" value="' + optVal + '">' + displayVal + '</option>';
        }
        return tempStr;
    }

