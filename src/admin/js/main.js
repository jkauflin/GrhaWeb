/*==============================================================================
 * (C) Copyright 2025 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:     Javascript code for hoadb web
 *----------------------------------------------------------------------------
 * Modification History
 * 2025-01-09 JJK 	Initial version
 * 2025-04-12 JJK   Working on Board maintenance page
 * 2025-04-22 JJK   Implementing new html5/bootstrap input validation logic
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
var photosUri = "https://grhawebstorage.blob.core.windows.net/photos/"
const trustees = document.querySelectorAll('.Trustee')

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



// Handle file upload Form submit/validation
var DocMonth = document.getElementById("DocMonth")
DocMonth.value = "2025-05";
var FileUploadMessageDisplay = document.getElementById("FileUploadMessageDisplay")
var uploadFileForm = document.getElementById("UploadFileForm")
uploadFileForm.addEventListener('submit', (event) => {
    let formValid = uploadFileForm.checkValidity()
    event.preventDefault()
    event.stopPropagation()

    FileUploadMessageDisplay.textContent = ""
  
    if (!formValid) {
        FileUploadMessageDisplay.textContent = "Form inputs are NOT valid"
    } else {
        //let trusteeId = TrusteeId.value
        //updateTrustee(trusteeId)
        uploadFiles()
    }

    uploadFileForm.classList.add('was-validated')
})

// Handle the file upload backend server call
async function uploadFiles() {
    FileUploadMessageDisplay.textContent = "Uploading files..."

    const endpoint = "/api/UploadFiles";
    const response = await fetch(endpoint, {
        method: "POST",
        body: new FormData(uploadFileForm)
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
        FileUploadMessageDisplay.textContent = errMessage
    } else {
        FileUploadMessageDisplay.textContent = "Upload successful"
        //queryBoardInfo()
    }

}


document.querySelectorAll(".Trustee").forEach(el => el.addEventListener("click", function (event) {
    //console.log(".Trustee click, classList = "+event.target.classList)
    //if (event.target && event.target.classList.contains(MediaFilterRequestClass)) {
    //}
    const trusteeId = event.target.getAttribute('data-trustee-id')
    //console.log('Target:', event.target); // The element that was clicked
    getTrustee(trusteeId)
}))

var updTrusteeForm = document.getElementById("UpdateTrusteeForm")
updTrusteeForm.addEventListener('submit', (event) => {
    let formValid = updTrusteeForm.checkValidity()
    event.preventDefault()
    event.stopPropagation()

    BoardMessageDisplay.textContent = ""
  
    if (!formValid) {
        BoardMessageDisplay.textContent = "Form inputs are NOT valid"
    } else {
        let trusteeId = TrusteeId.value
        updateTrustee(trusteeId)
    }

    updTrusteeForm.classList.add('was-validated')
})


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
                        trusteeImg.width = "64"
                        trusteeImg.src = result.data.boards.items[i].ImageUrl
                    }

                    let trusteeNamePosition = document.createElement('h6')
                    let trusteeNameLink = document.createElement('a')
                    //trusteeNameLink.textContent = result.data.boards.items[i].Name + " - " + result.data.boards.items[i].Position
                    trusteeNameLink.textContent = result.data.boards.items[i].Position + " - " + result.data.boards.items[i].Name
                    trusteeNameLink.setAttribute('data-trustee-id', result.data.boards.items[i].id)
                    trusteeNameLink.href = "#"  // # will do all the good link formatting, but will not try to open the link
                    trusteeNamePosition.appendChild(trusteeNameLink)

                    cardBody.appendChild(trusteeImg)
                    cardBody.appendChild(trusteeNamePosition)
                    /*
                    let trusteePhone = document.createElement('b')
                    trusteePhone.textContent = result.data.boards.items[i].PhoneNumber 
                    let trusteeEmail = document.createElement('h6')
                    trusteeEmail.textContent = "Email: "+result.data.boards.items[i].EmailAddress
                    let trusteeEmail2 = document.createElement('h6')
                    trusteeEmail2.textContent = "Private Email: "+result.data.boards.items[i].EmailAddressForward

                    let trusteeDesc = document.createElement('small')
                    trusteeDesc.textContent = result.data.boards.items[i].Description 

                    cardBody.appendChild(trusteePhone)
                    cardBody.appendChild(trusteeEmail)
                    cardBody.appendChild(trusteeEmail2)
                    cardBody.appendChild(trusteeDesc)
                    */
                }
            })
        } // result.data.boards.items.length
    }
} // async function queryBoardInfo()

// Get the specific Trustee information and display for update
async function getTrustee(trusteeId) {
    // >>>>> should I pass the display object as one of the parameters - would that have any benefit???
    BoardMessageDisplay.textContent = "Fetching Board information..."
    const endpoint = "/api/GetTrustee";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: trusteeId
    })
    BoardMessageDisplay.textContent = ""

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
        BoardMessageDisplay.textContent = errMessage
    } else {
        let trustee = await response.json();
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

// Get the specific Trustee information and display for update
async function updateTrustee(trusteeId) {
    BoardMessageDisplay.textContent = "Updating Board information..."

    let paramData = {
        id: trusteeId,
        TrusteeId: parseInt(trusteeId),
        Name: Name.value,
        Position: Position.value,
        PhoneNumber: PhoneNumber.value,
        EmailAddress: EmailAddress.value,
        EmailAddressForward: EmailAddressForward.value,
        Description: Description.value,
        ImageUrl: ImageUrl.value
    }

    const endpoint = "/api/UpdateTrustee";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paramData)
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
        BoardMessageDisplay.textContent = errMessage
    } else {
        BoardMessageDisplay.textContent = "Update successful"
        queryBoardInfo()
    }
}
