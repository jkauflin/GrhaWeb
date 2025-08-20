/*==============================================================================
 * (C) Copyright 2015,2016,2017,2025 John J Kauflin, All rights reserved. 
 *----------------------------------------------------------------------------
 * DESCRIPTION:  JS code to support the web app Detail display functions
 *----------------------------------------------------------------------------
 * Modification History
 * 2015-03-06 JJK 	Initial version 
 * 2015-03-26 JJK	Solved initial DetailPage checkbox display problem by
 * 					moving format after the pagecontainer change (instead of
 * 					before it.  Let the page initialize first, then fill it.
 * 2015-04-09 JJK   Added Regular Expressions and functions for validating
 * 					email addresses and replacing non-printable characters
 * 2015-08-03 JJK	Modified to put the data parameters on the "a" element
 * 					and only response to clicks to the anchor
 * 2016-02-09 JJK	Switching from JQuery Mobile to Twitter Bootstrap
 * 2016-02-21 JJK   Test new Git
 * 2016-11-04 JJK   (Jackson's 14th birthday)
 * 2016-09-01 JJK   Corrected Owner order by year not id
 * 2016-09-02 JJK   Added NonCollectible field
 * 2016-09-20 JJK   Added NonCollectible fields to counts report
 * 2016-11-13 JJK	Added NonCollectible field to Dues Statement
 * 2016-11-25 JJK	Added InterestNotPaid and BankFee fields to Assessment
 * 					table, inserts, and updates
 * 2016-12-06 JJK   Added version parameter in the links to solve cache
 * 					re-load problem (?ver=1.0)
 * 2018-10-21 JJK   Re-factor for modules
 * 2018-10-28 JJK   Went back to declaring variables in the functions
 * 2018-11-03 JJK   Got update Properties working again with JSON POST
 * 2018-11-04 JJK   (Jackson's 16th birthday)
 *                  Got update Owner working again with JSON POST
 *                  Got update Assessment working again with JSON POST
 * 2018-11-25 JJK   Moved Dues Statement back to here
 * 2018-11-27 JJK   Added EmailAddr2
 * 2020-08-03 JJK   Re-factored for new error handling
 * 2020-12-22 JJK   Re-factored for Bootstrap 4
 * 2024-09-14 JJK   Starting conversion to Bootstrap 5, vanilla JS, 
 *                  js module, and move from PHP/MySQL to Azure SWA
 * 2024-09-16 JJK   Added set and use of detailPageTab to show the tab page
 * 2024-11-05 JJK   Completed getHoaRec, working on detail display
 * 2024-11-30 JJK   Added showLoadingSpinner for loading... display
 * 2025-05-14 JJK   Added checkFetchResponse for Fetch
 * 2025-05-16 JJK   Working on DuesStatement functions (and PDF)
 * 2025-05-20 JJK   Got rid of PDF and did a Print of the modal contents
 * 2025-06-01 JJK   Adding Property and Owner updates
 * 2025-06-14 JJK   Going back to the concept of storing a current hoaRec
 *                  (and the owner and assessment updates use the current
 *                  data for formatting, and then update with new values)
 *                  >>>>> need to do NEW Owner (do when you work on Sales info)
 * 2025-06-29 JJK   Got Assessment update working
 * 2025-07-18 JJK   Working on Lien button functionality
 * 2025-07-19 JJK   Moving Communications functionality here, and using a
 *                  modal instead of a tab page
 * 2025-08-07 JJK   Added create new owner functionality
 *============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,standardizeDate,formatDate,formatMoney,setTD,setCheckbox} from './util.js';

//=================================================================================================================
// Variables cached from the DOM
// Current hoaRec from last query and updates

var hoaRec
var createNewOwnerIdStr = "*** CREATE NEW OWNER (on Save) ***"
var isTouchDevice = 'ontouchstart' in document.documentElement

// DOM elements
var messageDisplay
var DuesStatementButton
var NewOwnerButton
//var CommunicationsButton
var Parcel_ID
var LotNo
var Property_Street_No
var Property_Street_Name
var Property_City
var Property_State
var Property_Zip
var TotalDue
var UseEmail
var Comments
var updParcel_ID
var updParcelLocation
var updOwnerID
var updCurrentOwner
var updOwner_Name1
var updOwner_Name2
var updDatePurchased
var updMailing_Name
var updAlternateMailing
var updAlt_Address_Line1
var updAlt_Address_Line2
var updAlt_City
var updAlt_State
var updAlt_Zip
var updOwner_Phone
var updEmailAddr
var updEmailAddr2
var updComments
var updLastChangedTs
var updLastChangedBy
var assId
var assParcel_ID
var assParcelLocation
var assOwnerID
var assFY
var assDuesAmt
var assDateDue
var assPaid
var assNonCollectible
var assDatePaid
var assPaymentMethod
var assLien
var assLienRefNo
var assDateFiled
var assDisposition
var assFilingFee
var assReleaseFee
var assDateReleased
var assLienDatePaid
var assAmountPaid
var assStopInterestCalc
var assFilingFeeInterest
var assAssessmentInterest
var assInterestNotPaid
var assBankFee
var assLienComment
var assComments
var assLastChangedBy
var assLastChangedTs
var UpdatePropertyForm
var propertyOwnersTbody
var propertyAssessmentsTbody
//var CommunicationsTbody
var duesStatementModal
var OwnerUpdateModal
var AssessmentUpdateModal
//var CommunicationsModal
var detailPageTab

//=================================================================================================================
// Bind events

document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements after DOM is ready
    messageDisplay = document.getElementById("DetailMessageDisplay")
    DuesStatementButton = document.getElementById("DuesStatementButton")
    NewOwnerButton = document.getElementById("NewOwnerButton")
    //CommunicationsButton = document.getElementById("CommunicationsButton")
    Parcel_ID = document.getElementById("Parcel_ID")
    LotNo = document.getElementById("LotNo")
    Property_Street_No = document.getElementById("Property_Street_No")
    Property_Street_Name = document.getElementById("Property_Street_Name")
    Property_City = document.getElementById("Property_City")
    Property_State = document.getElementById("Property_State")
    Property_Zip = document.getElementById("Property_Zip")
    TotalDue = document.getElementById("TotalDue")
    UseEmail = document.getElementById("UseEmail")
    Comments = document.getElementById("Comments")
    updParcel_ID = document.getElementById("updParcel_ID")
    updParcelLocation = document.getElementById("updParcelLocation")
    updOwnerID = document.getElementById("updOwnerID")
    updCurrentOwner = document.getElementById("updCurrentOwner")
    updOwner_Name1 = document.getElementById("updOwner_Name1")
    updOwner_Name2 = document.getElementById("updOwner_Name2")
    updDatePurchased = document.getElementById("updDatePurchased")
    updMailing_Name = document.getElementById("updMailing_Name")
    updAlternateMailing = document.getElementById("updAlternateMailing")
    updAlt_Address_Line1 = document.getElementById("updAlt_Address_Line1")
    updAlt_Address_Line2 = document.getElementById("updAlt_Address_Line2")
    updAlt_City = document.getElementById("updAlt_City")
    updAlt_State = document.getElementById("updAlt_State")
    updAlt_Zip = document.getElementById("updAlt_Zip")
    updOwner_Phone = document.getElementById("updOwner_Phone")
    updEmailAddr = document.getElementById("updEmailAddr")
    updEmailAddr2 = document.getElementById("updEmailAddr2")
    updComments = document.getElementById("updComments")
    updLastChangedTs = document.getElementById("updLastChangedTs")
    updLastChangedBy = document.getElementById("updLastChangedBy")
    assId = document.getElementById("assId")
    assParcel_ID = document.getElementById("assParcel_ID")
    assParcelLocation = document.getElementById("assParcelLocation")
    assOwnerID = document.getElementById("assOwnerID")
    assFY = document.getElementById("assFY")
    assDuesAmt = document.getElementById("assDuesAmt")
    assDateDue = document.getElementById("assDateDue")
    assPaid = document.getElementById("assPaid")
    assNonCollectible = document.getElementById("assNonCollectible")
    assDatePaid = document.getElementById("assDatePaid")
    assPaymentMethod = document.getElementById("assPaymentMethod")
    assLien = document.getElementById("assLien")
    assLienRefNo = document.getElementById("assLienRefNo")
    assDateFiled = document.getElementById("assDateFiled")
    assDisposition = document.getElementById("assDisposition")
    assFilingFee = document.getElementById("assFilingFee")
    assReleaseFee = document.getElementById("assReleaseFee")
    assDateReleased = document.getElementById("assDateReleased")
    assLienDatePaid = document.getElementById("assLienDatePaid")
    assAmountPaid = document.getElementById("assAmountPaid")
    assStopInterestCalc = document.getElementById("assStopInterestCalc")
    assFilingFeeInterest = document.getElementById("assFilingFeeInterest")
    assAssessmentInterest = document.getElementById("assAssessmentInterest")
    assInterestNotPaid = document.getElementById("assInterestNotPaid")
    assBankFee = document.getElementById("assBankFee")
    assLienComment = document.getElementById("assLienComment")
    assComments = document.getElementById("assComments")
    assLastChangedBy = document.getElementById("assLastChangedBy")
    assLastChangedTs = document.getElementById("assLastChangedTs")
    UpdatePropertyForm = document.getElementById("UpdatePropertyForm")
    propertyOwnersTbody = document.getElementById("PropertyOwnersTbody")
    propertyAssessmentsTbody = document.getElementById("PropertyAssessmentsTbody")
    //CommunicationsTbody = document.getElementById("CommunicationsTbody")
    duesStatementModal = new bootstrap.Modal(document.getElementById('duesStatementModal'));
    OwnerUpdateModal = new bootstrap.Modal(document.getElementById('OwnerUpdateModal'));
    AssessmentUpdateModal = new bootstrap.Modal(document.getElementById('AssessmentUpdateModal'));
    //CommunicationsModal = new bootstrap.Modal(document.getElementById('CommunicationsModal'));
    detailPageTab = bootstrap.Tab.getOrCreateInstance(document.querySelector(`.navbar-nav a[href="#DetailPage"]`))

    NewOwnerButton.addEventListener("click", function (event) {
        //console.log(">>> event.target.dataset.parcelId = "+event.target.dataset.parcelId)
        UpdateOwnerMessageDisplay.textContent = ""
        formatUpdateOwner(event.target.dataset.parcelId, "NEW")
    })

    DuesStatementButton.addEventListener("click", function () {
        getDuesStatement(this.dataset.parcelId)
    })

    //CommunicationsButton.addEventListener("click", function () {
    //    getCommunications(this.dataset.parcelId)
    //})

    // Add form validation classes to the input fields
    document.querySelectorAll('.form-control').forEach(input => {
        input.addEventListener('input', () => {
            if (input.checkValidity()) {
            input.classList.add('is-valid')
            input.classList.remove('is-invalid')
            } else {
            input.classList.add('is-invalid')
            input.classList.remove('is-valid')
            }
        })
    })

    UpdatePropertyForm.addEventListener('submit', (event) => {
        let formValid = UpdatePropertyForm.checkValidity()
        event.preventDefault()
        event.stopPropagation()
        messageDisplay.textContent = ""
        if (!formValid) {
            messageDisplay.textContent = "Form inputs are NOT valid"
        } else {
            updateProperty()
        }
        UpdatePropertyForm.classList.add('was-validated')
    })

    UpdateOwnerForm.addEventListener('submit', (event) => {
        let formValid = UpdateOwnerForm.checkValidity()
        event.preventDefault()
        event.stopPropagation()
        UpdateOwnerMessageDisplay.textContent = ""
        if (!formValid) {
            UpdateOwnerMessageDisplay.textContent = "Form inputs are NOT valid"
        } else {
            updateOwner()
        }
        UpdateOwnerForm.classList.add('was-validated')
    })

    UpdateAssessmentForm.addEventListener('submit', (event) => {
        let formValid = UpdateAssessmentForm.checkValidity()
        event.preventDefault()
        event.stopPropagation()
        UpdateAssessmentMessageDisplay.textContent = ""
        if (!formValid) {
            UpdateAssessmentMessageDisplay.textContent = "Form inputs are NOT valid"
        } else {
            updateAssessment()
        }
        UpdateAssessmentForm.classList.add('was-validated')
    })

    PrintModalButton.addEventListener("click", function () {
        printModal()
    })
})

// Respond to any clicks in the document and check for specific classes to respond to
// (Do it dynamically because elements with classes will be added to the DOM dynamically)
document.body.addEventListener('click', function (event) {
    //console.log("event.target.classList = "+event.target.classList)
    // Check for specific classes
    if (event.target && event.target.classList.contains("DetailDisplay")) {
        event.preventDefault();
        messageDisplay.textContent = ""
        getHoaRec(event.target.dataset.parcelId)
    } else if (event.target && event.target.classList.contains("OwnerUpdate")) {
        event.preventDefault();
        //console.log(">>> event.target.dataset.parcelId = "+event.target.dataset.parcelId)
        //console.log(">>> event.target.dataset.ownerId = "+event.target.dataset.ownerId)
        UpdateOwnerMessageDisplay.textContent = ""
        formatUpdateOwner(event.target.dataset.parcelId, event.target.dataset.ownerId)
    } else if (event.target && event.target.classList.contains("AssessmentUpdate")) {
        event.preventDefault();
        UpdateAssessmentMessageDisplay.textContent = ""
        formatUpdateAssessment(event.target.dataset.parcelId, event.target.dataset.ownerId, event.target.dataset.assessmentId, event.target.dataset.fy)
    }
})


export async function formatUpdateOwnerSale(parcelId,saleDate) {
    await getHoaRec(parcelId)
    formatUpdateOwner(parcelId,"NEW",saleDate)
}

export function formatUpdateOwner(parcelId,ownerId,saleDate="") {
    if (hoaRec.property.parcel_ID != parcelId) {
        console.error("Parcel ID not found in current hoaRec, id = "+parcelId)
         messageDisplay.textContent = `Parcel ID not found in current hoaRec, id = ${parcelId}`
        return        
    }

    let ownerRec = null
    let salesRec = null

    if (ownerId == "NEW") {
        // Get the current owner rec
        for (let index in hoaRec.ownersList) {
            if (hoaRec.ownersList[index].currentOwner == 1) {
                ownerRec = hoaRec.ownersList[index]
            }
        }

        // get the Sales record for this parcel (if new and saledt passed)
        if (saleDate != "") {
            for (let index in hoaRec.salesList) {
                //if (hoaRec.property.parcel_ID == parcelId && hoaRec.salesList[index].saleDate == saleDate) {
                if (hoaRec.property.parcel_ID == parcelId && hoaRec.salesList[index].saledt == saleDate) {
                    salesRec = hoaRec.salesList[index]
                }
            }
        }
    } else {
        // Find the correct owner rec
        for (let index in hoaRec.ownersList) {
            if (hoaRec.property.parcel_ID == parcelId && hoaRec.ownersList[index].ownerID == ownerId) {
                ownerRec = hoaRec.ownersList[index]
            }
        }
    }
    if (ownerRec == null) {
        console.error("Owner ID not found in current hoaRec, id = "+ownerId)
        messageDisplay.textContent = `Owner ID not found in current hoaRec, id = ${ownerId}`
        return        
    }

    updParcel_ID.value = hoaRec.property.parcel_ID
    updParcelLocation.textContent = hoaRec.property.parcel_Location
    updOwnerID.value = ownerRec.id
    updCurrentOwner.checked = ownerRec.currentOwner
    updOwner_Name1.value = ownerRec.owner_Name1
    updOwner_Name2.value = ownerRec.owner_Name2
    updDatePurchased.value = standardizeDate(ownerRec.datePurchased)
    updMailing_Name.value = ownerRec.mailing_Name
    updAlternateMailing.checked = ownerRec.alternateMailing
    updAlt_Address_Line1.value = ownerRec.alt_Address_Line1
    updAlt_Address_Line2.value = ownerRec.alt_Address_Line2
    updAlt_City.value = ownerRec.alt_City
    updAlt_State.value = ownerRec.alt_State
    updAlt_Zip.value = ownerRec.alt_Zip
    updOwner_Phone.value = ownerRec.owner_Phone
    updEmailAddr.value = ownerRec.emailAddr
    updEmailAddr2.value = ownerRec.emailAddr2
    updComments.value = ownerRec.comments
    updLastChangedTs.value = ownerRec.lastChangedTs
    updLastChangedBy.value = ownerRec.lastChangedBy

    // If creating a NEW owner, override values from the sale rec
    if (ownerId == "NEW") {
        updOwnerID.value = createNewOwnerIdStr
        if (salesRec != null) {
            updOwner_Name1.value = salesRec.ownernamE1
            updOwner_Name2.value = ""
            updDatePurchased.value = standardizeDate(salesRec.saledt)
            updMailing_Name.value = salesRec.mailingnamE1 + " " + salesRec.mailingnamE2
        }
    }

    OwnerUpdateModal.show()
}

function formatUpdateAssessment(parcelId, ownerId, assessmentId, fy) {
    // Populate the Owner dropdown with all owners for this parcel
    assOwnerID.innerHTML = "";
    let ownerRec = null;
    hoaRec.ownersList.forEach(owner => {
        if (hoaRec.property.parcel_ID == parcelId && owner.ownerID == ownerId) {
            ownerRec = owner;
        }
        let option = document.createElement("option");
        option.value = owner.ownerID;
        option.textContent = owner.ownerID + " - " + (owner.owner_Name1 || "") + " " + (owner.owner_Name2 || "");
        if (owner.ownerID == ownerId) {
            option.selected = true;
        }
        assOwnerID.appendChild(option);
    });
    if (ownerRec == null) {
        console.error("Owner ID not found in current hoaRec, id = " + ownerId);
        return;
    }

    // Find the correct assessment rec
    let assessmentRec = null;
    for (let index in hoaRec.assessmentsList) {
        if (hoaRec.property.parcel_ID == parcelId && hoaRec.assessmentsList[index].ownerID == ownerId && hoaRec.assessmentsList[index].id == assessmentId) {
            assessmentRec = hoaRec.assessmentsList[index];
        }
    }
    if (assessmentRec == null) {
        console.error("Assessment ID not found in current hoaRec, id = " + assessmentId);
        return;
    }

    assParcel_ID.value = parcelId;
    assParcelLocation.textContent = hoaRec.property.parcel_Location;
    assId.value = assessmentId;
    assFY.value = fy;

    assDuesAmt.value = formatMoney(assessmentRec.duesAmt);
    assDateDue.value = standardizeDate(assessmentRec.dateDue);
    assPaid.checked = assessmentRec.paid;
    assNonCollectible.checked = assessmentRec.nonCollectible;
    assDatePaid.value = standardizeDate(assessmentRec.datePaid);
    assPaymentMethod.value = assessmentRec.paymentMethod;
    assLien.checked = assessmentRec.lien;
    assLienRefNo.value = assessmentRec.lienRefNo;
    assDateFiled.value = standardizeDate(assessmentRec.dateFiled);
    assDisposition.value = assessmentRec.disposition;
    assFilingFee.value = formatMoney(assessmentRec.filingFee);
    assReleaseFee.value = formatMoney(assessmentRec.releaseFee);
    assDateReleased.value = standardizeDate(assessmentRec.dateReleased);
    assLienDatePaid.value = standardizeDate(assessmentRec.lienDatePaid);
    assAmountPaid.value = formatMoney(assessmentRec.amountPaid);
    assStopInterestCalc.checked = assessmentRec.stopInterestCalc;
    assFilingFeeInterest.value = formatMoney(assessmentRec.filingFeeInterest);
    assAssessmentInterest.value = formatMoney(assessmentRec.assessmentInterest);
    assInterestNotPaid.checked = assessmentRec.interestNotPaid;
    assBankFee.value = formatMoney(assessmentRec.bankFee);
    assLienComment.value = assessmentRec.lienComment;
    assComments.value = assessmentRec.comments;
    assLastChangedBy.value = assessmentRec.lastChangedBy;
    assLastChangedTs.value = assessmentRec.lastChangedTs;

    AssessmentUpdateModal.show();
}

var UpdateOwnerMessageDisplay = document.getElementById("UpdateOwnerMessageDisplay")
var UpdateOwnerForm = document.getElementById("UpdateOwnerForm")

var UpdateAssessmentMessageDisplay = document.getElementById("UpdateAssessmentMessageDisplay")
var UpdateAssessmentForm = document.getElementById("UpdateAssessmentForm")


// Handle the file upload backend server call
async function updateOwner() {
    UpdateOwnerMessageDisplay.textContent = "Updating Owner..."

    let newOwner = false
    if (updOwnerID.value == createNewOwnerIdStr) {
        newOwner = true
    }

    try {
        const response = await fetch("/api/UpdateOwner", {
            method: "POST",
            body: new FormData(UpdateOwnerForm)
        })
        await checkFetchResponse(response)
        // Success
        let ownerRec = await response.json();
        OwnerUpdateModal.hide()
        if (newOwner) {
            await getHoaRec(ownerRec.parcel_ID)
            messageDisplay.textContent = "New Owner created sucessfully"
        } else {
            // Replace the record in the owners list
            let ownerFound = false
            for (let index in hoaRec.ownersList) {
                if (hoaRec.property.parcel_ID == ownerRec.parcel_ID && hoaRec.ownersList[index].ownerID == ownerRec.ownerID) {
                    ownerFound = true
                    hoaRec.ownersList[index] = ownerRec
                }
            }
            if (!ownerFound) {
                console.error("Owner ID not found in current hoaRec, id = "+ownerRec.ownerId)
                messageDisplay.textContent = "Owner ID not found in current hoaRec, id = "+ownerRec.ownerId
                return        
            }
            // Display the updated owner record
            messageDisplay.textContent = "Owner updated sucessfully"
            displayDetailOwners()
        }
    } catch (err) {
        console.error(err)
        UpdateOwnerMessageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

// Handle the file upload backend server call
async function updateAssessment() {
    UpdateAssessmentMessageDisplay.textContent = "Updating Assessment..."
    try {
        const response = await fetch("/api/UpdateAssessment", {
            method: "POST",
            body: new FormData(UpdateAssessmentForm)
        })
        await checkFetchResponse(response)
        // Success
        let assessmentRec = await response.json()
        AssessmentUpdateModal.hide()
        // Replace the record in the assessments list
        let assessmentFound = false
        for (let index in hoaRec.assessmentsList) {
            if (hoaRec.property.parcel_ID == assessmentRec.parcel_ID && hoaRec.assessmentsList[index].id == assessmentRec.id) {
                assessmentFound = true
                hoaRec.assessmentsList[index] = assessmentRec
            }
        }
        if (!assessmentFound) {
            console.error("Assessment ID not found in current hoaRec, id = "+assessmentRec.id)
            messageDisplay.textContent = "Assessment ID not found in current hoaRec, id = "+assessmentRec.id
            return        
        } else {
            displayDetailAssessments()
            messageDisplay.textContent = "Assessment updated sucessfully"
        }
    } catch (err) {
        console.error(err)
        UpdateAssessmentMessageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}


// Handle the file upload backend server call
async function updateProperty() {
    messageDisplay.textContent = "Updating Property..."
    try {
        const response = await fetch("/api/UpdateProperty", {
            method: "POST",
            body: new FormData(UpdatePropertyForm)
        })
        await checkFetchResponse(response)
        // Success
        messageDisplay.textContent = await response.text();
    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

/*
async function getCommunications(parcelId) {
    //console.log("getCommunications called with parcelId = "+parcelId)
    commParcel_ID.value = parcelId
    showLoadingSpinner(messageDisplay)

    let paramData = {
        parcelId: parcelId
    }

    try {
        const response = await fetch("/api/GetCommunications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramData)
        })
        await checkFetchResponse(response)
        // Success
        let communicationsList = await response.json();
        formatCommunicationsResults(communicationsList);
         messageDisplay.textContent = ""
        CommunicationsModal.show();
    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

function formatCommunicationsResults(communicationsList) {
    // Example assumes communicationsRec is an array of communication objects
    // and there is a table with id "CommunicationsTable" in the modal

    let tbody = CommunicationsTbody
    empty(tbody)
    let tr = document.createElement("tr");
    let td = document.createElement("td");
    let th = document.createElement("th");
    
    if (!communicationsList || communicationsList.length === 0) {
        td.colSpan = 4;
        td.textContent = "No communications found.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    tr = document.createElement('tr')
    tr.classList.add('small')
    // Append the header elements
    th = document.createElement("th"); th.textContent = "CommID"; tr.appendChild(th)        
    th = document.createElement("th"); th.textContent = "Datetime"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Type"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Email"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Sent"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Address"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Name"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Description"; tr.appendChild(th)
    //th = document.createElement("th"); th.textContent = "Last Changed"; tr.appendChild(th)

    //th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Comments"; tr.appendChild(th)
    tbody.appendChild(tr)

    // Append a row for every record in list
    for (let index in communicationsList) {
        let commRec = communicationsList[index]

        tr = document.createElement('tr')
        tr.classList.add('small')

        td = document.createElement("td"); td.textContent = commRec.commID; tr.appendChild(td)
        td = document.createElement("td"); td.textContent = standardizeDate(commRec.createTs); tr.appendChild(td)
        td = document.createElement("td"); td.textContent = commRec.commType; tr.appendChild(td)
        td = document.createElement("td"); td.textContent = commRec.emailAddr; tr.appendChild(td)
        td = document.createElement("td"); td.textContent = commRec.sentStatus; tr.appendChild(td)
        td = document.createElement("td"); td.textContent = "test address"; tr.appendChild(td)
        td = document.createElement("td"); td.textContent = commRec.mailing_Name; tr.appendChild(td)
        td = document.createElement("td"); td.textContent = commRec.commDesc; tr.appendChild(td)
        //td = document.createElement("td"); td.textContent = standardizeDate(commRec.createTs); tr.appendChild(td)

        tbody.appendChild(tr)
    }
}
*/

async function getHoaRec(parcelId) {
    // Clear out the property detail display fields
    //Parcel_ID.textContent = ""
    Parcel_ID.value = ""
    LotNo.textContent = ""
    Property_Street_No.textContent = ""
    Property_Street_Name.textContent = ""
    Property_City.textContent = ""
    Property_State.textContent = ""
    Property_Zip.textContent = ""
    TotalDue.textContent = ""
    UseEmail.checked = false
    Comments.value = ""

    // Clear out the display tables for Owner and Assessment lists
    empty(propertyOwnersTbody)
    empty(propertyAssessmentsTbody)

    let paramData = {
        parcelId: parcelId
        //ownerId: ownerId
        //fy: fy,
        //saleDate: saleDate
    }

    showLoadingSpinner(messageDisplay)
    detailPageTab.show()

    try {
        const response = await fetch("/api/GetHoaRec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramData)
            //headers: { "Content-Type": "text/plain" },
            //body: parcelId
        })
        await checkFetchResponse(response)
        // Success
        hoaRec = await response.json();
        messageDisplay.textContent = ""
        displayDetail()

    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

function displayDetail() {
    // *** Remember C# object to JS JSON structure object has different camel-case rules (makes 1st character lowercase, etc.) ***

    Parcel_ID.value = hoaRec.property.parcel_ID
    LotNo.textContent = hoaRec.property.lotNo
    Property_Street_No.textContent = hoaRec.property.property_Street_No
    Property_Street_Name.textContent = hoaRec.property.property_Street_Name
    Property_City.textContent = hoaRec.property.property_City
    Property_State.textContent = hoaRec.property.property_State
    Property_Zip.textContent = hoaRec.property.property_Zip
    TotalDue.textContent = "$"+hoaRec.totalDue
    UseEmail.checked = hoaRec.property.useEmail
    Comments.value = hoaRec.property.comments

    displayDetailOwners()
    displayDetailAssessments()

    DuesStatementButton.dataset.parcelId = hoaRec.property.parcel_ID
    NewOwnerButton.dataset.parcelId = hoaRec.property.parcel_ID
    //CommunicationsButton.dataset.parcelId = hoaRec.property.parcel_ID
}

function displayDetailOwners() {
    // Clear out the display tables for Owner list
    empty(propertyOwnersTbody)

    let tr = ''
    let th = ''
    let td = ''
    let tbody = ''

    tbody = propertyOwnersTbody
    tr = document.createElement('tr')
    tr.classList.add('small')
    // Append the header elements
    th = document.createElement("th"); th.textContent = "OwnId"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Owner"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Phone"; tr.appendChild(th)
    th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Date Purchased"; tr.appendChild(th)
    th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Alt Address"; tr.appendChild(th)
    th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Comments"; tr.appendChild(th)
    tbody.appendChild(tr)

    // Append a row for every record in list
    for (let index in hoaRec.ownersList) {
        let ownerRec = hoaRec.ownersList[index]

        tr = document.createElement('tr')
        tr.classList.add('small')

        td = document.createElement("td"); td.textContent = ownerRec.ownerID; tr.appendChild(td)

        let a = document.createElement("a")
        a.href = ""
        a.classList.add("OwnerUpdate")
        a.dataset.parcelId = ownerRec.parcel_ID
        a.dataset.ownerId = ownerRec.ownerID
        a.textContent = ownerRec.owner_Name1 + ' ' + ownerRec.owner_Name2
        td = document.createElement("td"); 
        td.appendChild(a);
        tr.appendChild(td)

        td = document.createElement("td"); td.textContent = ownerRec.owner_Phone; tr.appendChild(td)
        td = document.createElement("td"); td.classList.add('d-none','d-md-table-cell'); td.textContent = standardizeDate(ownerRec.datePurchased); tr.appendChild(td)
        td = document.createElement("td"); td.classList.add('d-none','d-md-table-cell'); td.textContent = ownerRec.alt_Address_Line1; tr.appendChild(td)
        td = document.createElement("td"); td.classList.add('d-none','d-md-table-cell'); td.textContent = ownerRec.comments; tr.appendChild(td)

        tbody.appendChild(tr)
    }
}

function displayDetailAssessments() {
    // Clear out the display tables for Assessment lists
    empty(propertyAssessmentsTbody)
    let tr = ''
    let th = ''
    let td = ''
    let tbody = ''

    tbody = propertyAssessmentsTbody
    let lienButton = ''
    let buttonColor = ''
    var ButtonType = ''
    let checkbox = ''

    tr = document.createElement('tr')
    tr.classList.add('small')
    // Append the header elements
    th = document.createElement("th"); th.textContent = "OwnId"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "FY"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Dues Amt"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Lien"; tr.appendChild(th)
    th = document.createElement("th"); th.textContent = "Paid"; tr.appendChild(th)
    th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Non-Coll"; tr.appendChild(th)
    th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Date Paid"; tr.appendChild(th)
    //th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Date Due"; tr.appendChild(th)
    th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Payment"; tr.appendChild(th)
    th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Comments"; tr.appendChild(th)
    tbody.appendChild(tr)

    // Append a row for every record in list
    for (let index in hoaRec.assessmentsList) {
        let assessmentRec = hoaRec.assessmentsList[index]

        lienButton = ''
        ButtonType = ''

        tr = document.createElement('tr')
        tr.classList.add('small')

        td = document.createElement("td"); td.textContent = assessmentRec.ownerID; tr.appendChild(td)

        let a = document.createElement("a")
        a.classList.add("AssessmentUpdate")
        a.href = ""
        a.dataset.parcelId = hoaRec.property.parcel_ID
        // >>>>> find a way to offer "Change Owner"?
        a.dataset.ownerId = assessmentRec.ownerID
        a.dataset.assessmentId = assessmentRec.id
        a.dataset.fy = assessmentRec.fy
        a.textContent = assessmentRec.fy
        td = document.createElement("td"); 
        td.appendChild(a);
        tr.appendChild(td)

        tr.appendChild(setTD("money",assessmentRec.duesAmt))

        // Clicking the Lien button will open the Assessment Update modal
        td = document.createElement("td")
        if (assessmentRec.lien) {
            if (assessmentRec.disposition == 'Open') {
                buttonColor = 'btn-danger';
            } else if (assessmentRec.disposition == 'Paid') {
                buttonColor = 'btn-success';
            } else {
                buttonColor = 'btn-info';
            }
            lienButton = document.createElement("button")
            lienButton.setAttribute('type',"button")
            lienButton.setAttribute('role',"button")
            lienButton.dataset.parcelId = hoaRec.property.parcel_ID
            lienButton.dataset.ownerId = assessmentRec.ownerID
            lienButton.dataset.assessmentId = assessmentRec.id
            lienButton.dataset.fy = assessmentRec.fy
            lienButton.classList.add('btn',buttonColor,'btn-sm','shadow-none','AssessmentUpdate')
            lienButton.textContent = "Lien"
            td.appendChild(lienButton)
        } else {
            if (assessmentRec.duesDue) {
                buttonColor = 'btn-warning';
                lienButton = document.createElement("button")
                lienButton.setAttribute('type',"button")
                lienButton.setAttribute('role',"button")
                lienButton.dataset.parcelId = hoaRec.property.parcel_ID
                lienButton.dataset.ownerId = assessmentRec.ownerID
                lienButton.dataset.assessmentId = assessmentRec.id
                lienButton.dataset.fy = assessmentRec.fy
                lienButton.classList.add('btn',buttonColor,'btn-sm','shadow-none','AssessmentUpdate')
                lienButton.textContent = "Create Lien"
                td.appendChild(lienButton)
            }
        }
        tr.appendChild(td)

        tr.appendChild(setTD("checkbox",assessmentRec.paid,"d-none d-sm-table-cell"))
        tr.appendChild(setTD("checkbox",assessmentRec.nonCollectible,"d-none d-sm-table-cell"))
        tr.appendChild(setTD("date",assessmentRec.datePaid,"d-none d-sm-table-cell"))
        //tr.appendChild(setTD("date",assessmentRec.dateDue,"d-none d-sm-table-cell"))
        tr.appendChild(setTD("text",assessmentRec.paymentMethod,"d-none d-sm-table-cell"))
        tr.appendChild(setTD("text",assessmentRec.comments+' '+assessmentRec.lienComment,"d-none d-sm-table-cell"))

        tbody.appendChild(tr)
    }
}

async function getDuesStatement(parcelId) {
    let paramData = {
        parcelId: parcelId
        //ownerId: ownerId
        //fy: fy,
        //saleDate: saleDate
    }

    showLoadingSpinner(messageDisplay)
    try {
        const response = await fetch("/api/GetHoaRec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramData)
        })
        await checkFetchResponse(response)
        // Success
        let hoaRec = await response.json();
        messageDisplay.textContent = ""
        formatDuesStatementResults(hoaRec);
        duesStatementModal.show();
    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

function formatDuesStatementResults(hoaRec) {
    let ownerRec = hoaRec.ownersList[0];
    let duesStatementPropertyTable = document.getElementById("DuesStatementPropertyTable")
    let payDues = document.getElementById("PayDues")
    let payDuesInstructions = document.getElementById("PayDuesInstructions")      
    let DuesStatementNotes = document.getElementById("DuesStatementNotes")      
    let DuesStatementDate = document.getElementById("DuesStatementDate")      
    
    empty(payDues)
    empty(payDuesInstructions)
    empty(DuesStatementNotes)
    empty(DuesStatementDate)
    let tbody = duesStatementPropertyTable.getElementsByTagName("tbody")[0]
    empty(tbody)

    DuesStatementDate.textContent = formatDate()

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
    th = document.createElement("th"); th.textContent = "Owner Name: "; tr.appendChild(th)
    td = document.createElement("td"); td.textContent = ownerRec.owner_Name1 + ' ' + ownerRec.owner_Name2
    tr.appendChild(td)
    tbody.appendChild(tr)

    tr = document.createElement('tr')
    th = document.createElement("th"); th.textContent = "Total Due: "; tr.appendChild(th)
    td = document.createElement("td")
    let tempTotalDue = '' + hoaRec.totalDue;
    td.textContent = formatMoney(tempTotalDue)
    tr.appendChild(td)
    tbody.appendChild(tr)
    
    // If enabled, payment button and instructions will have values, else they will be blank if online payment is not allowed
    if (hoaRec.totalDue > 0) {
        payDuesInstructions.classList.add("mb-3")
        payDuesInstructions.innerHTML = hoaRec.paymentInstructions
        if (hoaRec.duesStatementNotes != null) {
            if (hoaRec.duesStatementNotes.length > 0) {
                DuesStatementNotes.textContent = hoaRec.duesStatementNotes
            }
        }
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
        th = document.createElement("th"); th.textContent = 'Non-Collectible'; tr.appendChild(th)
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
                td = document.createElement("td"); td.innerHTML = setCheckbox(rec.nonCollectible); tr.appendChild(td)
                //td = document.createElement("td"); td.textContent = rec.DatePaid.substring(0, 10); tr.appendChild(td)
                td = document.createElement("td"); td.textContent = rec.datePaid; tr.appendChild(td)
                tbody.appendChild(tr)
            }
        }
    }
    
} // End of function formatDuesStatementResults(hoaRec){

var DuesStatementContent = document.getElementById("DuesStatementContent")
var PrintModalButton = document.getElementById("PrintModalButton")

function printModal() {
    // Get modal content
    let modalContent = DuesStatementContent.innerHTML;
    // Populate hidden div
    let printArea = document.getElementById("printArea");
    printArea.innerHTML = modalContent;
    // Trigger print
    window.print();
}

