/*==============================================================================
 * (C) Copyright 2015,2016,2017,2018,2024 John J Kauflin, All rights reserved. 
 *----------------------------------------------------------------------------
 * DESCRIPTION:  JS code to support the web app Property Search functions
 *----------------------------------------------------------------------------
 * Modification History
 * 2015-03-06 JJK 	Initial version 
 * 2015-08-03 JJK	Modified to put the data parameters on the "a" element
 * 					and only response to clicks to the anchor
 * 2015-09-30 JJK	Added Search button
 * 2016-02-09 JJK	Switching from JQuery Mobile to Twitter Bootstrap
 * 2016-04-03 JJK	Working on input fields
 * 2018-10-27 JJK   Added SearchInput for non-touch devices
 * 2020-07-29 JJK   Modified for version 2.0 changes
 * 2020-08-03 JJK   Re-factored for new error handling
 * 2020-12-22 JJK   Re-factored for Bootstrap 4
 * 2024-09-10 JJK   Starting conversion to Bootstrap 5, vanilla JS, 
 *                  js module, and move from PHP/MySQL to Azure SWA
 * 2024-11-21 JJK   Completed initial work for SWA version with API calls
 * 2024-11-30 JJK   Added showLoadingSpinner for loading... display
 *============================================================================*/

import {empty,showLoadingSpinner} from './util.js';

//=================================================================================================================
// Variables cached from the DOM
var searchStr = document.getElementById("searchStr")
var searchButton = document.getElementById("SearchButton")
var propertyListDisplayTbody = document.getElementById("PropertyListDisplayTbody")
var messageDisplay = document.getElementById("SearchMessageDisplay")
var isTouchDevice = 'ontouchstart' in document.documentElement;

var searchButtonHTML = '<i class="fa fa-search me-1"></i> Search'
searchButton.innerHTML = searchButtonHTML

//=================================================================================================================
// Bind events

searchButton.addEventListener("click", function () {
    getHoaPropertiesList()
})

if (!isTouchDevice) {
    searchStr.addEventListener("keypress", function(event) {
        // If the user presses the "Enter" key on the keyboard
        if (event.key === "Enter") {
          // Cancel the default action, if needed
          event.preventDefault();
          getHoaPropertiesList()
        }
    })
}

async function getHoaPropertiesList() {
    // Create a parameters object to send via JSON in the POST request
    empty(propertyListDisplayTbody)
    showLoadingSpinner(searchButton)

    const endpoint = "/api/GetPropertyList";
    messageDisplay.textContent = "Fetching property list..."
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: searchStr.value
    })
    if (!response.ok) {
        //response.status: 400
        //response.statusText: "Bad Request"
        let errMessage = response.statusText
        try {
            errMessage = await response.text();
            // Check if there is a JSON structure in the response (which contains errors)
            const result = JSON.parse(errMessage);
            if (result.errors != null) {
                console.log("Error: "+result.errors[0].message);
                console.table(result.errors);
                errMessage = result.errors[0].message
            }
        } catch (err) {
            //console.log("JSON parse failed - text = "+errMessage)
        }

        console.error(`Error in Fetch to ${endpoint}, ${err}`)
        messageDisplay.textContent = "Fetch data FAILED - check log"

        //FileUploadMessageDisplay.textContent = errMessage
    } else {

        const hoaPropertyRecList = await response.json();
        messageDisplay.textContent = ""
        searchButton.innerHTML = searchButtonHTML
        displayPropertyList(hoaPropertyRecList)

    }


}

/*
async function uploadFile() {
    FileUploadMessageDisplay.textContent = "Uploading file..."
    const endpoint = "/api/UploadDoc"
    const response = await fetch(endpoint, {
        method: "POST",
        body: new FormData(uploadFileForm)
    })
}
*/


function displayPropertyList(hoaPropertyRecList) {
    //let propertyListDisplay = document.getElementById("PropertyListDisplay")
    //let tbody = propertyListDisplay.getElementsByTagName("tbody")[0]
    let tbody = propertyListDisplayTbody
    empty(tbody)

    if (hoaPropertyRecList == null || hoaPropertyRecList.length == 0) {
        let tr = document.createElement('tr')
        tr.textContent = "No records found - try different search parameters"
        tbody.appendChild(tr)
    } else {
        let tr = document.createElement('tr')
        tr.classList.add('small')
        // Append the header elements
        let th = document.createElement("th"); th.textContent = "Row"; tr.appendChild(th)
        //th = document.createElement("th"); th.classList.add('w-25'); th.textContent = "Parcel Location"; tr.appendChild(th)
        th = document.createElement("th"); th.textContent = "Parcel Location"; tr.appendChild(th)
        //th = document.createElement("th"); th.classList.add('d-none','d-sm-table-cell','w-25'); th.textContent = "Parcel Id"; tr.appendChild(th)
        th = document.createElement("th"); th.classList.add('d-none','d-sm-table-cell'); th.textContent = "Parcel Id"; tr.appendChild(th)
        th = document.createElement("th"); th.classList.add('d-none','d-lg-table-cell'); th.textContent = "Owner Name"; tr.appendChild(th)
        th = document.createElement("th"); th.classList.add('d-none','d-xl-table-cell'); th.textContent = "Owner Phone"; tr.appendChild(th)
        tbody.appendChild(tr)

        // Append a row for every record in list
        for (let index in hoaPropertyRecList) {
            let hoaPropertyRec = hoaPropertyRecList[index]
            tr = document.createElement('tr')
            tr.classList.add('small')
            let td = document.createElement("td"); td.textContent = Number(index) + 1; tr.appendChild(td)
            let a = document.createElement("a")
            a.classList.add("DetailDisplay")
            a.setAttribute('data-parcelId', hoaPropertyRec.parcelId);
            a.textContent = hoaPropertyRec.parcelLocation
            td = document.createElement("td"); 
            //td.classList.add('w-25');
            td.appendChild(a);
            tr.appendChild(td)
            //td = document.createElement("td"); td.classList.add('d-none','d-sm-table-cell','w-25'); td.textContent = hoaPropertyRec.parcelId; tr.appendChild(td)
            td = document.createElement("td"); td.classList.add('d-none','d-sm-table-cell'); td.textContent = hoaPropertyRec.parcelId; tr.appendChild(td)
            td = document.createElement("td"); td.classList.add('d-none','d-lg-table-cell'); td.textContent = hoaPropertyRec.ownerName.substring(0,40); tr.appendChild(td)
            td = document.createElement("td"); td.classList.add('d-none','d-xl-table-cell'); td.textContent = hoaPropertyRec.ownerPhone; tr.appendChild(td)
            tbody.appendChild(tr)
        }
    }
}
