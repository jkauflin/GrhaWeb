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
 *============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,standardizeDate,formatDate,formatMoney,setTD,setCheckbox} from './util.js';

//=================================================================================================================
// Variables cached from the DOM
//var searchStr = document.getElementById("searchStr")
//var searchButton = document.getElementById("SearchButton")

var detailPageTab = bootstrap.Tab.getOrCreateInstance(document.querySelector(`.navbar-nav a[href="#DetailPage"]`))
var messageDisplay = document.getElementById("DetailMessageDisplay")
var isTouchDevice = 'ontouchstart' in document.documentElement

// Current hoaRec from last query and updates
var hoaRec

var DuesStatementButton = document.getElementById("DuesStatementButton")
var NewOwnerButton = document.getElementById("NewOwnerButton")
var CommunicationsButton = document.getElementById("CommunicationsButton")

var Parcel_ID = document.getElementById("Parcel_ID")
var LotNo = document.getElementById("LotNo")
var Property_Street_No = document.getElementById("Property_Street_No")
var Property_Street_Name = document.getElementById("Property_Street_Name")
var Property_City = document.getElementById("Property_City")
var Property_State = document.getElementById("Property_State")
var Property_Zip = document.getElementById("Property_Zip")
var TotalDue = document.getElementById("TotalDue")
/*
var Rental = document.getElementById("Rental")
var Managed = document.getElementById("Managed")
var Foreclosure = document.getElementById("Foreclosure")
var Bankruptcy = document.getElementById("Bankruptcy")
*/
var UseEmail = document.getElementById("UseEmail")
var Comments = document.getElementById("Comments")

var propertyOwnersTbody = document.getElementById("PropertyOwnersTbody")
var propertyAssessmentsTbody = document.getElementById("PropertyAssessmentsTbody")

var duesStatementModal = document.getElementById('duesStatementModal')
var OwnerUpdateModal = document.getElementById('OwnerUpdateModal')
var AssessmentUpdateModal = document.getElementById('AssessmentUpdateModal')

var updParcel_ID = document.getElementById("updParcel_ID")
var updParcelLocation = document.getElementById("updParcelLocation")
var updOwnerID = document.getElementById("updOwnerID")
var updCurrentOwner = document.getElementById("updCurrentOwner")
var updOwner_Name1 = document.getElementById("updOwner_Name1")
var updOwner_Name2 = document.getElementById("updOwner_Name2")
var updDatePurchased = document.getElementById("updDatePurchased")
var updMailing_Name = document.getElementById("updMailing_Name")
var updAlternateMailing = document.getElementById("updAlternateMailing")
var updAlt_Address_Line1 = document.getElementById("updAlt_Address_Line1")
var updAlt_Address_Line2 = document.getElementById("updAlt_Address_Line2")
var updAlt_City = document.getElementById("updAlt_City")
var updAlt_State = document.getElementById("updAlt_State")
var updAlt_Zip = document.getElementById("updAlt_Zip")
var updOwner_Phone = document.getElementById("updOwner_Phone")
var updEmailAddr = document.getElementById("updEmailAddr")
var updEmailAddr2 = document.getElementById("updEmailAddr2")
var updComments = document.getElementById("updComments")
var updLastChangedTs = document.getElementById("updLastChangedTs")
var updLastChangedBy = document.getElementById("updLastChangedBy")

var assId = document.getElementById("assId")
var assParcel_ID = document.getElementById("assParcel_ID")
var assParcelLocation = document.getElementById("assParcelLocation")
var assOwnerID = document.getElementById("assOwnerID")
var assFY = document.getElementById("assFY")
var assDuesAmt = document.getElementById("assDuesAmt")
var assDateDue = document.getElementById("assDateDue")
var assPaid = document.getElementById("assPaid")
var assNonCollectible = document.getElementById("assNonCollectible")
var assDatePaid = document.getElementById("assDatePaid")
var assPaymentMethod = document.getElementById("assPaymentMethod")
var assLien = document.getElementById("assLien")
var assLienRefNo = document.getElementById("assLienRefNo")
var assDateFiled = document.getElementById("assDateFiled")
var assDisposition = document.getElementById("assDisposition")
var assFilingFee = document.getElementById("assFilingFee")
var assReleaseFee = document.getElementById("assReleaseFee")
var assDateReleased = document.getElementById("assDateReleased")
var assLienDatePaid = document.getElementById("assLienDatePaid")
var assAmountPaid = document.getElementById("assAmountPaid")
var assStopInterestCalc = document.getElementById("assStopInterestCalc")
var assFilingFeeInterest = document.getElementById("assFilingFeeInterest")
var assAssessmentInterest = document.getElementById("assAssessmentInterest")
var assInterestNotPaid = document.getElementById("assInterestNotPaid")
var assBankFee = document.getElementById("assBankFee")
var assLienComment = document.getElementById("assLienComment")
var assComments = document.getElementById("assComments")
var assLastChangedBy = document.getElementById("assLastChangedBy")
var assLastChangedTs = document.getElementById("assLastChangedTs")

//=================================================================================================================
// Bind events

// Respond to any clicks in the document and check for specific classes to respond to
// (Do it dynamically because elements with classes will be added to the DOM dynamically)
document.body.addEventListener('click', function (event) {
    //console.log("event.target.classList = "+event.target.classList)
    // Check for specific classes
    if (event.target && event.target.classList.contains("DetailDisplay")) {
        event.preventDefault();
        UpdatePropertyMessageDisplay.textContent = ""
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

DuesStatementButton.addEventListener("click", function () {
    getDuesStatement(this.dataset.parcelId)
})


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

function formatUpdateOwner(parcelId,ownerId) {
    // Find the correct owner rec
    let ownerRec = null
    for (let index in hoaRec.ownersList) {
        if (hoaRec.property.parcel_ID == parcelId && hoaRec.ownersList[index].ownerID == ownerId) {
            ownerRec = hoaRec.ownersList[index]
        }
    }

    if (ownerRec == null) {
        console.error("Owner ID not found in current hoaRec, id = "+ownerId)
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
    
    new bootstrap.Modal(OwnerUpdateModal).show();
}

function formatUpdateAssessment(parcelId,ownerId,assessmentId,fy) {
    // Find the correct owner rec
    let ownerRec = null
    for (let index in hoaRec.ownersList) {
        if (hoaRec.property.parcel_ID == parcelId && hoaRec.ownersList[index].ownerID == ownerId) {
            ownerRec = hoaRec.ownersList[index]
        }
    }
    if (ownerRec == null) {
        console.error("Owner ID not found in current hoaRec, id = "+ownerId)
        return        
    }

    // Find the correct assessment rec
    let assessmentRec = null
    for (let index in hoaRec.assessmentsList) {
        if (hoaRec.property.parcel_ID == parcelId && hoaRec.assessmentsList[index].ownerID == ownerId && hoaRec.assessmentsList[index].id == assessmentId) {
            assessmentRec = hoaRec.assessmentsList[index]
        }
    }
    if (assessmentRec == null) {
        console.error("Assessment ID not found in current hoaRec, id = "+assessmentId)
        return        
    }
    
    assParcel_ID.value = parcelId
    assParcelLocation.textContent = hoaRec.property.parcel_Location
    assOwnerID.value = ownerId + " - " + ownerRec.owner_Name1 + " " + ownerRec.owner_Name2
    assId.value = assessmentId
    assFY.value = fy
    
    assDuesAmt.value = formatMoney(assessmentRec.duesAmt)
    assDateDue.value = standardizeDate(assessmentRec.dateDue)
    assPaid.checked = assessmentRec.paid
    assNonCollectible.checked = assessmentRec.nonCollectible
    assDatePaid.value = standardizeDate(assessmentRec.datePaid)
    assPaymentMethod.value = assessmentRec.paymentMethod
    assLien.checked = assessmentRec.lien
    assLienRefNo.value = assessmentRec.lienRefNo
    assDateFiled.value = standardizeDate(assessmentRec.dateFiled)
    assDisposition.value = assessmentRec.disposition
    assFilingFee.value = formatMoney(assessmentRec.filingFee)
    assReleaseFee.value = formatMoney(assessmentRec.releaseFee)
    assDateReleased.value = standardizeDate(assessmentRec.dateReleased)
    assLienDatePaid.value = standardizeDate(assessmentRec.lienDatePaid)
    assAmountPaid.value = formatMoney(assessmentRec.amountPaid)
    assStopInterestCalc.checked = assessmentRec.stopInterestCalc
    assFilingFeeInterest.value = formatMoney(assessmentRec.filingFeeInterest)
    assAssessmentInterest.value = formatMoney(assessmentRec.assessmentInterest)
    assInterestNotPaid.checked = assessmentRec.interestNotPaid
    assBankFee.value = formatMoney(assessmentRec.bankFee)
    assLienComment.value = assessmentRec.lienComment
    assComments.value = assessmentRec.comments
    assLastChangedBy.value = assessmentRec.lastChangedBy
    assLastChangedTs.value = assessmentRec.lastChangedTs

    new bootstrap.Modal(AssessmentUpdateModal).show();
}

var UpdateOwnerMessageDisplay = document.getElementById("UpdateOwnerMessageDisplay")
var UpdateOwnerForm = document.getElementById("UpdateOwnerForm")

var UpdateAssessmentMessageDisplay = document.getElementById("UpdateAssessmentMessageDisplay")
var UpdateAssessmentForm = document.getElementById("UpdateAssessmentForm")

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

// Handle the file upload backend server call
async function updateOwner() {
    UpdateOwnerMessageDisplay.textContent = "Updating Owner..."
    try {
        const response = await fetch("/api/UpdateOwner", {
            method: "POST",
            body: new FormData(UpdateOwnerForm)
        })
        await checkFetchResponse(response)
        // Success
        let ownerRec = await response.json();
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
            UpdateOwnerMessageDisplay.textContent = "Owner ID not found in current hoaRec, id = "+ownerRec.ownerId
            return        
        } else {
            displayDetailOwners()
            UpdateOwnerMessageDisplay.textContent = "Owner updated sucessfully"
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
        let assessmentRec = await response.json();
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
            UpdateAssessmentMessageDisplay.textContent = "Assessment ID not found in current hoaRec, id = "+assessmentRec.id
            return        
        } else {
            displayDetailAssessments()
            UpdateAssessmentMessageDisplay.textContent = "Assessment updated sucessfully"
        }
    } catch (err) {
        console.error(err)
        UpdateAssessmentMessageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}


var UpdatePropertyMessageDisplay = document.getElementById("UpdatePropertyMessageDisplay")
var UpdatePropertyForm = document.getElementById("UpdatePropertyForm")

UpdatePropertyForm.addEventListener('submit', (event) => {
    let formValid = UpdatePropertyForm.checkValidity()
    event.preventDefault()
    event.stopPropagation()
    UpdatePropertyMessageDisplay.textContent = ""
    if (!formValid) {
        UpdatePropertyMessageDisplay.textContent = "Form inputs are NOT valid"
    } else {
        updateProperty()
    }
    UpdatePropertyForm.classList.add('was-validated')
})

// Handle the file upload backend server call
async function updateProperty() {
    UpdatePropertyMessageDisplay.textContent = "Updating Property..."
    try {
        const response = await fetch("/api/UpdateProperty", {
            method: "POST",
            body: new FormData(UpdatePropertyForm)
        })
        await checkFetchResponse(response)
        // Success
        UpdatePropertyMessageDisplay.textContent = await response.text();
    } catch (err) {
        console.error(err)
        UpdatePropertyMessageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}


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
    /*
    Rental.checked = false
    Managed.checked = false
    Foreclosure.checked = false
    Bankruptcy.checked = false
    */
    UseEmail.checked = false
    Comments.textContent = ""

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
    let tr = ''
    let th = ''
    let td = ''
    let tbody = ''

    //Parcel_ID.textContent = hoaRec.property.parcel_ID
    Parcel_ID.value = hoaRec.property.parcel_ID
    LotNo.textContent = hoaRec.property.lotNo
    Property_Street_No.textContent = hoaRec.property.property_Street_No
    Property_Street_Name.textContent = hoaRec.property.property_Street_Name
    Property_City.textContent = hoaRec.property.property_City
    Property_State.textContent = hoaRec.property.property_State
    Property_Zip.textContent = hoaRec.property.property_Zip
    TotalDue.textContent = "$"+hoaRec.totalDue
    UseEmail.checked = hoaRec.property.useEmail
    Comments.textContent = hoaRec.property.comments

    displayDetailOwners()
    displayDetailAssessments()

    DuesStatementButton.dataset.parcelId = hoaRec.property.parcel_ID
    NewOwnerButton.dataset.parcelId = hoaRec.property.parcel_ID
    //NewOwnerButton.dataset.ownerId = 
    CommunicationsButton.dataset.parcelId = hoaRec.property.parcel_ID
    //CommunicationsButton.dataset.ownerId = 
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
        // >>>>> find a way to offer "Change Owner"
        //a.dataset.ownerId = ownerRec.ownerID
        a.dataset.ownerId = assessmentRec.ownerID
        a.dataset.assessmentId = assessmentRec.id
        a.dataset.fy = assessmentRec.fy
        a.textContent = assessmentRec.fy
        td = document.createElement("td"); 
        td.appendChild(a);
        tr.appendChild(td)

        //td = document.createElement("td"); td.textContent = formatMoney(assessmentRec.duesAmt); tr.appendChild(td)
        tr.appendChild(setTD("money",assessmentRec.duesAmt))

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
        new bootstrap.Modal(duesStatementModal).show();
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
PrintModalButton.addEventListener("click", function () {
    printModal()
})

function printModal() {
    // Get modal content
    let modalContent = DuesStatementContent.innerHTML;
    // Populate hidden div
    let printArea = document.getElementById("printArea");
    printArea.innerHTML = modalContent;
    // Trigger print
    window.print();
}

