/*==============================================================================
 * (C) Copyright 2015,2020,2021,2022,2024 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:
 *----------------------------------------------------------------------------
 * Modification History
 * 2015-03-06 JJK 	Initial version
 * 2016-03-01 JJK	Converted from JQuery Mobile to Twitter Bootstrap
 * 2016-03-25 JJK	Got most of website together.  PDF modals, help button,
 * 					fleshed out all menus but FAQ.
 * 2016-03-26 JJK	Working on property search and Dues Statement modal
 * 2016-08-26 JJK   Completed Dues Checker dues statement display (with
 * 					online payment option)
 * 2017-10-08 JJK	Update to HTML5 boilerplate 6, bootstrap 3.3, jquery 3
 * 2018-11-23 JJK   Re-factored for modules
 * 2020-03-14 JJK   Re-factored to use the new MediaGallery library and
 *                  Media folder for all photos and docs
 * 2020-03-15 JJK   Moved the dues stuff to dues.js
 * 2020-12-21 JJK   Moved dues stuff back here and added link-time handling
 * 2021-01-02 JJK   Modified for new Paypal API rather than smart button
 * 2022-05-31 JJK   Modified to use new fetch logic for service calls
 * 2022-06-01 JJK   Moved navbar tab stuff to navtab.js, and implement
 *                  vanilla javascript handling of duesStatement clicks
 * 2022-06-26 JJK   Converted the rest of the JQuery to vanilla javascript
 *                  (to remove the dependance and load of JQuery library)
 * 2024-08-25 JJK   Updated to be a js module and moved other js code to here
 * 2024-11-12 JJK   Updates for migration to Azure SWA
 * 2024-11-18 JJK   Got the api calls and Dues Statement working
 *============================================================================*/

var addressInput = document.getElementById("address");

// Keep track of the state of the navbar collapse (shown or hidden)
var navbarCollapseShown = false;
var collapsibleNavbar = document.getElementsByClassName("navbar-collapse")[0];
collapsibleNavbar.addEventListener('hidden.bs.collapse', function () {
    navbarCollapseShown = false;
})
collapsibleNavbar.addEventListener('shown.bs.collapse', function () {
    navbarCollapseShown = true;
})
 
// Listen for nav-link clicks
document.querySelectorAll("a.nav-link").forEach(el => el.addEventListener("click", function (event) {
    // Automatically hide the navbar collapse when an item link is clicked (and the collapse is currently shown)
    if (navbarCollapseShown) {
        new bootstrap.Collapse(document.getElementsByClassName("navbar-collapse")[0]).hide()
    }
}))

// Respond to click on a link-tile-tab button by finding the correct TAB and switching/showing it
// (These link-tile-tab's also have media-page for creating the Menu, but these handled from the listener on that class)
document.querySelectorAll(".link-tile-tab").forEach(el => el.addEventListener("click", function (event) {
    //console.log("link-tile-tab click ")
    let targetTab = event.target.getAttribute("data-dir")
    let targetTabPage = targetTab + 'Page';
    let targetTabElement = document.querySelector(`.navbar-nav a[href="#${targetTabPage}"]`);
    // If the target tab element is found, create a Tab object and call the show() method
    if (typeof targetTabElement !== "undefined" && targetTabElement !== null) {
        bootstrap.Tab.getOrCreateInstance(targetTabElement).show();
    }
}))

    
    // Check if a Tab name is passed as a parameter on the URL and navigate to it
    /*
    var results = new RegExp('[\?&]tab=([^&#]*)').exec(window.location.href);
    if (results != null) {
        let tabName = results[1] || 0;
        displayTabPage(tabName);
    }
    */

document.body.addEventListener("click", function (event) {
    if (event.target && event.target.classList.contains("DuesStatement")) {
        getDuesStatement(event.target);
    }
})

document.getElementById("InputValues").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault()
        fetchPropertiesData()
    }
})

document.getElementById("DuesSearchButton").addEventListener("click", function () {
    fetchPropertiesData()
})

// Remove all child nodes from an element
function empty(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild)
    }
}

//Replace every ascii character except decimal and digits with a null, and round to 2 decimal places
var nonMoneyCharsStr = "[\x01-\x2D\x2F\x3A-\x7F]";
//"g" global so it does more than 1 substitution
var regexNonMoneyChars = new RegExp(nonMoneyCharsStr, "g");
function formatMoney(inAmount) {
    let inAmountStr = '' + inAmount;
    inAmountStr = inAmountStr.replace(regexNonMoneyChars, '');
    return parseFloat(inAmountStr).toFixed(2);
}

function setCheckbox(checkVal) {
    var tempStr = '';
    if (checkVal == 1) {
        tempStr = 'checked=true';
    }
    return '<input type="checkbox" ' + tempStr + ' disabled="disabled">';
}

async function fetchPropertiesData() {
    const endpoint = "/api/GetPropertyList2";
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            //headers: { "Content-Type": "application/json" },
            body: addressInput.value
        })
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        displayPropertyList(data)
    } catch (err) {
        console.error(`Error in Fetch to ${endpoint}, ${err}`)
        document.getElementById("MessageDisplay").textContent = "Fetch data FAILED - check log"
    }
}
    
function displayPropertyList(hoaPropertyRecList) {
        let propertyListDisplay = document.getElementById("PropertyListDisplay")
        let tbody = propertyListDisplay.getElementsByTagName("tbody")[0]
        empty(tbody)

        if (hoaPropertyRecList == null || hoaPropertyRecList.length == 0) {
            let tr = document.createElement('tr')
            tr.textContent = "No records found - try different search parameters"
            tbody.appendChild(tr)
        } else {
            let tr = document.createElement('tr')
            // Append the header elements
            let th = document.createElement("th"); th.textContent = "Row"; tr.appendChild(th)
            th = document.createElement("th"); th.textContent = "Parcel Location"; tr.appendChild(th)
            th = document.createElement("th"); th.classList.add('d-none','d-sm-table-cell'); th.textContent = "Parcel Id"; tr.appendChild(th)
            th = document.createElement("th"); th.classList.add('d-none','d-lg-table-cell'); th.textContent = "Lot No"; tr.appendChild(th)
            th = document.createElement("th"); th.classList.add('d-none','d-lg-table-cell'); th.textContent = "Sub Div"; tr.appendChild(th)
            th = document.createElement("th"); th.textContent = "Dues Statement"; tr.appendChild(th)
            tbody.appendChild(tr)

            // Append a row for every record in list
            for (let index in hoaPropertyRecList) {
                let hoaPropertyRec = hoaPropertyRecList[index]

                tr = document.createElement('tr')
                let td = document.createElement("td"); td.textContent = Number(index) + 1; tr.appendChild(td)
                td = document.createElement("td"); td.textContent = hoaPropertyRec.parcelLocation; tr.appendChild(td)
                td = document.createElement("td"); td.classList.add('d-none','d-sm-table-cell'); td.textContent = hoaPropertyRec.parcelId; tr.appendChild(td)
                td = document.createElement("td"); td.classList.add('d-none','d-lg-table-cell'); td.textContent = hoaPropertyRec.lotNo; tr.appendChild(td)
                td = document.createElement("td"); td.classList.add('d-none','d-lg-table-cell'); td.textContent = hoaPropertyRec.subDivParcel; tr.appendChild(td)
                td = document.createElement("td")
                let button = document.createElement("button"); button.setAttribute('type',"button"); button.setAttribute('role',"button")
                button.setAttribute('data-parcelId', hoaPropertyRec.parcelId); button.classList.add('btn','btn-success','btn-sm','DuesStatement')
                button.textContent = "Dues Statement"
                td.appendChild(button)
                tr.appendChild(td)
                tbody.appendChild(tr)
            }
        }
}

async function getDuesStatement(element) {
    const endpoint = "/api/GetHoaRec2";
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            //headers: { "Content-Type": "application/json" },
            body: element.getAttribute("data-parcelId")
        })
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        formatDuesStatementResults(data);
        new bootstrap.Modal(document.getElementById('duesStatementModal')).show();
    } catch (err) {
        console.error(`Error in Fetch to ${endpoint}, ${err}`)
        document.getElementById("MessageDisplay").textContent = "Fetch data FAILED - check log"
    }
}

function formatDuesStatementResults(hoaRec) {
    let duesStatementPropertyTable = document.getElementById("DuesStatementPropertyTable")
    let payDues = document.getElementById("PayDues")
    let payDuesInstructions = document.getElementById("PayDuesInstructions")
        
    empty(payDues)
    empty(payDuesInstructions)

    let tbody = duesStatementPropertyTable.getElementsByTagName("tbody")[0]
    empty(tbody)

    let tr = document.createElement('tr')
    let th = document.createElement("th"); th.textContent = "Parcel Id: "; tr.appendChild(th)
    let td = document.createElement("td"); td.textContent = hoaRec.property.parcel_ID; tr.appendChild(td)
        tbody.appendChild(tr)
        tr = document.createElement('tr')
        th = document.createElement("th"); th.textContent = "Lot No: "; tr.appendChild(th)
        td = document.createElement("td"); td.textContent = hoaRec.property.lotNo; tr.appendChild(td)
        tbody.appendChild(tr)
        tr = document.createElement('tr')
        th = document.createElement("th"); th.textContent = "Location: "; tr.appendChild(th)
        td = document.createElement("td"); td.textContent = hoaRec.property.parcel_Location; tr.appendChild(td)
        tbody.appendChild(tr)
        tr = document.createElement('tr')
        th = document.createElement("th"); th.textContent = "City State Zip: "; tr.appendChild(th)
        td = document.createElement("td"); td.textContent = hoaRec.property.property_City + ', ' + hoaRec.property.property_State + ' ' + hoaRec.property.property_Zip
        tr.appendChild(td)
        tbody.appendChild(tr)
        tr = document.createElement('tr')
        th = document.createElement("th"); th.textContent = "Total Due: "; tr.appendChild(th)
        td = document.createElement("td")
        let tempTotalDue = '' + hoaRec.totalDue;
        td.textContent = formatMoney(tempTotalDue)
        tr.appendChild(td)
        tbody.appendChild(tr)

        //var tempDuesAmt = formatMoney(hoaRec.assessmentsList[0].DuesAmt);
        var tempDuesAmt = formatMoney(hoaRec.assessmentsList[0].duesAmt);

        // If enabled, payment button and instructions will have values, else they will be blank if online payment is not allowed
        if (hoaRec.totalDue > 0) {
            // Only offer online payment if total due is just the current assessment (i.e. prior year due needs to contact the Treasurer)
            if (tempDuesAmt == hoaRec.totalDue) {
                let i = document.createElement("i");
                i.classList.add('fa','fa-usd','float-start','mr-1')
                i.textContent = ' Click HERE to make payment online'
                let a = document.createElement("a")
                a.href = "payDues.html?parcelId=" + hoaRec.parcel_ID
                a.classList.add('btn','btn-success','m-2','link-tile')
                a.appendChild(i)
                payDues.appendChild(a)
            }
            payDuesInstructions.classList.add("mb-3")
            payDuesInstructions.innerHTML = hoaRec.paymentInstructions
        }


        let duesStatementCalculationTable = document.getElementById("DuesStatementCalculationTable")
        tbody = duesStatementCalculationTable.getElementsByTagName("tbody")[0]
        empty(tbody)

        // Display the dues calculation lines
        if (hoaRec.totalDuesCalcList != null && hoaRec.totalDuesCalcList.length > 0) {
            for (let index in hoaRec.totalDuesCalcList) {
                let rec = hoaRec.totalDuesCalcList[index]
                tr = document.createElement('tr')
                td = document.createElement("td"); td.textContent = rec.calcDesc; tr.appendChild(td)
                td = document.createElement("td"); td.textContent = '$'; tr.appendChild(td)
                td = document.createElement("td"); td.style.textAlign = "right";
                td.textContent = parseFloat('' + rec.calcValue).toFixed(2); tr.appendChild(td)
                tbody.appendChild(tr)
            }
        }

        tr = document.createElement('tr')
        td = document.createElement("td"); td.textContent = "Total Due: "; tr.appendChild(td)
        td = document.createElement("td"); td.textContent = '$'; tr.appendChild(td)
        td = document.createElement("td"); td.style.textAlign = "right";
        td.textContent = parseFloat('' + hoaRec.totalDue).toFixed(2) ; tr.appendChild(td)
        tbody.appendChild(tr)

        tr = document.createElement('tr')
        td = document.createElement("td"); td.textContent = hoaRec.assessmentsList[0].lienComment; tr.appendChild(td)
        td = document.createElement("td"); td.textContent = ''; tr.appendChild(td)
        td = document.createElement("td"); td.style.textAlign = "right"; td.textContent = ''; tr.appendChild(td)
        tbody.appendChild(tr)


        let duesStatementAssessmentsTable = document.getElementById("DuesStatementAssessmentsTable")
        tbody = duesStatementAssessmentsTable.getElementsByTagName("tbody")[0]
        empty(tbody)

    // Display the assessment lines
    if (hoaRec.assessmentsList != null && hoaRec.assessmentsList.length > 0) {
        tr = document.createElement('tr')
        th = document.createElement("th"); th.textContent = 'Year'; tr.appendChild(th)
        th = document.createElement("th"); th.textContent = 'Dues Amt'; tr.appendChild(th)
        th = document.createElement("th"); th.textContent = 'Date Due'; tr.appendChild(th)
        th = document.createElement("th"); th.textContent = 'Paid'; tr.appendChild(th)
        th = document.createElement("th"); th.textContent = 'Date Paid'; tr.appendChild(th)
        tbody.appendChild(tr)

        let tempDuesAmt = '';
        let maxPaymentHistoryLines = 6;
        for (let index in hoaRec.assessmentsList) {
            let rec = hoaRec.assessmentsList[index]
            // 2024-11-08 JJK - new logic to limit display of historical PAID (or Non-Collectible)
            if ((!rec.paid && !rec.nonCollectible) || index < maxPaymentHistoryLines) {
                tempDuesAmt = '' + rec.duesAmt;
                tr = document.createElement('tr')
                td = document.createElement("td"); td.textContent = rec.fy ; tr.appendChild(td)
                td = document.createElement("td"); td.textContent = formatMoney(tempDuesAmt); tr.appendChild(td)
                //td = document.createElement("td"); td.textContent = rec.DateDue.substring(0, 10); tr.appendChild(td)
                td = document.createElement("td"); td.textContent = rec.dateDue; tr.appendChild(td)
                td = document.createElement("td"); td.innerHTML = setCheckbox(rec.paid); tr.appendChild(td)
                //td = document.createElement("td"); td.textContent = rec.DatePaid.substring(0, 10); tr.appendChild(td)
                td = document.createElement("td"); td.textContent = rec.datePaid; tr.appendChild(td)
                tbody.appendChild(tr)
            }
        }
    }

} // End of function formatDuesStatementResults(hoaRec){

