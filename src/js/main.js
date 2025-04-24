/*==============================================================================
 * (C) Copyright 2015,2020,2021,2022,2024 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:  Vanilla javascript code for the main public website
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
 * 2025-01-02 JJK   Added query to get Board of Trustees information from
 *                  an Azure Cosmos NoSQL container
 * 2025-01-11 JJK   Cleaned up the logic for handling link-tile-tab for
 *                  non-mediagallery links
 *============================================================================*/

import {empty,formatMoney,setCheckbox} from './util.js'
  
var duesPageTab = bootstrap.Tab.getOrCreateInstance(document.getElementById("DuesPageNavLink"))
var duesLinkTile = document.getElementById("DuesLinkTile");
var contactsPageTab = bootstrap.Tab.getOrCreateInstance(document.getElementById("ContactsPageNavLink"))
var contactsLinkTile = document.getElementById("ContactsLinkTile");

var addressInput = document.getElementById("address");
var messageDisplay = document.getElementById("MessageDisplay")

// Keep track of the state of the navbar collapse (shown or hidden)
var navbarCollapseShown = false
var collapsibleNavbar = document.getElementsByClassName("navbar-collapse")[0]
collapsibleNavbar.addEventListener('hidden.bs.collapse', function () {
    navbarCollapseShown = false
})
collapsibleNavbar.addEventListener('shown.bs.collapse', function () {
    navbarCollapseShown = true
})
 
// Listen for nav-link clicks
document.querySelectorAll("a.nav-link").forEach(el => el.addEventListener("click", function (event) {
    // Automatically hide the navbar collapse when an item link is clicked (and the collapse is currently shown)
    if (navbarCollapseShown) {
        new bootstrap.Collapse(document.getElementsByClassName("navbar-collapse")[0]).hide()
    }
}))

duesLinkTile.addEventListener("click", function (event) {
    duesPageTab.show();
})
contactsLinkTile.addEventListener("click", function (event) {
    contactsPageTab.show();
})

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


async function fetchPropertiesData() {
    const endpoint = "/api/GetPropertyList2";
    try {
        messageDisplay.textContent = "Fetching property information..."
        const response = await fetch(endpoint, {
            method: "POST",
            //headers: { "Content-Type": "application/json" },
            body: addressInput.value
        })
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        messageDisplay.textContent = ""
        displayPropertyList(data)
    } catch (err) {
        console.error(`Error in Fetch to ${endpoint}, ${err}`)
        messageDisplay.textContent = "Fetch data FAILED - check log"
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
        messageDisplay.textContent = "Fetching dues information..."
        const response = await fetch(endpoint, {
            method: "POST",
            //headers: { "Content-Type": "application/json" },
            body: element.getAttribute("data-parcelId")
        })
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        messageDisplay.textContent = ""
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

var photosUri = "https://grhawebstorage.blob.core.windows.net/photos/"
const presidentName = document.querySelectorAll('.PresidentName')
const presidentPhone = document.querySelectorAll('.PresidentPhone')
const presidentEmail = document.querySelectorAll('.PresidentEmail')
const treasurerName = document.querySelectorAll('.TreasurerName')
const treasurerPhone = document.querySelectorAll('.TreasurerPhone')
const treasurerEmail = document.querySelectorAll('.TreasurerEmail')
const trustees = document.querySelectorAll('.Trustee')

// Call the function to load Board of Trustees data every time the page is loaded
queryBoardInfo()
async function queryBoardInfo() {
    let boardGql = `query {
            boards (
                orderBy: { TrusteeId: ASC }
            ) {
                items {
                    Name
                    Position
                    PhoneNumber
                    EmailAddress
                    Description
                    ImageUrl
                }
            }
        }`

    //console.log(">>> query boardGql = "+boardGql)

    const apiQuery = {
        query: boardGql,
        variables: {
        }
    }

    const endpoint = "/data-api/graphql";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiQuery)
    });
    const result = await response.json();
    if (result.errors != null) {
        console.log("Error: "+result.errors[0].message);
        console.table(result.errors);
    } else {
        //console.log("result.data = "+result.data)

        const maxTrustees = result.data.boards.items.length
        if (maxTrustees > 0) {
            let i = -1
            trustees.forEach((cardBody) => {
                i++
                empty(cardBody)
                if (i < maxTrustees) {
                    if (result.data.boards.items[i].Position == "President") {
                        presidentName.forEach((element) => {
                            element.textContent = result.data.boards.items[i].Name
                        })
                        presidentPhone.forEach((element) => {
                            element.textContent = result.data.boards.items[i].PhoneNumber
                        })
                        presidentEmail.forEach((element) => {
                            element.textContent = result.data.boards.items[i].EmailAddress
                            element.href = "mailto:"+result.data.boards.items[i].EmailAddress+"?subject=GRHA Business"
                        })
                    }
                    if (result.data.boards.items[i].Position == "Treasurer") {
                        treasurerName.forEach((element) => {
                            element.textContent = result.data.boards.items[i].Name
                        })
                        treasurerPhone.forEach((element) => {
                            element.textContent = result.data.boards.items[i].PhoneNumber
                        })
                        treasurerEmail.forEach((element) => {
                            element.textContent = result.data.boards.items[i].EmailAddress
                            element.href = "mailto:"+result.data.boards.items[i].EmailAddress+"?subject=GRHA Business"
                        })
                    }

                    // Set the information in the Trustee cards
                    let trusteeImg = ""
                    if (result.data.boards.items[i].ImageUrl == "") {
                        trusteeImg = document.createElement('i')
                        trusteeImg.classList.add('fa','fa-user','fa-5x','float-start','me-3')
                    } else {
                        trusteeImg = document.createElement('img')
                        trusteeImg.classList.add('float-start','rounded','me-3')
                        trusteeImg.width = "100"
                        trusteeImg.src = result.data.boards.items[i].ImageUrl
                    }
                    let trusteeNamePosition = document.createElement('h5')
                    trusteeNamePosition.textContent = result.data.boards.items[i].Name + " - " + result.data.boards.items[i].Position
                    let trusteePhone = document.createElement('b')
                    trusteePhone.textContent = result.data.boards.items[i].PhoneNumber 
                    let trusteeEmail = document.createElement('h6')
                    let trusteeEmailLink = document.createElement('a')
                    trusteeEmailLink.textContent = result.data.boards.items[i].EmailAddress
                    trusteeEmailLink.href = "mailto:"+result.data.boards.items[i].EmailAddress+"?subject=GRHA Business"
                    let trusteeDesc = document.createElement('span')
                    trusteeDesc.textContent = result.data.boards.items[i].Description 
                    trusteeEmail.appendChild(trusteeEmailLink)
                    cardBody.appendChild(trusteeImg)
                    cardBody.appendChild(trusteeNamePosition)
                    cardBody.appendChild(trusteePhone)
                    cardBody.appendChild(trusteeEmail)
                    cardBody.appendChild(trusteeDesc)
                }
            })
        } // result.data.boards.items.length
    }
} // async function queryBoardInfo()

