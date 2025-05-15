/*==============================================================================
 * (C) Copyright 2015,2016,2017,2018,2024 John J Kauflin, All rights reserved. 
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
 *============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,formatMoney,setTD} from './util.js';

//=================================================================================================================
// Variables cached from the DOM
//var searchStr = document.getElementById("searchStr")
//var searchButton = document.getElementById("SearchButton")

var detailPageTab = bootstrap.Tab.getOrCreateInstance(document.querySelector(`.navbar-nav a[href="#DetailPage"]`))
var messageDisplay = document.getElementById("DetailMessageDisplay")
var isTouchDevice = 'ontouchstart' in document.documentElement

// Do I still need these at this level???
var hoaRec
var currPdfRec

var MCTreasLink = document.getElementById("MCTreasLink")
var MCAuditorLink = document.getElementById("MCAuditorLink")
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
var Rental = document.getElementById("Rental")
var Managed = document.getElementById("Managed")
var Foreclosure = document.getElementById("Foreclosure")
var Bankruptcy = document.getElementById("Bankruptcy")
var UseEmail = document.getElementById("UseEmail")
var Comments = document.getElementById("Comments")
var PropertyUpdateButton = document.getElementById("PropertyUpdateButton")

var propertyOwnersTbody = document.getElementById("PropertyOwnersTbody")
var propertyAssessmentsTbody = document.getElementById("PropertyAssessmentsTbody")


/*
lastChangedBy
: 
"president"
lastChangedTs
: 
"2016-08-19T21:41:50"
*/

/*
var $editValidationError = $(".editValidationError");

var $EditPage = $("#EditPage");
var $EditTable = $("#EditTable");
var $EditTableBody = $EditTable.find("tbody");
var $EditPageHeader = $("#EditPageHeader");
var $EditPageButton = $("#EditPageButton");

var $EditPage2Col = $("#EditPage2Col");
var $EditTable2Col = $("#EditTable2Col");
var $EditTable2ColBody = $EditTable2Col.find("tbody");
var $EditTable2Col2 = $("#EditTable2Col2");
var $EditTable2Col2Body = $EditTable2Col2.find("tbody");
var $EditPage2ColHeader = $("#EditPage2ColHeader");
var $EditPage2ColButton = $("#EditPage2ColButton");

//var $DuesStatementButton = $document.find("#DuesStatementButton");
//var $DownloadDuesStatement = $document.find("#DownloadDuesStatement");
var $DuesStatementPage = $document.find("#DuesStatementPage");
var $DuesStatementPropertyTable = $("#DuesStatementPropertyTable tbody");
var $DuesStatementAssessmentsTable = $("#DuesStatementAssessmentsTable tbody");
var duesStatementDownloadLinks = $("#DuesStatementDownloadLinks");
*/

/*
$document.on("click", "#PropertyListDisplay tr td a", getHoaRec);
$document.on("click", ".DetailDisplay", getHoaRec);

$moduleDiv.on("click", "#PropertyDetail tr td a", _editProperty);
$EditPage.on("click", "#SavePropertyEdit", _savePropertyEdit);
$moduleDiv.on("click", "#PropertyOwners tr td a", _editOwner);
$EditPage2Col.on("click", "#SaveOwnerEdit", _saveOwnerEdit);
$moduleDiv.on("click", "#NewOwnerButton", _newOwner);
$moduleDiv.on("click", "#PropertyAssessments tr td a", _editAssessment);
$EditPage2Col.on("click", "#SaveAssessmentEdit", _saveAssessmentEdit);
$document.on("click", ".SalesNewOwnerProcess", _salesNewOwnerProcess);

$document.on("click", "#DuesStatementButton", createDuesStatement);
$document.on("click", "#DownloadDuesStatement", downloadDuesStatement);
*/


//=================================================================================================================
// Bind events

// Respond to any clicks in the document and check for specific classes to respond to
// (Do it dynamically because elements with classes will be added to the DOM dynamically)

//thumbnailContainer.addEventListener("click", function (event) {
document.body.addEventListener('click', function (event) {
    //console.log("event.target.classList = "+event.target.classList)
    // Check for specific classes
    if (event.target && event.target.classList.contains("DetailDisplay")) {
        event.preventDefault();
        let parcelId = event.target.getAttribute("data-parcelId")
        //console.log("class DetailDisplay, pardelId = "+parcelId)
        getHoaRec(parcelId)
    }
})

async function getHoaRec(parcelId) {
    // Clear out the property detail display fields
    Parcel_ID.textContent = ""
    LotNo.textContent = ""
    Property_Street_No.textContent = ""
    Property_Street_Name.textContent = ""
    Property_City.textContent = ""
    Property_State.textContent = ""
    Property_Zip.textContent = ""
    TotalDue.textContent = ""
    Rental.checked = false
    Managed.checked = false
    Foreclosure.checked = false
    Bankruptcy.checked = false
    UseEmail.checked = false
    Comments.textContent = ""

    // Clear out the display tables for Owner and Assessment lists
    empty(propertyOwnersTbody)
    empty(propertyAssessmentsTbody)

    showLoadingSpinner(messageDisplay)
    detailPageTab.show()

    try {
        const response = await fetch("/api/GetHoaRec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: parcelId
        })
        await checkFetchResponse(response)
        // Success
        hoaRec = await response.json();
        messageDisplay.textContent = ""
        displayDetail(hoaRec)

    } catch (err) {
        console.error(err)
        messageDisplay.textContent = `Error in Fetch: ${err.message}`
    }
}

function displayDetail(hoaRec) {
    // *** Remember C# object to JS JSON structure object has different camel-case rules (makes 1st character lowercase, etc.) ***
    let tr = ''
    let th = ''
    let td = ''
    let tbody = ''

    Parcel_ID.textContent = hoaRec.property.parcel_ID
    LotNo.textContent = hoaRec.property.lotNo
    Property_Street_No.textContent = hoaRec.property.property_Street_No
    Property_Street_Name.textContent = hoaRec.property.property_Street_Name
    Property_City.textContent = hoaRec.property.property_City
    Property_State.textContent = hoaRec.property.property_State
    Property_Zip.textContent = hoaRec.property.property_Zip
    TotalDue.textContent = "$"+hoaRec.totalDue
    Rental.checked = (hoaRec.property.rental == 1) ? Rental.checked = true : false
    Managed.checked = (hoaRec.property.managed == 1) ? Managed.checked = true : false
    Foreclosure.checked = (hoaRec.property.foreclosure == 1) ? Foreclosure.checked = true : false
    Bankruptcy.checked = (hoaRec.property.bankruptcy == 1) ? Bankruptcy.checked = true : false
    UseEmail.checked = (hoaRec.property.useEmail == 1) ? UseEmail.checked = true : false
    Comments.textContent = hoaRec.property.comments

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

        /*
        if (rec.CurrentOwner) {
            ownName1 = rec.Owner_Name1;
            currOwnerID = rec.OwnerID;
        }
        */

        tr = document.createElement('tr')
        tr.classList.add('small')

        td = document.createElement("td"); td.textContent = ownerRec.ownerID; tr.appendChild(td)

        let a = document.createElement("a")
        a.href = ""
        //a.classList.add('class', "DetailDisplay")
        a.setAttribute('data-parcelId', ownerRec.parcelId);
        a.setAttribute('data-ownerId', ownerRec.ownerID);
        a.textContent = ownerRec.owner_Name1 + ' ' + ownerRec.owner_Name2
        td = document.createElement("td"); 
        td.appendChild(a);
        tr.appendChild(td)

        td = document.createElement("td"); td.textContent = ownerRec.owner_Phone; tr.appendChild(td)
        td = document.createElement("td"); td.classList.add('d-none','d-md-table-cell'); td.textContent = ownerRec.datePurchased; tr.appendChild(td)
        td = document.createElement("td"); td.classList.add('d-none','d-md-table-cell'); td.textContent = ownerRec.alt_Address_Line1; tr.appendChild(td)
        td = document.createElement("td"); td.classList.add('d-none','d-md-table-cell'); td.textContent = ownerRec.comments; tr.appendChild(td)

        tbody.appendChild(tr)
    }

    tbody = propertyAssessmentsTbody
    var TaxYear = ''
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
    th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Date Due"; tr.appendChild(th)
    th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Payment"; tr.appendChild(th)
    th = document.createElement("th"); th.classList.add('d-none','d-md-table-cell'); th.textContent = "Comments"; tr.appendChild(th)
    tbody.appendChild(tr)

    // Append a row for every record in list
    for (let index in hoaRec.assessmentsList) {
        let assessmentRec = hoaRec.assessmentsList[index]

        lienButton = ''
        ButtonType = ''

        if (index == 0) {
            //TaxYear = assessmentRec.DateDue.substring(0, 4)
        }

        tr = document.createElement('tr')
        tr.classList.add('small')

        td = document.createElement("td"); td.textContent = assessmentRec.ownerID; tr.appendChild(td)

        let a = document.createElement("a")
        a.href = ""
        a.setAttribute('data-parcelId', hoaRec.property.parcel_ID);
        a.setAttribute('data-fy', assessmentRec.fy);
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
                buttonColor = 'btn-sm btn-info';
            }
            lienButton = document.createElement("button")
            lienButton.setAttribute('type',"button")
            lienButton.setAttribute('role',"button")
            lienButton.setAttribute('data-parcelId', hoaRec.property.parcel_ID)
            lienButton.setAttribute('data-fy', assessmentRec.fy)
            //lienButton.classList.add('btn',buttonColor,'btn-sm','shadow-none','me-2','my-2',MediaFilterRequestClass)
            lienButton.classList.add('btn',buttonColor,'btn-sm','shadow-none')
            lienButton.textContent = "Lien"
            td.appendChild(lienButton)
        } else {
            if (assessmentRec.duesDue) {
                buttonColor = 'btn-warning';
                lienButton = document.createElement("button")
                lienButton.setAttribute('type',"button")
                lienButton.setAttribute('role',"button")
                lienButton.setAttribute('data-parcelId', hoaRec.property.parcel_ID)
                lienButton.setAttribute('data-fy', assessmentRec.fy)
                //lienButton.classList.add('btn',buttonColor,'btn-sm','shadow-none','me-2','my-2',MediaFilterRequestClass)
                lienButton.classList.add('btn',buttonColor,'btn-sm','shadow-none')
                lienButton.textContent = "Create Lien"
                td.appendChild(lienButton)
            }
        }
        tr.appendChild(td)

        tr.appendChild(setTD("checkbox",assessmentRec.paid,"d-none d-sm-table-cell"))
        tr.appendChild(setTD("checkbox",assessmentRec.nonCollectible,"d-none d-sm-table-cell"))
        tr.appendChild(setTD("date",assessmentRec.datePaid,"d-none d-sm-table-cell"))
        tr.appendChild(setTD("date",assessmentRec.dateDue,"d-none d-sm-table-cell"))
        tr.appendChild(setTD("text",assessmentRec.paymentMethod,"d-none d-sm-table-cell"))
        tr.appendChild(setTD("text",assessmentRec.comments+' '+assessmentRec.lienComment,"d-none d-sm-table-cell"))

        tbody.appendChild(tr)
    }

    MCTreasLink.href = "" // get values from Config
    MCAuditorLink.href = "" // get values from Config
    DuesStatementButton.dataset.parcelId = hoaRec.property.parcel_ID
    //DuesStatementButton.dataset.ownerId = is this needed???

    NewOwnerButton.dataset.parcelId = hoaRec.property.parcel_ID
    //NewOwnerButton.dataset.ownerId = 

    CommunicationsButton.dataset.parcelId = hoaRec.property.parcel_ID
    //CommunicationsButton.dataset.ownerId = 

    // element.dataset.value = "newValue"; // Changes `data-value` to "newValue"


    /*
var MCTreasLink = document.getElementById("MCTreasLink")
var MCAuditorLink = document.getElementById("MCAuditorLink")
var DuesStatementButton = document.getElementById("DuesStatementButton")
var NewOwnerButton = document.getElementById("NewOwnerButton")
var CommunicationsButton = document.getElementById("CommunicationsButton")

    // Set the buttons from configuration values and current parcel id
    var mcTreasURI = config.getVal('countyTreasurerUrl') + '?parid=' + hoaRec.Parcel_ID + '&taxyr=' + TaxYear + '&own1=' + ownName1;
    $MCTreasLink.html('<a href="' + encodeURI(mcTreasURI) + '" class="btn btn-sm btn-primary mr-1 mb-1 float-left d-none d-md-block" role="button" target="_blank">County<br>Treasurer</a>');

    var mcAuditorURI = config.getVal('countyAuditorUrl') + '?mode=PARID';
    $MCAuditorLink.html('<a href="' + encodeURI(mcAuditorURI) + '" class="btn btn-sm btn-primary mr-1 mb-1 float-left d-none d-md-block" role="button" target="_blank">County<br>Property</a>');

    $DuesStatement.html('<a id="DuesStatementButton" data-parcelId="' + hoaRec.Parcel_ID + '" data-ownerId="' + currOwnerID + '" href="#" class="btn btn-sm btn-success mr-1 mb-1 float-left" role="button">Dues Statement</a>');

    $Communications.html('<a id="CommunicationsButton" data-parcelId="' + hoaRec.Parcel_ID + '" data-ownerId="' + currOwnerID + '" href="#" class="btn btn-sm btn-info mr-1 mb-1 float-left" role="button">Communications</a>');

    $NewOwner.html('<a id="NewOwnerButton" data-parcelId="' + hoaRec.Parcel_ID + '" data-ownerId="' + currOwnerID + '" href="#" class="btn btn-sm btn-warning mr-1 mb-1 float-left" role="button">New Owner</a>');
    //$AddAssessment.html('<a id="AddAssessmentButton" href="#" class="btn btn-sm btn-info" role="button">Add Assessment</a>');
    */


    /*
        >>>>>>>>>>> is it still the best idea to:
            1) display property details as rows in a table - *** check some of the other WEB UI displays you've done - Genv?
            2) Edit - build a Modal with INPUT fields?

    function _render() {
    */

        /*
    tr = document.createElement('tr')
    tr.classList.add('small')
    
    th = document.createElement("th")
    th.textContent = "Parcel Id:"
    tr.appendChild(th)
    td = document.createElement("td")
    td.textContent = hoaRec.property.parcel_ID
    tr.appendChild(td)
    tbody.appendChild(tr)

    tr = document.createElement('tr')
    //tr.classList.add('small')
    th = document.createElement("th")
    th.textContent = "Lot No:"
    tr.appendChild(th)
    td = document.createElement("td")
    td.textContent = hoaRec.property.lotNo
    tr.appendChild(td)
    tbody.appendChild(tr)

    tr = document.createElement('tr')
    //tr.classList.add('small')
    th = document.createElement("th")
    th.textContent = "Location:"
    tr.appendChild(th)
    td = document.createElement("td")
    td.textContent = hoaRec.property.parcel_Location
    tr.appendChild(td)
    tbody.appendChild(tr)

    tr = document.createElement('tr')
    //tr.classList.add('small')
    th = document.createElement("th")
    th.classList.add('d-none','d-md-table-cell')
    th.textContent = "Street No:"
    tr.appendChild(th)
    td = document.createElement("td")
    td.classList.add('d-none','d-md-table-cell')
    td.textContent = hoaRec.property.property_Street_No
    tr.appendChild(td)
    tbody.appendChild(tr)
        */

    /*
    th = document.createElement("th"); th.textContent = "Parcel Location"; tr.appendChild(th)
    th = document.createElement("th"); th.classList.add('d-none','d-lg-table-cell'); th.textContent = "Owner Phone"; tr.appendChild(th)
    tbody.appendChild(tr)
    */

    /*
    tr += '<tr><th>Parcel Id:</th> <td>' + hoaRec.Parcel_ID + '</td> </tr>';
    tr += '<tr><th>Lot No:</th><td>' + hoaRec.LotNo + '</td></tr>';
    tr += '<tr><th>Location: </th><td>' + hoaRec.Parcel_Location + '</td></tr>';
    tr += '<tr><th class="d-none d-md-table-cell">Street No: </th><td class="d-none d-md-table-cell">' + hoaRec.Property_Street_No + '</td></tr>';
    tr += '<tr><th class="d-none d-md-table-cell">Street Name: </th><td class="d-none d-md-table-cell">' + hoaRec.Property_Street_Name + '</td></tr>';
    tr += '<tr><th class="d-none d-md-table-cell">City: </th><td class="d-none d-md-table-cell">' + hoaRec.Property_City + '</td></tr>';
    tr += '<tr><th class="d-none d-md-table-cell">State: </th><td class="d-none d-md-table-cell">' + hoaRec.Property_State + '</td></tr>';
    tr += '<tr><th class="d-none d-md-table-cell">Zip Code: </th><td class="d-none d-md-table-cell">' + hoaRec.Property_Zip + '</td></tr>';
    tr += '<tr><th>Total Due: </th><td>$' + util.formatMoney(hoaRec.TotalDue) + '</td></tr>';

    //tr += '<tr><th class="d-none d-md-table-cell">Member: </th><td class="d-none d-md-table-cell">' + util.setCheckbox(hoaRec.Member) + '</td></tr>';
    //tr += '<tr><th>Vacant: </th><td>' + util.setCheckbox(hoaRec.Vacant) + '</td></tr>';
    tr += '<tr><th class="d-none d-md-table-cell">Rental: </th><td class="d-none d-md-table-cell">' + util.setCheckbox(hoaRec.Rental) + '</td></tr>';
    tr += '<tr><th class="d-none d-md-table-cell">Managed: </th><td class="d-none d-md-table-cell">' + util.setCheckbox(hoaRec.Managed) + '</td></tr>';
    tr += '<tr><th class="d-none d-md-table-cell">Foreclosure: </th><td class="d-none d-md-table-cell">' + util.setCheckbox(hoaRec.Foreclosure) + '</td></tr>';
    tr += '<tr><th class="d-none d-md-table-cell">Bankruptcy: </th><td class="d-none d-md-table-cell">' + util.setCheckbox(hoaRec.Bankruptcy) + '</td></tr>';
    tr += '<tr><th class="d-none d-md-table-cell">ToBe Released: </th><td class="d-none d-md-table-cell">' + util.setCheckbox(hoaRec.Liens_2B_Released) + '</td></tr>';
    tr += '<tr><th>Use Email: </th><td>' + util.setCheckbox(hoaRec.UseEmail) + '</td></tr>';
    tr += '<tr><th>Comments: </th><td>' + hoaRec.Comments + '</td></tr>';

    $propDetail.html(tr);
    */

        /*
        if (hoaPropertyRecList == null || hoaPropertyRecList.length == 0) {
            let tr = document.createElement('tr')
            tr.textContent = "No records found - try different search parameters"
            tbody.appendChild(tr)
        } else {
            let tr = document.createElement('tr')
            tr.classList.add('small')
            // Append the header elements
            let th = document.createElement("th"); th.textContent = "Row"; tr.appendChild(th)
            th = document.createElement("th"); th.textContent = "Parcel Location"; tr.appendChild(th)
            th = document.createElement("th"); th.classList.add('d-none','d-sm-table-cell'); th.textContent = "Parcel Id"; tr.appendChild(th)
            th = document.createElement("th"); th.classList.add('d-none','d-lg-table-cell'); th.textContent = "Owner Name"; tr.appendChild(th)
            th = document.createElement("th"); th.classList.add('d-none','d-lg-table-cell'); th.textContent = "Owner Phone"; tr.appendChild(th)
            tbody.appendChild(tr)

            // Append a row for every record in list
            for (let index in hoaPropertyRecList) {
                let hoaPropertyRec = hoaPropertyRecList[index]

                tr = document.createElement('tr')
                tr.classList.add('small')
                let td = document.createElement("td"); td.textContent = Number(index) + 1; tr.appendChild(td)

                let a = document.createElement("a")
                a.classList.add('class', "DetailDisplay")
                a.setAttribute('data-parcelId', hoaPropertyRec.parcelId);
                a.textContent = hoaPropertyRec.parcelLocation
                td = document.createElement("td"); 
                td.appendChild(a);
                tr.appendChild(td)

                td = document.createElement("td"); td.classList.add('d-none','d-sm-table-cell'); td.textContent = hoaPropertyRec.parcelId; tr.appendChild(td)
                td = document.createElement("td"); td.classList.add('d-none','d-lg-table-cell'); td.textContent = hoaPropertyRec.ownerName; tr.appendChild(td)
                td = document.createElement("td"); td.classList.add('d-none','d-lg-table-cell'); td.textContent = hoaPropertyRec.ownerPhone; tr.appendChild(td)
                tbody.appendChild(tr)
            }
        }
        */
}

