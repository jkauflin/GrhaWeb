/*==============================================================================
 * (C) Copyright 2025 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:     Javascript code for hoadb web
 *----------------------------------------------------------------------------
 * Modification History
 * 2025-01-09 JJK 	Initial version
 * 2025-04-12 JJK   Working on Board maintenance page
*============================================================================*/

import {empty,showLoadingSpinner} from './util.js';

var TrusteeId = document.getElementById("TrusteeId")
var Name = document.getElementById("Name")
var Position = document.getElementById("Position")
var PhoneNumber = document.getElementById("PhoneNumber")
var EmailAddress = document.getElementById("EmailAddress")
var EmailAddressForward = document.getElementById("EmailAddressForward")
var Description = document.getElementById("Description")
var ImageUrl = document.getElementById("ImageUrl")
var BoardMessageDisplay = document.getElementById("BoardMessageDisplay")

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

document.querySelectorAll(".Trustee").forEach(el => el.addEventListener("click", function (event) {
    //console.log(".Trustee click, classList = "+event.target.classList)
    //if (event.target && event.target.classList.contains(MediaFilterRequestClass)) {
    //}
    const trusteeId = event.target.getAttribute('data-trustee-id')
    //console.log('Target:', event.target); // The element that was clicked
    getTrustee(trusteeId)
}))


document.getElementById("BoardUpdateButton").addEventListener("click", function () {
    updateTrustee()
})


var photosUri = "https://grhawebstorage.blob.core.windows.net/photos/"
const trustees = document.querySelectorAll('.Trustee')

// Call the function to load Board of Trustees data every time the page is loaded
queryBoardInfo()
async function queryBoardInfo() {
    let boardGql = `query {
            boards (
                orderBy: { TrusteeId: ASC }
            ) {
                items {
                    id
                    Name
                    Position
                    PhoneNumber
                    EmailAddress
                    EmailAddressForward
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
        const maxTrustees = result.data.boards.items.length
        if (maxTrustees > 0) {
            let i = -1
            trustees.forEach((cardBody) => {
                i++
                empty(cardBody)
                if (i < maxTrustees) {
                    // Set the information in the Trustee cards
                    let trusteeImg = ""
                    if (result.data.boards.items[i].ImageUrl == "") {
                        trusteeImg = document.createElement('i')
                        trusteeImg.classList.add('fa','fa-user','fa-4x','float-start','me-3')
                    } else {
                        trusteeImg = document.createElement('img')
                        trusteeImg.classList.add('float-start','rounded','me-3')
                        trusteeImg.width = "100"
                        trusteeImg.src = result.data.boards.items[i].ImageUrl
                    }

                    let trusteeNamePosition = document.createElement('h5')
                    let trusteeNameLink = document.createElement('a')
                    trusteeNameLink.textContent = result.data.boards.items[i].Name + " - " + result.data.boards.items[i].Position
                    trusteeNameLink.setAttribute('data-trustee-id', result.data.boards.items[i].id)
                    trusteeNameLink.href = "#"  // # will do all the good link formatting, but will not try to open the link
                    trusteeNamePosition.appendChild(trusteeNameLink)
                    
                    let trusteePhone = document.createElement('b')
                    trusteePhone.textContent = result.data.boards.items[i].PhoneNumber 
                    let trusteeEmail = document.createElement('h6')
                    trusteeEmail.textContent = "Email: "+result.data.boards.items[i].EmailAddress
                    let trusteeEmail2 = document.createElement('h6')
                    trusteeEmail2.textContent = "Private Email: "+result.data.boards.items[i].EmailAddressForward

                    let trusteeDesc = document.createElement('span')
                    trusteeDesc.textContent = result.data.boards.items[i].Description 

                    cardBody.appendChild(trusteeImg)
                    cardBody.appendChild(trusteeNamePosition)
                    cardBody.appendChild(trusteePhone)
                    cardBody.appendChild(trusteeEmail)
                    cardBody.appendChild(trusteeEmail2)
                    cardBody.appendChild(trusteeDesc)
                }
            })
        } // result.data.boards.items.length
    }
} // async function queryBoardInfo()

// Get the specific Trustee information and display for update
async function getTrustee(trusteeId) {
    BoardMessageDisplay.textContent = "Fetching Board information..."
    const endpoint = "/api/GetTrustee";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: trusteeId
    });
    // what if it gets an error and returns a text message <<<<<<<<<<<<<<<<<<<<<<<
    const result = await response.json();
    BoardMessageDisplay.textContent = ""
    // GraphQL returns an .errors section in the JSON - always returns a JSON (should I do that?)
    if (result.errors != null) {
        console.log("Error: "+result.errors[0].message);
        console.table(result.errors);
        BoardMessageDisplay.textContent = "Error in Fetch - check log"
    } else {
        let trustee = result        
        TrusteeId.value = trustee.id
        Name.value = trustee.name
        Position.value = trustee.position
        PhoneNumber.value = trustee.phoneNumber
        EmailAddress.value = trustee.emailAddress
        EmailAddressForward.value = trustee.emailAddressForward
        Description.value = trustee.description
        ImageUrl.value = trustee.imageUrl
    }
}

function cleanStr(tempStr) {
    let outStr = tempStr.value
    if (outStr == null || outStr == undefined) {
        outStr = ""
    }
    return outStr
}

// Get the specific Trustee information and display for update
async function updateTrustee(trusteeId) {
    BoardMessageDisplay.textContent = "Updating Board information..."

    /*
    TrusteeId.value
    Name.value
    Position.value
    PhoneNumber.value
    EmailAddress.value
    EmailAddressForward.value
    Description.value
    ImageUrl.value
    */

    let paramData = {
        id: cleanStr(TrusteeId),
        TrusteeId: parseInt(TrusteeId.value),
        Name: cleanStr(Name),
        Position: cleanStr(Position),
        PhoneNumber: cleanStr(PhoneNumber),
        EmailAdddress: cleanStr(EmailAddress),
        EmailAddressForward: cleanStr(EmailAddressForward),
        Description: cleanStr(Description),
        ImageUrl: cleanStr(ImageUrl)
    }

    // >>>>>>>>>>>>> check function of cleanStr to get rid of null in EmailAddress <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    const endpoint = "/api/UpdateTrustee";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paramData)
    });
    //const result = await response.json();
    const result = await response.text();
    BoardMessageDisplay.textContent = result
    if (result.errors != null) {
        console.log("Error: "+result.errors[0].message);
        console.table(result.errors);
        BoardMessageDisplay.textContent = "Error in Fetch - check log"
    } else {
        console.log("AFTER update")

    }
}
