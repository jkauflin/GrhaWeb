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
 *============================================================================*/

import {empty} from './util.js';

//=================================================================================================================
// Variables cached from the DOM
//var searchStr = document.getElementById("searchStr")
//var searchButton = document.getElementById("SearchButton")

var detailPageTab = bootstrap.Tab.getOrCreateInstance(document.querySelector(`.navbar-nav a[href="#DetailPage"]`))


var propertyDetailTbody = document.getElementById("PropertyDetailTbody")
var propertyOwnersTbody = document.getElementById("PropertyOwnersTbody")
var propertyAssessmentsTbody = document.getElementById("PropertyAssessmentsTbody")

var messageDisplay = document.getElementById("MessageDisplay")
var isTouchDevice = 'ontouchstart' in document.documentElement

// Do I still need these at this level???
var hoaRec
var currPdfRec

/*
var $document = $(document);
var $moduleDiv = $('#DetailPage');
var $ajaxError = $moduleDiv.find(".ajaxError");

var $propertyDetail = $moduleDiv.find("#PropertyDetail");
var $propertyOwners = $moduleDiv.find("#PropertyOwners");
var $propertyAssessments = $moduleDiv.find("#PropertyAssessments");
var $propDetail = $propertyDetail.find('tbody');
var $propOwners = $propertyOwners.find('tbody');
var $propAssessments = $propertyAssessments.find('tbody');
var $MCTreasLink = $("#MCTreasLink");
var $MCAuditorLink = $("#MCAuditorLink");
var $DuesStatement = $("#DuesStatement");
var $Communications = $("#Communications");
var $NewOwner = $("#NewOwner");
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
    // If a string was passed in then use value as the name, else get it from the attribute of the click event object
    //var parcelId = (typeof value === "string") ? value : value.target.getAttribute("data-parcelId");

    let tbody = propertyDetailTbody
    empty(tbody)
    empty(propertyOwnersTbody)
    empty(propertyAssessmentsTbody)

    detailPageTab.show()
        
    const endpoint = "/api/GetHoaRec";
    try {
        messageDisplay.textContent = "Fetching detail data..."
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: parcelId
        })
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        hoaRec = await response.json();
        messageDisplay.textContent = ""
        displayDetail(hoaRec)
        //detailPageTab.show()
    } catch (err) {
        console.error(`Error in Fetch to ${endpoint}, ${err}`)
        messageDisplay.textContent = "Fetch data FAILED - check log"
    }
}

function displayDetail(hoaRec) {
    let tbody = propertyDetailTbody
    empty(tbody)
    let tr = ''
    let th = ''
    let td = ''

    //propertyOwnersTbody
    //propertyAssessmentsTbody


    // setting records in a table (from an id reference to a tbody element within a table)

    // line

    /*
	                		<table class="table table-sm">
	                  			<tbody id="PropertyDetailTbody">
	                  			</tbody>
	                		</table>

        >>>>>>>>>>> is it still the best idea to:
            1) display property details as rows in a table - *** check some of the other WEB UI displays you've done - Genv?
            2) Edit - build a Modal with INPUT fields?

    function _render() {
        var tr = '';
        // Get the admin level to see if user is allowed to edit data
        if (hoaRec.adminLevel > 1) {
            tr += '<tr><th>Parcel Id:</th><td><a data-parcelId="' + hoaRec.Parcel_ID + '" href="#">' + hoaRec.Parcel_ID + '</a></td></tr>';
        } else {
            tr += '<tr><th>Parcel Id:</th><td>' + hoaRec.Parcel_ID + '</td></tr>';
        }
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

